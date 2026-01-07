import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import Payment from '@/app/lib/models/Payment';
import { authenticateUser } from '@/app/lib/middleware/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
    try {
        const user = authenticateUser(request);

        if (!user.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        await connectDB();
        const { id } = await params;

        // Fetch Subscription
        const order = await Subscription.findOne({
            _id: id,
            user: user.id
        })
            .populate({
                path: 'product',
                select: 'heading shortDescription filename category variants',
                model: Product
            })
            .populate({
                path: 'replacedSubscription',
                select: 'startDate endDate variant status',
                model: Subscription
            })
            .lean();

        if (!order) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        // ✅ FETCH ASSOCIATED PAYMENT
        // Subscription has paymentId (Razorpay ID). We can find the Payment record by razorpayOrderId (transactionId) or razorpayPaymentId.
        // Subscription.transactionId usually stores razorpay_order_id.
        let paymentRecord = null;
        if (order.transactionId) {
            paymentRecord = await Payment.findOne({ razorpayOrderId: order.transactionId }).lean();
        }

        // Fallback: Try finding by paymentId if not found by transactionId
        if (!paymentRecord && order.paymentId) {
            paymentRecord = await Payment.findOne({ razorpayPaymentId: order.paymentId }).lean();
        }

        console.log("DEBUG API ORDER FETCH:", {
            orderId: id,
            transactionId: order.transactionId,
            paymentId: order.paymentId,
            paymentRecordFound: !!paymentRecord,
            paymentMetadata: paymentRecord?.metadata,
            subscriptionMetadata: order.metadata
        });

        const now = new Date();
        const endDate = new Date(order.endDate);

        const isPaymentSuccessful = order.paymentStatus === 'completed' || order.paymentStatus === 'captured';
        const isSubscriptionActive = isPaymentSuccessful && (order.status === 'active' || order.status === 'expiresoon') && endDate > now;
        const daysRemaining = isSubscriptionActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

        // Helper for Timeline Status
        const getStepStatus = (stepType) => {
            // ... (same as before) ...
            if (order.paymentStatus === 'failed') return 'failed';
            if (order.paymentStatus === 'pending') return 'pending';
            if (stepType === 'expiry') {
                return now > endDate ? 'completed' : 'pending';
            }
            return 'completed';
        };

        const formattedOrder = {
            _id: order._id,
            id: order._id,
            orderId: order.transactionId || `ORD_${order._id.toString().slice(-8)}`,
            product: order.product ? {
                _id: order.product._id,
                heading: order.product.heading || 'No Title',
                shortDescription: order.product.shortDescription || 'No description available',
                filename: order.product.filename || null,
                category: order.product.category || 'Uncategorized',
                variants: order.product.variants || []
            } : {
                // ... (same fallback) ...
                _id: null,
                heading: 'Product Not Available',
                shortDescription: 'This product is no longer available',
                filename: null,
                category: 'Uncategorized',
                variants: []
            },
            variant: order.variant || { duration: 'N/A', price: 0, durationValue: 0, durationUnit: 'months' },
            orderDate: order.createdAt,
            paymentStatus: order.paymentStatus === 'captured' ? 'completed' : order.paymentStatus,
            paymentId: order.paymentId,
            transactionId: order.transactionId,
            amount: order.variant?.price || 0, // Keep base price here
            // ✅ ADDED: Explicit Total Amount from Payment Record
            totalAmount: paymentRecord ? Number(paymentRecord.amount.toString()) : (order.variant?.price || 0),

            subscriptionStatus: order.status,
            startDate: order.startDate,
            endDate: order.endDate,
            isSubscriptionActive: isSubscriptionActive,
            daysRemaining: daysRemaining,
            isLatest: order.isLatest,
            paymentMethod: order.metadata?.paymentMethod || 'razorpay',
            paymentVerifiedAt: order.metadata?.paymentVerifiedAt,
            subscribedAt: order.metadata?.subscribedAt,
            replacedSubscription: order.replacedSubscription ? {
                id: order.replacedSubscription._id,
                startDate: order.replacedSubscription.startDate,
                endDate: order.replacedSubscription.endDate,
                variant: order.replacedSubscription.variant,
                status: order.replacedSubscription.status
            } : null,
            userEmail: user.email,
            // ✅ PRIORITY 1: Trust Subscription Metadata (Same as Email)
            discountAmount: (() => {
                // Check Subscription metadata first (Source of Truth for Email)
                if (order.metadata?.discountAmount && Number(order.metadata.discountAmount) > 0) {
                    return Number(order.metadata.discountAmount);
                }

                // ✅ PRIORITY 2: Calculate from Payment Cart Items
                if (paymentRecord?.metadata?.cartItems) {
                    const cartDiscount = paymentRecord.metadata.cartItems.reduce((sum, item) => {
                        const price = Number(item.price) || 0;
                        const discountedPrice = Number(item.discountedPrice) || price;
                        const quantity = Number(item.quantity) || 1;
                        return sum + ((price - discountedPrice) * quantity);
                    }, 0);
                    if (cartDiscount > 0) return Number(cartDiscount.toFixed(2));
                }

                // Fallback
                return (paymentRecord?.metadata?.discountAmount)
                    ? Number(paymentRecord.metadata.discountAmount)
                    : 0;
            })(),

            promoCode: order.metadata?.promoCode || (paymentRecord?.metadata?.promoCode) || null,

            timeline: [
                // ... (same timeline) ...
                {
                    event: 'Order Placed',
                    date: order.createdAt,
                    status: 'completed'
                },
                {
                    event: 'Payment Processed',
                    date: order.metadata?.paymentVerifiedAt || order.updatedAt,
                    status: order.paymentStatus === 'captured' || order.paymentStatus === 'completed' ? 'completed' :
                        order.paymentStatus === 'failed' ? 'failed' : 'pending'
                },
                {
                    event: 'Subscription Activated',
                    date: order.startDate,
                    status: getStepStatus('activation')
                },
                {
                    event: 'Access Granted',
                    date: order.startDate,
                    status: getStepStatus('access')
                },
                {
                    event: 'Subscription Expires',
                    date: order.endDate,
                    status: (order.paymentStatus === 'failed' || order.paymentStatus === 'pending')
                        ? order.paymentStatus
                        : (now > endDate ? 'completed' : 'pending')
                }
            ]
        };

        return NextResponse.json({
            success: true,
            order: formattedOrder,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        if (error.message.includes('authentication failed')) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        if (error.name === 'CastError') return NextResponse.json({ success: false, error: 'Invalid order ID format' }, { status: 400 });
        return NextResponse.json({ success: false, error: 'Failed to fetch order details: ' + error.message }, { status: 500 });
    }
}