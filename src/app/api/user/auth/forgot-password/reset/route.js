import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import PasswordReset from "@/app/lib/models/PasswordReset";
import { sendPasswordResetSuccessEmail } from "@/app/lib/utils/resend";
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, token, newPassword, confirmPassword } = body;

    // Validate input
    if (!email || !token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate password
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, message: "Passwords do not match" },
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
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset token"
        },
        { status: 400 }
      );
    }

    // Update user password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Mark reset record as used
    resetRecord.used = true;
    await resetRecord.save();

    // Send success email
    try {
      await sendPasswordResetSuccessEmail(user.email, user.name);
      // console.log(`✅ Password reset success email sent to ${user.email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send success email:", emailError);
      // Don't fail the reset if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("❌ Password reset error:", error);
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