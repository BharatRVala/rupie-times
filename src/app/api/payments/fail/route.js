// src/app/api/payments/fail/route.js
import { NextResponse } from "next/server";
import connectDB from '@/app/lib/utils/dbConnect';
import Payment from '@/app/lib/models/Payment';

export async function POST(req) {
  try {
    const { orderId, cartItems, errorData, reason = 'Payment failed' } = await req.json();
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: "Order ID is required" 
      }, { status: 400 });
    }

    await connectDB();

    // Log payment failure
    const payment = await Payment.logPaymentFailure(orderId, errorData, cartItems);

    return NextResponse.json({
      success: true,
      message: "Payment failure logged",
      paymentId: payment?._id,
      orderId: orderId,
      reason: reason,
      errorDetails: errorData
    });

  } catch (error) {
    console.error("Error logging payment failure:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to log payment failure",
      details: error.message
    }, { status: 500 });
  }
}