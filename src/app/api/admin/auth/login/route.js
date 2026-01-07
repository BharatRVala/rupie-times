// src/app/api/admin/auth/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ FIXED: Use findOne with password selection instead of static method
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: "Admin account is deactivated" },
        { status: 401 }
      );
    }

    // Check if account is locked using virtual method
    const isLocked = admin.lockUntil && admin.lockUntil > Date.now();
    if (isLocked) {
      return NextResponse.json(
        {
          success: false,
          message: "Account is temporarily locked due to multiple failed login attempts"
        },
        { status: 423 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      // Increment login attempts on failed login
      let updates = { $inc: { loginAttempts: 1 } };

      // Lock the account if we've reached max attempts
      if (admin.loginAttempts + 1 >= 5) {
        updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // 2 hours
      }

      await Admin.findByIdAndUpdate(admin._id, updates);

      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0 || admin.lockUntil) {
      await Admin.findByIdAndUpdate(
        admin._id,
        {
          $set: { loginAttempts: 0 },
          $unset: { lockUntil: 1 }
        }
      );
    }

    // Update last login
    await Admin.findByIdAndUpdate(admin._id, {
      lastLogin: new Date()
    });

    // Generate JWT token with permissions
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        name: admin.name || 'Admin',
        role: admin.role,
        permissions: admin.permissions
      },
      ADMIN_JWT_SECRET,
      { expiresIn: "365d" }
    );

    // Prepare safe admin data with permissions
    const adminData = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      role: admin.role,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      permissions: admin.permissions,
      createdAt: admin.createdAt
    };

    // Create response
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      admin: adminData,
      token,
    });

    // Set secure cookie - ADMIN_TOKEN
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
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