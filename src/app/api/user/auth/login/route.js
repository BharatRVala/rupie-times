// src/app/api/user/auth/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, mobile, password } = body;

    // Validate input - user can login with email or mobile
    if (!password || (!email && !mobile)) {
      return NextResponse.json(
        { success: false, message: "Email or mobile and password are required" },
        { status: 400 }
      );
    }

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email }, { mobile }],
    }).select('+password'); // Include password field for verification

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (user.isActive === false) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Your account has been deactivated by the administrator. Please contact support." 
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT token with 1 year expiration - INCLUDING NAME
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name, // ✅ Added name
        role: user.role,
        isActive: user.isActive,
      },
      JWT_SECRET,
      { expiresIn: "365d" } // 1 year expiration
    );

    // Prepare safe user data (excluding password)
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
    };

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userData,
      token,
    });

    // Set secure cookie for token with 1 year expiration - USER_TOKEN
    response.cookies.set("user_token", token, { // ✅ Changed to user_token
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60, // 1 year in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
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