import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import PromoCode from '@/app/lib/models/PromoCode';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(req, { params }) {
    try {
        const authResult = authenticateAdmin(req);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();

        const promoCode = await PromoCode.findByIdAndUpdate(
            id,
            { ...body, code: body.code?.toUpperCase() },
            { new: true, runValidators: true }
        );

        if (!promoCode) {
            return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, promoCode });
    } catch (error) {
        console.error('Error updating promo code:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const authResult = authenticateAdmin(req);
        if (!authResult.success) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { id } = await params;

        const promoCode = await PromoCode.findByIdAndDelete(id);

        if (!promoCode) {
            return NextResponse.json({ success: false, error: 'Promo code not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Promo code deleted successfully' });
    } catch (error) {
        console.error('Error deleting promo code:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
