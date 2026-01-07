// src/app/api/payments/create-order/route.js - FIXED WITH DECIMAL128
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';
import Payment from '@/app/lib/models/Payment';

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} catch (error) {
  console.error("❌ Razorpay initialization failed:", error);
}

export async function POST(req) {
  try {
    // console.log("🛒 Starting order creation process...");

    if (!razorpay) {
      throw new Error("Razorpay not initialized. Check environment variables.");
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials missing in environment variables");
    }

    await connectDB();

    const requestBody = await req.json();
    const { cartItems, currency = "INR", promoCode } = requestBody;

    // console.log("📦 Received cart items:", cartItems);
    // if (promoCode) console.log("🎟️ Applied Promo Code:", promoCode);

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Cart is empty or invalid"
      }, { status: 400 });
    }

    // 🔒 SECURITY: Recalculate total strictly from Database prices
    let totalAmountInRupees = 0;
    const validatedItems = [];
    let appliedDiscount = 0;
    let promoDetails = null;

    // console.log("🔍 Validating products and calculating total...");

    for (const item of cartItems) {
      try {
        // console.log(`🔍 Checking product: ${item.productId}`);
        const product = await Product.findOne({ _id: item.productId, isActive: true });

        if (!product) {
          console.error(`❌ Product not found: ${item.productId}`);
          throw new Error(`Product "${item.productId}" not found or inactive`);
        }

        const variant = product.variants.find(v => v.duration === item.duration);
        if (!variant) {
          console.error(`❌ Variant not found: ${item.duration} for product ${product.heading}`);
          throw new Error(`Variant "${item.duration}" not available for product "${product.heading}"`);
        }

        let itemPrice = variant.price;
        let itemDiscount = 0;

        // ✅ Promo Code Logic (Server-side Validation)
        if (promoCode) {
          // 1. First check Product-specific promo codes
          let promo = product.promoCodes?.find(p => p.code === promoCode.toUpperCase() && p.isActive);

          // 2. If not found, check Global Promo Codes
          if (!promo) {
            // Dynamically import PromoCode model to avoid circular deps if any, or just strictly purely
            // We do this inside loop or outside? Better outside to save DB calls, but for safety let's do it here or pre-fetch.
            // Optimization: Pre-fetch outside loop is better. Implementing fallback here assuming pre-fetch didn't happen to keep change localized? 
            // actually, plan said pre-fetch. Let's do the lookup here if we didn't add the pre-fetch query yet?
            // No, let's stick to the better pattern: Check global var we prepare. 
            // But since I can only edit this block without rewriting the whole file, I will add the import and fetch here OR 
            // allow me to edit the top of the file too?
            // Actually, I can use the existing `connectDB` context.

            // Check if we already fetched it? No, let's fetch it if needed.
            // BUT, efficient way is to fetch ONCE. 
            // However, for this replace_file_content, I am inside the loop. 
            // Let's modify the PLAN to fetch it inside loop or just do a smart lookup? 
            // For strict correctness with minimal diff, I will import and findOne here. Mongo caches models.

            const PromoCode = (await import('@/app/lib/models/PromoCode')).default;
            const globalPromo = await PromoCode.findOne({
              code: promoCode.toUpperCase(),
              isActive: true
            });

            if (globalPromo) {
              promo = globalPromo;
            }
          }

          if (promo) {
            const now = new Date();

            // Check Date Validity
            const isValidDate = (!promo.validFrom || now >= new Date(promo.validFrom)) &&
              (!promo.validUntil || now <= new Date(promo.validUntil));

            // Check Usage Limit
            const isValidUsage = (promo.usageLimit === null || promo.usageCount < promo.usageLimit);

            if (isValidDate && isValidUsage) {
              // Calculate Discount
              if (promo.discountType === 'flat') {
                itemDiscount = promo.discountValue;
              } else if (promo.discountType === 'percentage') {
                itemDiscount = (itemPrice * promo.discountValue) / 100;
              }

              // Cap discount at item price (cannot be negative)
              if (itemDiscount > itemPrice) itemDiscount = itemPrice;

              promoDetails = {
                code: promo.code,
                discountType: promo.discountType,
                discountValue: promo.discountValue
              };
            }
          }
        }

        // Apply Discount
        itemPrice = itemPrice - itemDiscount;
        appliedDiscount += itemDiscount;
        totalAmountInRupees += itemPrice;

        validatedItems.push({
          ...item,
          productName: product.heading,
          actualPrice: variant.price, // Original Price
          discountedPrice: itemPrice, // Paid Price
          discountApplied: itemDiscount,
          productId: item.productId,
          promoCode: itemDiscount > 0 ? promoCode : null
        });

        // console.log(`✅ Validated: ${product.heading} - ${variant.duration} - Original: ₹${variant.price} - Discount: ₹${itemDiscount}`);

      } catch (itemError) {
        console.error(`❌ Error validating item:`, itemError);
        return NextResponse.json({
          success: false,
          error: `Invalid product: ${itemError.message}`
        }, { status: 400 });
      }
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Invalid product selection"
      }, { status: 400 });
    }

    // console.log(`💰 Calculated subtotal (after discount): ₹${totalAmountInRupees}`);

    // Calculate Tax (18% GST) on DISCOUNTED AMOUNT
    const taxAmountInRupees = Math.round(totalAmountInRupees * 0.18 * 100) / 100;
    const totalAmountInRupeesWithTax = Math.round((totalAmountInRupees + taxAmountInRupees) * 100) / 100;

    // ✅ Convert to paise for Razorpay
    const finalAmountInPaise = Math.round(totalAmountInRupeesWithTax * 100);

    //     console.log(`💰 Precise amount breakdown:
    //   - Discounted Subtotal: ₹${totalAmountInRupees}
    //   - Tax (9%): ₹${taxAmountInRupees.toFixed(2)}
    //   - Total (Rupees): ₹${totalAmountInRupeesWithTax.toFixed(2)}
    //   - Total (Paise): ${finalAmountInPaise} paise
    // `);

    if (finalAmountInPaise < 100 && finalAmountInPaise > 0) {
      return NextResponse.json({
        success: false,
        error: "Amount too small for payment processing"
      }, { status: 400 });
    }

    const options = {
      amount: finalAmountInPaise,
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        items_count: validatedItems.length,
        subtotal: totalAmountInRupees,
        tax: taxAmountInRupees,
        total: totalAmountInRupeesWithTax,
        promo_code: promoDetails ? promoDetails.code : '',
        discount_amount: appliedDiscount
      }
    };

    // console.log("📦 Creating Razorpay order with options:", options);

    // Create Razorpay order
    const order = await razorpay.orders.create(options);

    // console.log("✅ Razorpay order created:", order.id);

    // ✅ Create payment record in database
    try {
      await Payment.createPaymentRecord(order, validatedItems);
    } catch (paymentError) {
      console.error("❌ Error creating payment record:", paymentError);
      // Don't fail the entire request if payment record creation fails
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount, // This is in paise
      currency: order.currency,
      receipt: order.receipt,
      summary: {
        subtotal: totalAmountInRupees,
        taxAmount: taxAmountInRupees,
        totalAmount: totalAmountInRupeesWithTax,
        totalAmountInPaise: finalAmountInPaise,
        itemsCount: validatedItems.length,
        discountAmount: appliedDiscount,
        promoCode: promoDetails ? promoDetails.code : null
      }
    });

  } catch (error) {
    console.error("❌ Razorpay order creation error:", error);

    let errorMessage = "Failed to create order";
    let statusCode = 500;

    if (error.error?.description) {
      errorMessage = error.error.description;
    } else if (error.message?.includes('Razorpay')) {
      errorMessage = error.message;
    } else if (error.message?.includes('environment variables')) {
      errorMessage = "Payment gateway configuration error";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}