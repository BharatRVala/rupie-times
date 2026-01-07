import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import PasswordReset from "@/app/lib/models/PasswordReset";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, otp, token } = body;

    // Validate input
    if (!email || !otp || !token) {
      return NextResponse.json(
        { success: false, message: "Email, OTP, and token are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    // Find password reset record
    const resetRecord = await PasswordReset.findOne({
      email: user.email,
      otp,
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });
    
    if (!resetRecord) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid or expired OTP" 
        },
        { status: 400 }
      );
    }
    
    // Check attempts
    if (resetRecord.attempts >= 5) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Too many OTP attempts. Please request a new OTP." 
        },
        { status: 400 }
      );
    }
    
    // Increment attempts and save
    resetRecord.attempts += 1;
    await resetRecord.save();
    
    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      data: {
        email: user.email,
        token: resetRecord.token,
        verified: true,
      },
    });
  } catch (error) {
    console.error("❌ OTP verification error:", error);
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