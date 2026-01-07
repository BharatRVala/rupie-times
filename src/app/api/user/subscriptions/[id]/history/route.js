// src/app/api/admin/subscriptions/[id]/history/route.js
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Get subscription ID from params
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    console.log(`📋 [ADMIN API] Getting status history for subscription: ${id}`);
    console.log(`   Admin: ${auth.name} (${auth.email})`);

    // Get status history using SubscriptionNotifier
    const result = await SubscriptionNotifier.getSubscriptionStatusHistory(id);

    if (result.success) {
      console.log(`✅ Found ${result.count} status change notifications`);
      
      return NextResponse.json({
        success: true,
        subscriptionId: id,
        count: result.count,
        history: result.history,
        summary: {
          totalChanges: result.count,
          lastChange: result.history.length > 0 ? result.history[0].timestamp : null,
          triggeredByCount: result.history.reduce((acc, item) => {
            acc[item.triggeredBy] = (acc[item.triggeredBy] || 0) + 1;
            return acc;
          }, {})
        }
      });
    } else {
      console.error('❌ Failed to get status history:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get status history: ' + result.error 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Get subscription history error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get subscription history: ' + error.message 
      },
      { status: 500 }
    );
  }
}