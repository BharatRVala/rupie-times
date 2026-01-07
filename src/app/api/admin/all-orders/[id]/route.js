import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
    try {
        const authResult = authenticateAdmin(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.status });
        }

        await connectDB();
        const { id } = await params;

        const sub = await Subscription.findById(id)
            .populate({ path: 'product', model: Product })
            .populate({ path: 'user', model: User });

        if (!sub) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // Calculations
        const now = new Date();
        const endDate = new Date(sub.endDate);
        const isActuallyActive = (sub.status === 'active' || sub.status === 'expiresoon') && endDate > now;
        const daysRemaining = isActuallyActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

        // Financials
        const baseAmount = sub.variant?.price || 0;
        const discountAmount = sub.metadata?.discountAmount || 0;
        const taxableAmount = Math.max(0, baseAmount - discountAmount);
        const taxAmount = taxableAmount * 0.18;
        const totalAmount = taxableAmount + taxAmount;

        // Formatting
        const orderData = {
            id: sub._id,
            orderId: `ORD-${sub._id.toString().slice(-8).toUpperCase()}`,
            product: {
                title: sub.product?.heading || 'Unknown Product',
                description: sub.product?.shortDescription || '',
                image: sub.product?.filename ? `/api/user/products/image/${sub.product.filename}` : '/assets/product.svg',
                badges: [
                    { text: sub.product?.category || 'General', color: 'bg-orange-100 text-orange-700' },
                    { text: `${sub.variant?.duration || 1} Month`, color: 'bg-green-100 text-green-700' }
                ]
            },
            user: {
                title: 'User Details',
                name: sub.user?.name || 'Guest',
                email: sub.user?.email || 'N/A',
                phone: sub.user?.mobile || 'N/A'
            },
            payment: {
                title: 'Payment Information',
                status: sub.paymentStatus,
                statusColor: sub.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                fields: [
                    { label: 'Payment Method', value: sub.metadata?.paymentMethod || 'Razorpay' },
                    { label: 'Payment Date', value: new Date(sub.createdAt).toLocaleString('en-GB') },
                    { label: 'Payment ID', value: sub.paymentId || 'N/A' },
                    { label: 'Transaction ID', value: sub.transactionId || 'N/A' }
                ]
            },
            summary: {
                title: 'Order Summary',
                items: [
                    { label: 'Amount', value: `₹${baseAmount.toFixed(2)}` },
                    { label: 'Discount', value: `-₹${discountAmount.toFixed(2)}` },
                    { label: 'GST (18%)', value: `₹${taxAmount.toFixed(2)}` }
                ],
                total: { label: 'Total Paid', value: `₹${totalAmount.toFixed(2)}` }
            },
            raw: {
                baseAmount,
                discountAmount,
                taxAmount,
                totalAmount,
                createdAt: sub.createdAt,
                startDate: sub.startDate,
                endDate: sub.endDate,
                paymentId: sub.paymentId,
                razorpayOrderId: sub.metadata?.razorpayOrderId || sub.paymentId, // Use metadata if available
                variant: sub.variant,
                metadata: sub.metadata // ✅ Expose metadata including admin info
            },
            subscription: {
                title: 'Subscription Details',
                status: sub.status,
                statusColor: isActuallyActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                fields: [
                    { label: 'Start Date', value: new Date(sub.startDate).toLocaleDateString('en-GB') },
                    { label: 'End Date', value: new Date(sub.endDate).toLocaleDateString('en-GB') },
                    { label: 'Duration', value: `${sub.variant?.duration || 0} Month` }
                ]
            }
        };

        return NextResponse.json({ success: true, order: orderData });

    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
