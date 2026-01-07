import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import User from '@/app/lib/models/User';
import Notification from '@/app/lib/models/Notification'; // ✅ Import Notification
import Payment from '@/app/lib/models/Payment'; // ✅ Import Payment
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import mongoose from 'mongoose';

export async function POST(request) {
    try {
        // ... (existing auth) ...
        const auth = authenticateAdmin(request);
        if (!auth.success) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        await connectDB();

        // 2. Parse Body
        const body = await request.json();
        const { userId, productId, startDate, endDate, status, variant } = body;

        // ... (existing validation) ...
        if (!userId || !productId || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, productId, startDate, endDate' },
                { status: 400 }
            );
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const manualOrderId = `MANUAL_ADMIN_${Date.now()}_${userId.toString().slice(-4)}`;

        // 5. Construct Subscription Data
        const subscriptionData = {
            user: userId,
            product: productId,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: status || 'active',
            paymentStatus: 'completed',
            paymentId: manualOrderId, // Link to the Manual Order ID
            variant: variant || {
                duration: 'Manual',
                durationValue: 0,
                durationUnit: 'days',
                price: 0
            },
            metadata: {
                createdByAdmin: auth.id,
                adminName: auth.name,
                createdAt: new Date()
            }
        };

        // ✅ FIX: Deactivate old subscriptions
        await Subscription.markOldSubscriptionsAsNotLatest(userId, productId, null);

        // 6. Create Subscription
        const subscription = await Subscription.create(subscriptionData);

        // ✅ NEW: Trigger Notification
        try {
            await subscription.populate('product');
            await Notification.createNewSubscriptionNotification(subscription);
        } catch (notifError) {
            console.error('⚠️ Failed to send subscription notification:', notifError);
        }

        // ✅ NEW: Create Payment Record (So it shows in "My Orders")
        try {
            const payment = new Payment({
                user: userId,
                razorpayOrderId: manualOrderId,
                razorpayPaymentId: `PAY_MANUAL_${Date.now()}`,
                amount: variant?.price || 0,
                currency: 'INR',
                status: 'captured', // Completed
                paymentMethod: 'Manual Assignment (Admin)',
                description: `Manual subscription assignment by Admin: ${product.heading}`,
                subscriptions: [subscription._id],
                metadata: {
                    cartItems: [{
                        productId: product._id,
                        heading: product.heading,
                        price: variant?.price || 0,
                        discountedPrice: 0, // Assuming free/manual
                        quantity: 1
                    }],
                    subtotal: variant?.price || 0,
                    taxAmount: 0,
                    totalInRupees: variant?.price || 0,
                    createdAt: new Date(),
                    itemsCount: 1,
                    adminId: auth.id,
                    adminName: auth.name,
                    changeReason: 'Manual Admin Assignment'
                }
            });
            await payment.save();
            // console.log(`✅ Payment record created for manual assignment: ${payment._id}`);
        } catch (paymentError) {
            console.error('❌ Failed to create Payment record for manual assignment:', paymentError);
            // Non-critical (?) -> maybe critical for user visibility. Log clearly.
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription assigned successfully',
            subscription
        });

    } catch (error) {
        console.error('Error assigning subscription:', error);
        return NextResponse.json(
            { error: 'Failed to assign subscription: ' + error.message },
            { status: 500 }
        );
    }
}
