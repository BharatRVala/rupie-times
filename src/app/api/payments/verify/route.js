// src/app/api/payments/verify/route.js - ADD AUTOMATIC INVOICE EMAIL
import { NextResponse } from "next/server";
import mongoose from 'mongoose';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import Payment from '@/app/lib/models/Payment';
import User from '@/app/lib/models/User';
import { authenticateUser } from '@/app/lib/middleware/auth';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';
import { sendEmail, generateEmailTemplate } from '@/app/lib/utils/resend';
// import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import InvoicePDF from '@/app/components/invoice/InvoicePDF';
import path from 'path';
import fs from 'fs';

// Initialize Resend
// const resend = new Resend(process.env.RESEND_API_KEY);

const validateEnvironment = () => {
  const requiredEnvVars = ['RAZORPAY_KEY_SECRET'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

// ✅ ADDED: Function to send automatic invoice email
const processRenewalContiguity = async (userId, productId, newStartDate, session) => {
  try {
    const Subscription = mongoose.models.Subscription;
    // We can't easily use the static method directly if models aren't fully loaded, 
    // but in this route connectedDB is called so it should be fine.
    // However, existing static 'canRenewContiguously' might not be available on 'Subscription' 
    // variable if it matches the import.

    // Quick check if static method exists (it should after previous step)
    if (typeof Subscription.canRenewContiguously !== 'function') {
      console.warn('⚠️ Subscription.canRenewContiguously is not defined!');
      return {
        isContiguousRenewal: false,
        effectiveStartDate: newStartDate,
        previousSubscription: null,
        gapInDays: 0,
        contiguousChainId: `${userId}_${productId}_${Date.now()}`
      };
    }

    const renewalCheck = await Subscription.canRenewContiguously(userId, productId, newStartDate);

    return {
      isContiguousRenewal: renewalCheck.isContiguous,
      effectiveStartDate: renewalCheck.effectiveStartDate,
      previousSubscription: renewalCheck.previousSubscription,
      gapInDays: renewalCheck.gapInDays,
      contiguousChainId: renewalCheck.isContiguous && renewalCheck.previousSubscription ?
        (renewalCheck.previousSubscription.contiguousChainId ||
          Subscription.generateContiguousChainId(userId, productId)) :
        Subscription.generateContiguousChainId(userId, productId)
    };
  } catch (error) {
    console.error('Error processing renewal contiguity:', error);
    return {
      isContiguousRenewal: false,
      effectiveStartDate: newStartDate,
      previousSubscription: null,
      gapInDays: 0,
      contiguousChainId: `${userId}_${productId}_${Date.now()}`
    };
  }
};

const sendInvoiceEmail = async (payment, user, cartItems, options = {}) => {
  try {
    // console.log('🚀 SENDING AUTOMATIC INVOICE EMAIL TO:', user.email);

    // Prepare PDF Data (Matching Frontend Logic & Backend Calculations)
    // Use passed options for authority, fallback to existing metadata
    const baseVal = options.subtotal !== undefined ? Number(options.subtotal) : Number(payment.metadata?.subtotal || payment.amount);
    const totalVal = Number(payment.amount);
    const discountVal = options.discountAmount !== undefined ? Number(options.discountAmount) : Number(payment.metadata?.discount_amount || 0);

    const pdfData = {
      orderId: payment.razorpayOrderId,
      orderDate: payment.createdAt,
      paymentStatus: payment.status,

      amount: baseVal,
      discountAmount: discountVal,
      totalAmount: totalVal,

      userEmail: user.email,
      userPhone: user.mobile, // ✅ Added Phone Number
      userName: user.name, // ✅ Ensure Name is explicit
      // ✅ Use subscription details if available (contains dates), otherwise fallback
      subscriptions: options.subscriptionDetails ? options.subscriptionDetails.map(sub => ({
        product: { heading: sub.productName },
        variant: {
          duration: sub.duration,
          price: sub.price // ✅ PDF expects price here for subscriptions
        },
        price: sub.price, // Keep top-level for consistency if needed elsewhere
        startDate: sub.startDate,
        endDate: sub.endDate
      })) : [],
      cartItems: cartItems || payment.metadata?.cartItems || []
    };

    // Read Logo File
    let logoBase64 = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      }
    } catch (e) {
      console.warn('⚠️ Could not load logo for PDF generation');
    }

    // Generate PDF buffer
    let pdfBuffer;
    try {
      const pdfDocument = <InvoicePDF order={pdfData} logoData={logoBase64} />;
      pdfBuffer = await renderToBuffer(pdfDocument);
      // console.log('✅ PDF generated successfully:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError);
      throw new Error('Failed to generate invoice PDF');
    }

    // Generate Items HTML List
    // ✅ Use subscriptions if available (has correct prices/dates), else fallback to cartItems
    const itemsList = pdfData.subscriptions.length > 0 ? pdfData.subscriptions : pdfData.cartItems;

    const itemsHtml = itemsList.map(item => {
      const heading = item.product?.heading || item.heading || 'Subscription';
      const duration = item.variant?.duration || item.duration || '';
      return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
          <span style="flex: 1; font-size: 13px; color: #666; text-transform: uppercase;">${heading} <span style="font-size: 11px; color: #888; text-transform: none;">(${duration})</span></span>
          <span style="font-weight: bold; color: #000; font-size: 14px;">₹${item.price}</span>
      </div>
    `}).join('');

    const invoiceContent = `
       <h1 style="font-size: 24px; color: #1f4235; margin-bottom: 25px;">Order #${pdfData.orderId}</h1>
       
       <p style="margin-bottom: 20px;">Hello <strong>${user.name || 'Valued Customer'}</strong>,</p>
       <p style="margin-bottom: 20px;">Thank you for choosing Rupie Times! Your order has been successfully processed.</p>
       
       <div style="background: #fefaf0; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #c29854; border: 1px solid #e5e7eb;">
           <h3 style="margin-top: 0; color: #1f4235; font-size: 16px; margin-bottom: 8px;">📎 Invoice Attached</h3>
           <p style="margin: 0; font-size: 14px; color: #555;">Your official tax invoice <strong>Invoice_${pdfData.orderId}.pdf</strong> is attached to this email.</p>
       </div>
       
       <div style="background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #eee;">
           <h3 style="margin-top: 0; color: #1f4235; text-transform: uppercase; font-size: 14px; border-bottom: 2px solid #c29854; padding-bottom: 10px; display: inline-block;">Order Summary</h3>
           
           <div style="margin-top: 15px;">
               ${itemsHtml}
               
               <div style="display: flex; justify-content: space-between; margin-top: 10px; border-top: 2px solid #ddd; padding-top: 10px;">
                   <span style="font-size: 13px; color: #666; text-transform: uppercase;">Status</span>
                   <span style="font-weight: bold; color: #059669; font-size: 14px;">${pdfData.paymentStatus.toUpperCase()}</span>
               </div>
           </div>
       </div>
       
       <div style="background: #1f4235; color: white; padding: 15px; border-radius: 4px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
           <span style="font-weight: bold; font-size: 16px; text-transform: uppercase;">Total Paid</span>
           <span style="font-weight: bold; font-size: 20px; color: #c29854;">₹${pdfData.totalAmount}</span>
       </div>
       
       <div style="text-align: center; margin-top: 30px;">
        <a href="https://www.rupietimes.com/dashboard/subscriptions" style="display: inline-block; background: #1f4235; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Subscription</a>
       </div>
    `;

    // Send email with PDF attachment
    const { data, error } = await sendEmail({
      to: [user.email],
      subject: `Invoice for Order #${pdfData.orderId}`,
      html: generateEmailTemplate(invoiceContent),
      attachments: [
        {
          filename: `Invoice_${pdfData.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (error) { // sendEmail returns { success: false, error: ... } or check success prop
      console.error('❌ AUTOMATIC INVOICE EMAIL FAILED:', error);
      throw new Error(`Failed to send invoice email: ${error}`);
    }

    // console.log('✅ AUTOMATIC INVOICE EMAIL SENT SUCCESSFULLY:', data);
    return data;

  } catch (error) {
    console.error('❌ Error in automatic invoice email:', error);
    throw error;
  }
};

export async function POST(req) {
  let session;

  try {
    // 1. Secure Authentication
    const authResult = authenticateUser(req);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: "Authentication required",
        details: authResult.error
      }, { status: 401 });
    }
    const userId = authResult.id;

    // ✅ FETCH FULL USER DETAILS (Need Mobile for Invoice)
    // Auth token might not have mobile, so we fetch it ensuring we have latest data
    await connectDB(); // Ensure connection (though likely already connected)
    const user = await User.findById(userId).select('name email mobile');

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found"
      }, { status: 404 });
    }

    const requestBody = await req.json();
    const { paymentResponse, cartItems } = requestBody;

    // console.log('🔍 Payment verification request:', {
    //   userId,
    //   orderId: paymentResponse?.razorpay_order_id,
    //   paymentId: paymentResponse?.razorpay_payment_id,
    //   cartItemsCount: cartItems?.length
    // });

    // 2. Validate request data
    if (!paymentResponse || !cartItems) {
      return NextResponse.json({
        success: false,
        error: "Invalid request data",
        details: "Payment response and cart items are required"
      }, { status: 400 });
    }

    // 3. Verify Razorpay signature
    const crypto = require('crypto');
    const body = paymentResponse.razorpay_order_id + "|" + paymentResponse.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== paymentResponse.razorpay_signature) {
      await Payment.logPaymentFailure(
        paymentResponse.razorpay_order_id,
        {
          code: 'INVALID_SIGNATURE',
          description: 'Payment signature verification failed',
          source: 'verification',
          step: 'signature_verification'
        },
        cartItems
      );

      return NextResponse.json({
        success: false,
        error: "Invalid payment signature"
      }, { status: 400 });
    }

    validateEnvironment();
    const mongooseInstance = await connectDB();

    // 4. Start transaction using the Subscription model's connection explicitly
    // This ensures session matches the model's client
    session = await Subscription.startSession();
    session.startTransaction();

    const createdSubscriptionIds = [];
    let calculatedTotalAmount = 0;
    const subscriptionDetails = [];

    // ✅ FIRST: Mark all existing subscriptions as not latest BEFORE creating new ones
    for (const item of cartItems) {
      try {
        await Subscription.updateMany(
          {
            user: userId,
            product: item.productId,
            isLatest: true
          },
          {
            $set: { isLatest: false }
          },
          { session }
        );
        // console.log(`✅ Marked existing subscriptions as not latest for product: ${item.productId}`);
      } catch (error) {
        console.error(`❌ Error marking existing subscriptions as not latest:`, error);
        throw error;
      }
    }


    // ✅ NEW: Increment Promo Code Usage Count
    // We assume the promo code belongs to the first product in the cart (as per checkout logic)
    // or we check all products to see if they have this code.
    const usedPromoCode = requestBody.promoCode;
    if (usedPromoCode && cartItems.length > 0) {
      try {
        // console.log(`🎟️ Processing usage for promo code: ${usedPromoCode}`);
        // Find product that owns this promo code. 
        // Logic: Try to find the code in the products being purchased.

        for (const item of cartItems) {
          const productWithPromo = await Product.findOne({
            _id: item.productId,
            'promoCodes.code': usedPromoCode.toUpperCase()
          }).session(session);

          if (productWithPromo) {
            const promoIndex = productWithPromo.promoCodes.findIndex(p => p.code === usedPromoCode.toUpperCase());
            if (promoIndex !== -1) {
              // Increment usage count
              // We use $inc to ensure atomicity, although we formatted the object above.
              // Since we have the document, we can modify and save, or use updateOne.
              // updateOne is better to target the specific array element.

              await Product.updateOne(
                { _id: productWithPromo._id, 'promoCodes.code': usedPromoCode.toUpperCase() },
                { $inc: { 'promoCodes.$.usageCount': 1 } },
                { session }
              );
              // console.log(`✅ Incremented usage count for promo ${usedPromoCode} on product ${productWithPromo._id}`);
              break; // Assuming code is applied once per order (global or per product)
            }
          }
        }
      } catch (promoError) {
        console.error("❌ Failed to update promo usage count:", promoError);
        // We choose NOT to fail the payment verification if usage update fails, 
        // to avoid reverting a valid payment for a minor metric error.
      }
    }

    // 5. Process each cart item and create subscriptions

    // ✅ FETCH EXISTING PAYMENT RECORD
    // We fetch the payment record created during 'create-order' to get the precise 
    // financial breakdown (discounts, taxes) that was presented to the user.
    const paymentRecordForDetails = await Payment.findOne({
      razorpayOrderId: paymentResponse.razorpay_order_id
    }).session(session);

    if (!paymentRecordForDetails) {
      throw new Error(`Payment record not found for order ${paymentResponse.razorpay_order_id}`);
    }

    for (const [index, item] of cartItems.entries()) {
      try {
        const product = await Product.findOne({ _id: item.productId, isActive: true }).session(session);

        if (!product) {
          throw new Error(`Product "${item.productId}" not found or inactive`);
        }

        const variant = product.variants.find(v => v.duration === item.duration);
        if (!variant) {
          throw new Error(`Variant "${item.duration}" not available for product`);
        }

        // Find validated item details from Payment Record
        // We match by productId and duration (and maybe index if multiple same items allowed?)
        // Assuming unique product+variant per cart for now or strictly by index if available.
        // Payment.metadata.cartItems has the same order as request.cartItems usually.
        const validatedItem = paymentRecordForDetails?.metadata?.cartItems?.[index] || {};

        // Fallbacks if validatedItem missing (shouldn't happen)
        const itemDiscount = validatedItem.discountApplied || 0;
        const itemOriginalPrice = validatedItem.actualPrice || variant.price;
        const itemFinalPrice = validatedItem.discountedPrice || (variant.price - itemDiscount);

        calculatedTotalAmount += variant.price;

        // Check for existing subscription
        const existingSubscription = await Subscription.findOne({
          user: userId,
          product: item.productId
        }).sort({ endDate: -1 }).session(session);

        let startDate = new Date();
        let coverageStartDate = new Date(startDate); // Logical start for duration calc

        // ✅ CRITICAL: Calculate Contiguous Logic
        const renewalContiguity = await processRenewalContiguity(
          userId,
          item.productId,
          startDate,
          session
        );

        let endDate = new Date(startDate);
        let isRenewal = false;
        let renewedFrom = null;

        // Handle extension logic (Modified to use contiguous logic)
        // If contiguous renewal, we might want to start from PREVIOUS END DATE?
        // Logic in 'processRenewalContiguity' returns 'effectiveStartDate' which is the ORIGINAL start.
        // BUT for the 'startDate' of THIS specific sub, if it is an overlap/future renewal, 
        // we should start from the end of the previous one.

        if (renewalContiguity.isContiguousRenewal && renewalContiguity.previousSubscription) {
          const prevEnd = new Date(renewalContiguity.previousSubscription.endDate);
          // NEW LOGIC: Start Date is ALWAYS 'now' (purchase time)
          // But we calculate End Date based on the previous end date to ensure no loss of time.
          if (prevEnd > startDate) {
            coverageStartDate = prevEnd; // We extend from here
          }
          isRenewal = true;
          renewedFrom = renewalContiguity.previousSubscription._id;
        } else if (existingSubscription &&
          (existingSubscription.status === 'active' || existingSubscription.status === 'expiresoon') &&
          existingSubscription.endDate > new Date()) {
          // Fallback standard overlap check
          coverageStartDate = existingSubscription.endDate;
          isRenewal = true;
          renewedFrom = existingSubscription._id;
        }

        endDate = new Date(coverageStartDate); // Calculate expiry from the END of previous coverage

        // Calculate End Date
        switch (variant.durationUnit) {
          case 'minutes': endDate.setMinutes(endDate.getMinutes() + variant.durationValue); break;
          case 'hours': endDate.setHours(endDate.getHours() + variant.durationValue); break;
          case 'days': endDate.setDate(endDate.getDate() + variant.durationValue); break;
          case 'weeks': endDate.setDate(endDate.getDate() + (variant.durationValue * 7)); break;
          case 'months': endDate.setMonth(endDate.getMonth() + variant.durationValue); break;
          case 'years': endDate.setFullYear(endDate.getFullYear() + variant.durationValue); break;
          default: endDate.setMonth(endDate.getMonth() + (variant.durationValue || 1));
        }

        // ✅ CHECK: Determine initial status
        const initialStatusCheck = SubscriptionNotifier.checkInitialSubscriptionStatus({
          endDate: endDate,
          variant: { ...variant, price: itemOriginalPrice } // Use original price for check context if needed
        });

        // Create NEW subscription with Financial Details
        const subscription = new Subscription({
          user: userId,
          product: item.productId,
          variant: {
            duration: variant.duration,
            durationValue: variant.durationValue,
            durationUnit: variant.durationUnit,
            price: variant.price // Keep schema variant.price as base Ref
          },
          // ✅ New Financial Fields
          discountApplied: itemDiscount,
          originalPrice: itemOriginalPrice,
          amountPaid: itemFinalPrice,

          // ✅ CONTIGUITY FIELDS
          isRenewal: isRenewal,
          renewedFrom: renewedFrom,
          originalStartDate: renewalContiguity.effectiveStartDate, // Tracks the chain start
          contiguousChainId: renewalContiguity.contiguousChainId,

          status: initialStatusCheck.status,
          paymentStatus: 'completed',
          paymentId: paymentResponse.razorpay_payment_id,
          transactionId: paymentResponse.razorpay_order_id,
          startDate: startDate,
          endDate: endDate,
          isLatest: true,
          replacedSubscription: existingSubscription ? existingSubscription._id : null,
          metadata: {
            paymentMethod: paymentResponse.method || 'razorpay',
            paymentVerifiedAt: new Date(),
            cartItemIndex: index,
            previousSubscriptionEnd: existingSubscription ? existingSubscription.endDate : null,
            initialStatus: initialStatusCheck.status,
            shouldNotifyOnCreate: initialStatusCheck.shouldNotify,
            promoCode: validatedItem.promoCode || requestBody.promoDetails?.code || null,
            discountAmount: itemDiscount,
            renewalType: renewalContiguity.isContiguousRenewal ? 'contiguous' : 'fresh',
            gapInDays: renewalContiguity.gapInDays
          }
        });

        await subscription.save({ session });
        createdSubscriptionIds.push(subscription._id.toString());

        subscriptionDetails.push({
          subscriptionId: subscription._id,
          productId: item.productId,
          productName: product.heading,
          duration: variant.duration,
          price: itemOriginalPrice, // ✅ Use ORIGINAL price for invoice generation (so subtotal is correct)
          paidPrice: itemFinalPrice, // Store paid price for reference
          startDate: startDate,
          endDate: endDate,
          status: subscription.status,
          shouldNotify: initialStatusCheck.shouldNotify
        });

        // console.log(`✅ Created NEW latest subscription: ${product.heading} (Paid: ₹${itemFinalPrice})`);

      } catch (itemError) {
        console.error(`❌ Failed to process cart item ${index}:`, itemError);
        await session.abortTransaction();

        await Payment.logPaymentFailure(
          paymentResponse.razorpay_order_id,
          {
            code: 'ITEM_PROCESSING_FAILED',
            description: `Failed to process cart item: ${itemError.message}`,
            source: 'subscription_creation',
            step: 'item_processing',
            itemIndex: index
          },
          cartItems
        );

        return NextResponse.json({
          success: false,
          error: `Failed to process item: ${itemError.message}`,
          failedItemIndex: index
        }, { status: 400 });
      }
    }

    // 6. Validate that subscriptions were created
    if (createdSubscriptionIds.length === 0) {
      await session.abortTransaction();

      await Payment.logPaymentFailure(
        paymentResponse.razorpay_order_id,
        {
          code: 'NO_SUBSCRIPTIONS_CREATED',
          description: 'No subscriptions were created during payment processing',
          source: 'subscription_creation',
          step: 'final_validation'
        },
        cartItems
      );

      return NextResponse.json({
        success: false,
        error: "No subscriptions were created"
      }, { status: 400 });
    }

    // 7. Calculate final amount with tax (18%) and discount
    const discountAmount = requestBody.promoDetails ? (requestBody.promoDetails.discountAmount || 0) : 0;
    const taxableAmount = Math.max(0, calculatedTotalAmount - discountAmount);
    const taxAmount = taxableAmount * 0.18;
    const totalAmount = taxableAmount + taxAmount;

    // 8. ✅ FIXED: Update Payment Record to CAPTURED status with userId
    const payment = await Payment.logPaymentCaptured(
      paymentResponse.razorpay_order_id,
      paymentResponse,
      createdSubscriptionIds,
      userId
    );

    if (!payment) {
      console.warn('⚠️ Payment record update failed, but subscriptions were created');
      // Don't throw error here - subscriptions are already created
    }

    // 9. ✅ FIXED: Send automatic invoice email with proper error tracking
    let emailSent = false;
    let emailError = null;
    let emailAttempted = false;

    try {
      if (payment) {
        emailAttempted = true;
        // console.log('📧 Attempting to send automatic invoice email to:', authResult.email);

        // Pass the FULL payment object and original cartItems to ensure all data is present
        // ✅ PASS EXPLICIT FINANCIAL DETAILS AND SUBSCRIPTION DETAILS
        // ✅ PASS FULL USER OBJECT (with mobile)
        await sendInvoiceEmail(payment, user, cartItems, {
          subtotal: calculatedTotalAmount,
          discountAmount: discountAmount,
          subscriptionDetails: subscriptionDetails // ✅ Pass details with dates
        });
        emailSent = true;
        // console.log('✅ Automatic invoice email sent successfully');
      } else {
        console.warn('⚠️ No payment record found for email sending');
      }
    } catch (error) { // ✅ FIXED: Changed variable name to avoid conflict
      console.error('❌ AUTOMATIC INVOICE EMAIL FAILED:', error);
      emailError = error.message; // ✅ FIXED: Use the caught error
      // Log this failure for monitoring but don't fail the transaction
    }

    // 10. Commit transaction
    await session.commitTransaction();

    // console.log(`✅ Payment verified successfully. Payment: ${payment?._id}, Subscriptions: ${createdSubscriptionIds.length}, Email: ${emailSent ? 'Sent' : 'Failed'}`);

    // ✅ CREATE NOTIFICATIONS AFTER TRANSACTION COMMITS
    // This ensures notifications are created for subscriptions with expiresoon status
    try {
      // console.log('🔔 Creating notifications for new subscriptions...');

      for (const detail of subscriptionDetails) {
        try {
          if (detail.shouldNotify && detail.status === 'expiresoon') {
            // Fetch the subscription with populated data
            const subscription = await Subscription.findById(detail.subscriptionId)
              .populate('product', 'heading shortDescription')
              .populate('user', 'name email');

            if (subscription) {
              // Create expiresoon notification
              const notification = await SubscriptionNotifier.createStatusChangeNotification(
                subscription,
                'active', // Treat as if it was active first
                'expiresoon',
                'payment' // Triggered by payment/creation
              );

              if (notification) {
                // console.log(`✅ Created expiresoon notification for subscription ${detail.subscriptionId}`);
              }
            }
          } else if (detail.status === 'active') {
            // Fetch the subscription with populated data for active notifications
            const subscription = await Subscription.findById(detail.subscriptionId)
              .populate('product', 'heading shortDescription')
              .populate('user', 'name email');

            if (subscription) {
              // Create standard active notification
              const notification = await SubscriptionNotifier.createNewSubscriptionNotification(subscription);

              if (notification) {
                // console.log(`✅ Created active notification for subscription ${detail.subscriptionId}`);
              }
            }
          }
        } catch (notifError) {
          console.error(`❌ Error creating notification for subscription ${detail.subscriptionId}:`, notifError);
          // Don't fail the entire request if notification creation fails
        }
      }

      // console.log('✅ Notification creation process completed');
    } catch (notificationError) {
      console.error('❌ Error in notification creation process:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscriptions created successfully",
      paymentId: paymentResponse.razorpay_payment_id,
      orderId: paymentResponse.razorpay_order_id,
      createdSubscriptionIds: createdSubscriptionIds,
      paymentRecordId: payment?._id,
      invoiceEmail: {
        sent: emailSent,
        attempted: emailAttempted,
        error: emailError,
        to: authResult.email,
        timestamp: new Date().toISOString()
      },
      amount: totalAmount,
      summary: {
        totalSubscriptions: createdSubscriptionIds.length,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        subtotal: calculatedTotalAmount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }

    console.error("❌ Payment verification error:", error);

    let statusCode = 500;
    let errorMessage = "Payment verification failed";

    if (error.message.includes('Invalid payment signature')) {
      statusCode = 400;
      errorMessage = "Invalid payment signature";
    } else if (error.message.includes('Authentication required')) {
      statusCode = 401;
      errorMessage = "Authentication failed";
    } else if (error.message.includes('duplicate key error')) {
      statusCode = 400;
      errorMessage = "Subscription already exists. Please check your subscriptions page.";
    } else if (error.message.includes('Failed to update payment record')) {
      statusCode = 200;
      errorMessage = null;
      console.log('⚠️ Payment record update failed but subscriptions created successfully');
    }

    return NextResponse.json({
      success: !errorMessage,
      error: errorMessage === "Payment verification failed" ? `Payment verification failed: ${error.message}` : errorMessage,
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: errorMessage ? statusCode : 200 });
  } finally {
    if (session) {
      session.endSession();
    }
  }
}