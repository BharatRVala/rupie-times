// src/app/api/admin/auth/delete/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateAdmin } from "@/app/lib/middleware/auth"; // ✅ Use auth middleware

export async function DELETE(req) {
  try {
    await connectDB();

    // ✅ Use auth middleware instead of manual token verification
    const adminAuth = authenticateAdmin(req);

    // Find and delete admin
    const deletedAdmin = await Admin.findByIdAndDelete(adminAuth.id);
    
    if (!deletedAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      success: true,
      message: "Admin account deleted successfully",
    });

    // Clear the admin token cookie
    response.cookies.set("admin_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Admin delete error:", error);
    
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