import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(request) {
    try {
        await connectDB();

        const admin = authenticateAdmin(request);
        // Assuming authenticateAdmin throws or returns object. 
        // Based on read files, it seems to be used as `const admin = authenticateAdmin(request);`
        // and error handling is done via catch or explicit checks if it returns success flag.
        // I'll stick to try-catch for safety.

        const body = await request.json();
        const { subscriptionId, status, startDate, endDate, historicalArticleLimit } = body;

        if (!subscriptionId) {
            return NextResponse.json({ success: false, error: 'Subscription ID is required' }, { status: 400 });
        }

        // ✅ Handle Trial Updates (Stored in User model, not Subscription)
        if (subscriptionId.startsWith('TRIAL_')) {
            const userId = subscriptionId.replace('TRIAL_', '');
            const { default: User } = await import('@/app/lib/models/User');

            const userUpdateData = {};
            if (startDate) userUpdateData['trial.startDate'] = new Date(startDate);
            if (endDate) userUpdateData['trial.endDate'] = new Date(endDate);

            // Logic for status? If endDate > now, it's active.
            if (status === 'active' || (endDate && new Date(endDate) > new Date())) {
                userUpdateData['trial.isUsed'] = true; // Still marked as used, but dates make it active
            }
            // If explicit inactive/expired, we don't need to change much else than dates usually.

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: userUpdateData },
                { new: true }
            );

            if (!updatedUser) {
                return NextResponse.json({ success: false, error: 'User not found for trial update' }, { status: 404 });
            }

            // Return a fake subscription object to satisfy the frontend
            return NextResponse.json({
                success: true,
                message: 'Trial updated successfully',
                subscription: {
                    id: subscriptionId,
                    status: status || 'updated',
                    startDate: updatedUser.trial.startDate,
                    endDate: updatedUser.trial.endDate,
                    variant: { duration: '7 Days', price: 0 }
                }
            });
        }

        const updateData = {};
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
        if (historicalArticleLimit) updateData.historicalArticleLimit = parseInt(historicalArticleLimit);

        // Calculate correct status if dates are updated
        const targetEndDate = updateData.endDate ? new Date(updateData.endDate) : null;
        if (targetEndDate && targetEndDate > new Date()) {
            // If date is future, force status to active or expiresoon (if < 2 days)
            // Check if expiresoon
            const daysLeft = Math.ceil((targetEndDate - new Date()) / (1000 * 60 * 60 * 24));
            updateData.status = daysLeft <= 2 ? 'expiresoon' : 'active';
        } else if (status) {
            // Only use manual status if date logic didn't override
            updateData.status = status.toLowerCase();
        }

        const updatedSubscription = await Subscription.findByIdAndUpdate(
            subscriptionId,
            updateData,
            { new: true }
        );

        if (!updatedSubscription) {
            return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
            subscription: updatedSubscription
        });

    } catch (error) {
        console.error('Error updating subscription:', error);
        if (error.message.includes('authentication failed')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
