// src/app/api/admin/admins/[id]/status/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateSuperAdmin } from "@/app/lib/middleware/auth";

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    // ✅ ONLY SUPER ADMIN CAN UPDATE ADMIN STATUS
    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    // ✅ FIX: Await the params promise
    const { id } = await params;

    const body = await req.json();
    const { isActive } = body;

    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    // ✅ PREVENT SELF-DEACTIVATION
    if (admin._id.toString() === superAdminAuth.id && isActive === false) {
      return NextResponse.json(
        { success: false, message: "Cannot deactivate your own account" },
        { status: 403 }
      );
    }

    // Update admin status
    admin.isActive = isActive;
    await admin.save();

    return NextResponse.json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    console.error("Update admin status error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Server error while updating admin status",
        error: error.message 
      },
      { status: 500 }
    );
  }
}