// src/app/api/user/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Clear user cookie
    const response = NextResponse.json({
      success: true,
      message: "User logged out successfully",
    });

    // ✅ Remove the correct cookie name (user_token instead of token)
    response.cookies.set("user_token", "", { // ✅ Changed to user_token
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("User logout error:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}