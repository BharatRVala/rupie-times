// src/app/api/admin/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Clear admin cookie
    const response = NextResponse.json({
      success: true,
      message: "Admin logged out successfully",
    });

    // Clear cookie by setting it to expire
    response.cookies.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // ✅ Use maxAge: 0 instead of expires for consistency
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}