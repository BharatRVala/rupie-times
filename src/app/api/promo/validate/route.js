import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Product from '@/app/lib/models/product';

export async function POST(req) {
    try {
        await connectDB();
        const { productId, promoCode, amount } = await req.json();

        if (!productId || !promoCode) {
            return NextResponse.json({
                success: false,
                error: "Product ID and Promo Code are required"
            }, { status: 400 });
        }

        const product = await Product.findOne({ _id: productId, isActive: true }).select('promoCodes');

        if (!product) {
            return NextResponse.json({
                success: false,
                error: "Product not found or inactive"
            }, { status: 404 });
        }

        // 1. First check Product-specific promo codes
        let promo = product.promoCodes?.find(p => p.code === promoCode.toUpperCase() && p.isActive);
        let isGlobal = false;

        // 2. If not found, check Global Promo Codes
        if (!promo) {
            const PromoCode = (await import('@/app/lib/models/PromoCode')).default;
            const globalPromo = await PromoCode.findOne({
                code: promoCode.toUpperCase(),
                isActive: true
            });

            if (globalPromo) {
                promo = globalPromo;
                isGlobal = true;
            }
        }

        if (!promo) {
            return NextResponse.json({
                success: false,
                error: "Invalid or inactive promo code"
            }, { status: 400 });
        }

        // Check validity dates
        const now = new Date();
        if (promo.validFrom && now < new Date(promo.validFrom)) {
            return NextResponse.json({
                success: false,
                error: "Promo code is not yet active"
            }, { status: 400 });
        }

        if (promo.validUntil && now > new Date(promo.validUntil)) {
            return NextResponse.json({
                success: false,
                error: "Promo code has expired"
            }, { status: 400 });
        }

        // Check usage limits
        if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
            return NextResponse.json({
                success: false,
                error: "Promo code usage limit exceeded"
            }, { status: 400 });
        }

        // Calculate Discount
        let discountAmount = 0;
        let finalAmount = amount;

        if (promo.discountType === 'flat') {
            discountAmount = promo.discountValue;
        } else if (promo.discountType === 'percentage') {
            discountAmount = (amount * promo.discountValue) / 100;
            // Optional: Cap percentage discount? No requirement yet.
        }

        // Ensure discount doesn't exceed amount
        if (discountAmount > amount) {
            discountAmount = amount;
        }

        // Round to 2 decimals
        discountAmount = Math.round(discountAmount * 100) / 100;
        finalAmount = amount - discountAmount;
        finalAmount = Math.round(finalAmount * 100) / 100;

        return NextResponse.json({
            success: true,
            isValid: true,
            code: promo.code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            discountAmount: discountAmount,
            originalAmount: amount,
            finalAmount: finalAmount,
            message: "Promo code applied successfully"
        });

    } catch (error) {
        console.error('Promo validation error:', error);
        return NextResponse.json({
            success: false,
            error: "Failed to validate promo code"
        }, { status: 500 });
    }
}
