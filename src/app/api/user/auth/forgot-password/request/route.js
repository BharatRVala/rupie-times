import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import PasswordReset from "@/app/lib/models/PasswordReset";
import { sendOTPEmail } from "@/app/lib/utils/resend";
import crypto from 'crypto';

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email } = body;

    // Validate email
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive an OTP shortly.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Account is deactivated. Please contact support."
        },
        { status: 403 }
      );
    }

    // Generate OTP and token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');

    // Invalidate any existing OTPs for this email
    await PasswordReset.updateMany(
      { email: user.email, used: false },
      { used: true }
    );

    // Create new reset record
    await PasswordReset.create({
      email: user.email,
      otp,
      token,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP email using Resend
    try {
      await sendOTPEmail(user.email, otp, user.name);

      // In production, you might want to log this
      // console.log(`✅ OTP sent to ${user.email}: ${otp}`);

      // For development, include OTP in response
      const isDevelopment = process.env.NODE_ENV === 'development';

      return NextResponse.json({
        success: true,
        message: "OTP sent successfully to your email.",
        data: {
          email: user.email,
          token,
          ...(isDevelopment && { otp }),
        },
      });
    } catch (emailError) {
      console.error("❌ Failed to send OTP email:", emailError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send OTP email. Please try again later."
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: error.message
      },
      { status: 500 }
    );
  }
}