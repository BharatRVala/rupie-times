// src/app/api/user/auth/profile/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import { authenticateUser } from "@/app/lib/middleware/auth"; // ✅ Use auth middleware

export async function GET(req) {
  try {
    await connectDB();

    // ✅ Use auth middleware instead of manual token verification
    const userAuth = authenticateUser(req);

    // Find user
    const user = await User.findById(userAuth.id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Prepare safe user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      user: userData,
    });

  } catch (error) {
    console.error("Profile error:", error);
    
    // Handle authentication errors
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
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