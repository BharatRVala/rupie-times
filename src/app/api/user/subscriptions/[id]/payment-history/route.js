// src/app/api/user/subscriptions/[id]/payment-history/route.js - UPDATED
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request, { params }) {
  try {
    // ✅ Updated authentication - uses new middleware pattern
    const user = authenticateUser(request);

    await connectDB();
    
    const { id } = await params;

    // Find the subscription
    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if user owns this subscription
    if (subscription.user.toString() !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get payment history
    const paymentHistory = await subscription.getPaymentHistory();

    return NextResponse.json({
      success: true,
      paymentHistory: paymentHistory,
      user: { // ✅ Added user info
        id: user.id,
        name: user.name,
        email: user.email
      },
      subscription: { // ✅ Added subscription info for context
        id: subscription._id,
        product: subscription.product,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    
    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required to access payment history' 
        }, 
        { status: 401 }
      );
    }
    
    // ✅ Handle invalid subscription ID format
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment history: ' + error.message
    }, { status: 500 });
  }
}