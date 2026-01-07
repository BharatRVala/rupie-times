import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import Payment from '@/app/lib/models/Payment';
import { authenticateUser } from '@/app/lib/middleware/auth';
import mongoose from 'mongoose';

export async function GET(request) {
    try {
        await connectDB();

        // Use middleware to get user info
        const auth = authenticateUser(request);
        if (!auth || !auth.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(auth.id);

        if (!user) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const trial = user.trial || { isUsed: false };
        let isActive = false;
        let daysLeft = 0;
        let endDate = null;

        if (trial.isUsed && trial.startDate) {
            const start = new Date(trial.startDate);
            const now = new Date();

            // ✅ Fix: Use stored endDate if available, else default to 7 days
            let end;
            if (trial.endDate) {
                end = new Date(trial.endDate);
            } else {
                const duration = 7 * 24 * 60 * 60 * 1000;
                end = new Date(start.getTime() + duration);
            }

            endDate = end;

            // Check if active based on dates
            if (now < end) {
                isActive = true;
                const diffTime = Math.abs(end - now);
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                // If now > end, it is expired
                isActive = false;
                daysLeft = 0;

                // ✅ Check/Send Expiration Notification (Lazy Check)
                if (!trial.expirationNotified) {
                    try {
                        const Notification = (await import('@/app/lib/models/Notification')).default;
                        await Notification.create({
                            title: "Trial Expired",
                            message: "Your free trial has ended. Subscribe now to continue accessing premium content.",
                            userId: user._id,
                            notificationType: "trial_expired",
                            isBroadcast: false,
                            isRead: false
                        });

                        user.trial.expirationNotified = true;
                        // Avoid full validation if other fields conflict, or just save partial
                        await user.save({ validateBeforeSave: false });
                        console.log(`Trial expiration notification sent to user ${user._id}`);
                    } catch (notifError) {
                        console.error("Error sending trial expiration notification:", notifError);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            status: {
                isUsed: trial.isUsed,
                isActive,
                daysLeft,
                startDate: trial.startDate,
                endDate
            }
        });

    } catch (error) {
        // Handle authentication errors specifically if needed, or generic
        if (error?.message?.includes('authentication') || error?.message?.includes('token')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();

        const auth = authenticateUser(request);
        if (!auth || !auth.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(auth.id);

        if (user.trial?.isUsed) {
            return NextResponse.json({ success: false, error: "Trial already used" }, { status: 400 });
        }

        // Activate Trial
        const now = new Date();
        const endDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

        user.trial = {
            isUsed: true,
            startDate: now,
            endDate: endDate,
            expirationNotified: false
        };

        await user.save();

        // ✅ Send Activation Notification
        try {
            const Notification = (await import('@/app/lib/models/Notification')).default;
            await Notification.create({
                title: "Free Trial Active",
                message: "Your free trial is active for 7 days. Enjoy unlimited access!",
                userId: user._id,
                notificationType: "trial_active",
                isBroadcast: false,
                isRead: false
            });
        } catch (notifError) {
            console.error("Error sending trial activation notification:", notifError);
        }

        // Create Zero-Value Payment Record for "Order" history
        try {
            const razorpayOrderId = `trial_${user._id}_${Date.now()}`;
            const payment = new Payment({
                user: user._id,
                razorpayOrderId: razorpayOrderId,
                razorpayPaymentId: `pay_${razorpayOrderId}`, // Dummy payment ID for consistency
                amount: 0,
                startCurrency: 'INR',
                status: 'captured', // Mark as captured/completed
                paymentMethod: 'trial',
                description: 'Free Trial Activation - 7 Days',
                metadata: {
                    type: 'trial_activation',
                    validUntil: endDate,
                    subtotal: 0,
                    taxAmount: 0,
                    totalInRupees: 0,
                    createdAt: now
                }
            });
            await payment.save();
        } catch (paymentError) {
            console.error("Error creating trial payment record:", paymentError);
            // Don't fail the trial activation itself if payment logging fails, but it's important.
        }

        return NextResponse.json({ success: true, message: "Trial activated successfully" });

    } catch (error) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
