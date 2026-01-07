// src/app/api/user/auth/register/route.js
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
    const { 
      name, 
      email, 
      mobile, 
      password
    } = body;

    // Validate required fields
    if (!name || !email || !mobile || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, mobile and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists by email or mobile
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User with this email or mobile number already exists" 
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with only basic information
    const newUser = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
    });

    // Generate JWT token with 1 year expiration - INCLUDING NAME
    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name, // ✅ Added name
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "365d" } // 1 year expiration
    );

    // Prepare safe user data (excluding password)
    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
    };

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
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
    console.error("Registration error:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User with this email or mobile already exists" 
        },
        { status: 400 }
      );
    }
    
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