import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import PromoCode from '@/app/lib/models/PromoCode';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(req) {
    try {
        const authResult = authenticateAdmin(req);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const promoCodes = await PromoCode.find().sort({ createdAt: -1 });

        return NextResponse.json({ success: true, promoCodes });
    } catch (error) {
        console.error('Error fetching promo codes:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const authResult = authenticateAdmin(req);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const body = await req.json();

        // Check for duplicate code
        const existing = await PromoCode.findOne({ code: body.code.toUpperCase() });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Promo code already exists' }, { status: 400 });
        }

        const promoCode = await PromoCode.create({
            ...body,
            code: body.code.toUpperCase()
        });

        return NextResponse.json({ success: true, promoCode }, { status: 201 });
    } catch (error) {
        console.error('Error creating promo code:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
