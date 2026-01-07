// src/app/api/user/auth/update/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import { authenticateUser } from "@/app/lib/middleware/auth";

export async function PUT(req) {
  try {
    await connectDB();

    // ✅ Check authentication first
    const userAuth = authenticateUser(req);
    if (!userAuth.success) {
      return NextResponse.json(
        { success: false, message: userAuth.error },
        { status: userAuth.status }
      );
    }

    const body = await req.json();
    const { name, email, mobile, password } = body;

    // ✅ Remove any role field from body to prevent manipulation
    delete body.role;

    // Find user
    const user = await User.findById(userAuth.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Check if email or mobile already exists (excluding current user)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        email,
        _id: { $ne: userAuth.id }
      });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 400 }
        );
      }
    }

    if (mobile && mobile !== user.mobile) {
      const existingMobile = await User.findOne({
        mobile,
        _id: { $ne: userAuth.id }
      });
      if (existingMobile) {
        return NextResponse.json(
          { success: false, message: "Mobile number already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data - only allowed fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;

    // Update password if provided
    if (password) {

      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userAuth.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from response

    // Prepare response data
    const userData = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      mobile: updatedUser.mobile,
      role: updatedUser.role,
    };

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: userData,
    });

  } catch (error) {
    console.error("Update error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = error.keyPattern?.email ? 'Email' : 'Mobile number';
      console.error(`Duplicate key error: ${field}`);
      return NextResponse.json(
        {
          success: false,
          message: `${field} already exists`
        },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      console.error(`Validation error: ${messages}`);
      return NextResponse.json(
        {
          success: false,
          message: messages
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