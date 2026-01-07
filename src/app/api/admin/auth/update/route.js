// src/app/api/admin/auth/update/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateAdmin } from "@/app/lib/middleware/auth";

export async function PUT(req) {
  try {
    await connectDB();

    // ✅ Authenticate admin
    const adminAuth = authenticateAdmin(req);
    if (!adminAuth.success) {
      return NextResponse.json(
        { success: false, message: adminAuth.error },
        { status: adminAuth.status }
      );
    }

    const body = await req.json();
    const { name, email, mobile, password, role } = body;

    // ✅ PREVENT ROLE CHANGING - Role is immutable
    if (role && role !== adminAuth.role) {
      return NextResponse.json(
        { success: false, message: "Role cannot be changed" },
        { status: 403 }
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

    // Check if email or mobile already exists (excluding current admin)
    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: adminAuth.id } });
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: "Email already exists" },
          { status: 400 }
        );
      }
    }

    if (mobile && mobile !== admin.mobile) {
      const existingMobile = await Admin.findOne({ mobile, _id: { $ne: adminAuth.id } });
      if (existingMobile) {
        return NextResponse.json(
          { success: false, message: "Mobile number already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data (EXCLUDE ROLE)
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;

    // Update password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update admin (role is excluded from update)
    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminAuth.id,
      updateData,
      { new: true, runValidators: true }
    );

    // Prepare response data
    const adminData = {
      id: updatedAdmin._id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      mobile: updatedAdmin.mobile,
      role: updatedAdmin.role,
      isActive: updatedAdmin.isActive,
      permissions: updatedAdmin.permissions,
      lastLogin: updatedAdmin.lastLogin
    };

    return NextResponse.json({
      success: true,
      message: "Admin profile updated successfully",
      admin: adminData,
    });

  } catch (error) {
    console.error("Admin update error:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Email or mobile number already exists" 
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