// src/app/api/admin/auth/profile/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateAdmin } from "@/app/lib/middleware/auth";

export async function GET(req) {
  try {
    await connectDB();

    // ✅ Use auth middleware instead of manual token verification
    const adminAuth = authenticateAdmin(req);
    
    // ✅ ADDED: Check if authentication was successful
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, message: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    // Find admin
    const admin = await Admin.findById(adminAuth.id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    // ✅ UPDATED: Prepare safe admin data with permissions
    const adminData = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      role: admin.role,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      permissions: admin.permissions, // ✅ ADDED permissions
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    return NextResponse.json({
      success: true,
      admin: adminData,
    });

  } catch (error) {
    console.error("Admin profile error:", error);
    
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