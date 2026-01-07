import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';

export async function GET(request) {
  try {
    // Authenticate admin
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Run subscription check manually
    const result = await SubscriptionNotifier.checkAndUpdateAllSubscriptions('manual_test');

    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      result: {
        processed: result.processed,
        expired: result.expired.count,
        expiresoon: result.expiresoon.count,
        notifications: result.notifications.length,
        errors: result.errors.length,
        timestamp: result.timestamp
      },
      details: {
        expired: result.expired.details,
        expiresoon: result.expiresoon.details,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error in test cron endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body = await request.json();
    const { action, subscriptionId } = body;

    let result;

    if (action === 'check_user' && body.userId) {
      result = await SubscriptionNotifier.checkUserSubscriptions(body.userId);
    } else if (action === 'summary') {
      result = await SubscriptionNotifier.getStatusSummary();
    } else if (action === 'force_check') {
      result = await SubscriptionNotifier.checkAndUpdateAllSubscriptions('force_check');
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Error in cron test POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}