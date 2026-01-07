// src/app/api/payments/cancel/route.js
import { NextResponse } from "next/server";
import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function POST(req) {
  try {
    const authResult = authenticateUser(req);
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Authentication required" 
      }, { status: 401 });
    }

    const { orderId, cartItems, reason = 'User cancelled' } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: "Order ID is required" 
      }, { status: 400 });
    }

    await connectDB();

    const payment = await Payment.logPaymentCancelled(orderId, reason);

    return NextResponse.json({
      success: true,
      message: "Payment cancelled",
      paymentId: payment?._id,
      orderId: orderId,
      reason: reason,
      status: 'cancelled'
    });

  } catch (error) {
    console.error("Error logging payment cancellation:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to log payment cancellation",
      details: error.message
    }, { status: 500 });
  }
}