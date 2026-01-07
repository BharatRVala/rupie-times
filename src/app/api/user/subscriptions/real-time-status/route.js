// src/app/api/user/subscriptions/real-time-status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import { authenticateUser } from '@/app/lib/middleware/auth';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';

export async function POST(request) {
  try {
    const user = authenticateUser(request);
    if (!user.success) {
      return NextResponse.json({ success: false, error: user.error }, { status: user.status });
    }

    await connectDB();

    const body = await request.json();
    const { subscriptionIds } = body;

    if (!Array.isArray(subscriptionIds)) {
      return NextResponse.json({
        success: false,
        error: 'subscriptionIds array required'
      }, { status: 400 });
    }

    const now = new Date();
    // console.log('🔍 Real-time status update for subscriptions:', subscriptionIds);

    const results = {
      expired: 0,
      expiresoon: 0,
      updated: []
    };

    // Process each subscription
    for (const subId of subscriptionIds) {
      const subscription = await Subscription.findById(subId);

      if (!subscription || subscription.user.toString() !== user.id) {
        continue;
      }

      const oldStatus = subscription.status;
      const endDate = new Date(subscription.endDate);
      let newStatus = oldStatus;

      // Check if expired
      if (endDate <= now && oldStatus !== 'expired') {
        newStatus = 'expired';
      }
      // Check if should be expiresoon (for minute-based)
      else if (subscription.variant.durationUnit === 'minutes') {
        const timeRemaining = endDate - now;
        const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));

        if (minutesRemaining <= 1 && oldStatus === 'active') {
          newStatus = 'expiresoon';
        }
      }
      else {
        // Check if should be expiresoon (for normal days/months)
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 10 && daysLeft > 0 && oldStatus === 'active') {
          newStatus = 'expiresoon';
        }
      }

      // Check for RE-ACTIVATION (fix for Expired status despite future date)
      if (oldStatus === 'expired' && endDate > now) {
        newStatus = 'active'; // Or 'expiresoon' if close, but safe default
        // Precise check
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 10) newStatus = 'expiresoon';
      }

      // Update if status changed
      if (newStatus !== oldStatus) {
        await Subscription.findByIdAndUpdate(subId, {
          status: newStatus,
          lastStatusCheck: now
        });

        // ✅ Generate notification for status change
        // Need to populate product for notification message
        const populatedSub = await Subscription.findById(subId)
          .populate('user', 'name email')
          .populate('product', 'heading shortDescription');

        if (populatedSub) {
          await SubscriptionNotifier.createStatusChangeNotification(
            populatedSub,
            oldStatus,
            newStatus,
            'auto_check' // Triggered by real-time check
          );
        }

        results.updated.push({
          id: subscription._id,
          oldStatus,
          newStatus,
          endDate: subscription.endDate
        });

        if (newStatus === 'expired') results.expired++;
        if (newStatus === 'expiresoon') results.expiresoon++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: now.toISOString(),
      message: `Processed ${subscriptionIds.length} subscriptions, ${results.updated.length} updated`
    });

  } catch (error) {
    console.error('Error in real-time status update:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update statuses: ' + error.message
    }, { status: 500 });
  }
}