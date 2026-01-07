// src/app/api/payments/pending/route.js
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

    const { orderId, cartItems, reason = 'Payment flow interrupted' } = await req.json();

    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: "Order ID is required"
      }, { status: 400 });
    }

    await connectDB();

    // Calculate amount from cart items
    const amount = cartItems.reduce((total, item) => total + (Number(item.price) || 0), 0);
    const totalAmount = amount + (amount * 0.18); // Include tax

    // Log pending payment
    const payment = await Payment.logPendingPayment(
      orderId,
      totalAmount,
      authResult.id,
      cartItems
    );

    return NextResponse.json({
      success: true,
      message: "Pending payment logged",
      paymentId: payment?._id,
      orderId: orderId,
      reason: reason
    });

  } catch (error) {
    console.error("Error logging pending payment:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to log pending payment",
      details: error.message
    }, { status: 500 });
  }
}