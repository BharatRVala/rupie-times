// src/app/api/user/payments/route.js - FIXED WITH PROPER ERROR HANDLING
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';
import Subscription from '@/app/lib/models/Subscription'; // ✅ Ensure Model Registration
import Product from '@/app/lib/models/product'; // ✅ Ensure Model Registration
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    // console.log('🔍 Starting payments fetch request...');

    const authResult = authenticateUser(request);

    if (!authResult.success) {
      console.log('❌ Authentication failed:', authResult.error);
      return NextResponse.json({
        success: false,
        error: 'Authentication failed'
      }, { status: 401 });
    }

    // console.log('✅ User authenticated:', authResult.id);

    await connectDB();
    // console.log('✅ Database connected');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    // console.log(`📋 Fetching payments for user ${authResult.id}, page ${page}, limit ${limit}`);

    const paymentsData = await Payment.getUserPayments(authResult.id, limit, page);

    // console.log(`✅ Found ${paymentsData.payments.length} payments for user`);

    // Inject Real-time Trial Info if present
    const { default: User } = await import('@/app/lib/models/User');
    const currentUser = await User.findById(authResult.id).select('trial');

    if (currentUser?.trial?.startDate && currentUser?.trial?.endDate) {
      paymentsData.payments = paymentsData.payments.map(payment => {
        if (payment.metadata?.type === 'trial_activation') {
          const start = new Date(currentUser.trial.startDate);
          const end = new Date(currentUser.trial.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            ...payment,
            createdAt: currentUser.trial.startDate, // Sync start date
            duration: `${diffDays} Days` // Inject dynamic duration
          };
        }
        return payment;
      });
    }

    return NextResponse.json({
      success: true,
      ...paymentsData
    });

  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}