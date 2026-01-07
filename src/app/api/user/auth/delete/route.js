// src/app/api/user/delete/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import User from "@/app/lib/models/User";
import { authenticateUser } from "@/app/lib/middleware/auth"; // ✅ Use auth middleware

export async function DELETE(req) {
  try {
    await connectDB();

    // ✅ Use auth middleware instead of manual token verification
    const userAuth = authenticateUser(req);

    // Find and delete user
    const deletedUser = await User.findByIdAndDelete(userAuth.id);
    
    if (!deletedUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });

    // ✅ Clear the correct cookie name (user_token instead of token)
    response.cookies.set("user_token", "", { // ✅ Changed to user_token
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Delete error:", error);
    
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