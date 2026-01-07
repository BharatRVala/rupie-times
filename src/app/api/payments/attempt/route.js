// src/app/api/payments/attempt/route.js
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

    const { orderId, cartItems, attemptData } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: "Order ID is required" 
      }, { status: 400 });
    }

    await connectDB();

    const payment = await Payment.logPaymentAttempt(orderId, attemptData);

    return NextResponse.json({
      success: true,
      message: "Payment attempt logged",
      paymentId: payment?._id,
      orderId: orderId,
      status: 'attempted'
    });

  } catch (error) {
    console.error("Error logging payment attempt:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to log payment attempt",
      details: error.message
    }, { status: 500 });
  }
}