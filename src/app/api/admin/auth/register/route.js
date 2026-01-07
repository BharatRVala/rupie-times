// src/app/api/admin/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateSuperAdmin } from "@/app/lib/middleware/auth";

export async function POST(req) {
  try {
    await connectDB();

    // ✅ ONLY SUPER ADMIN CAN CREATE ADMINS
    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    const body = await req.json();
    const { name, email, mobile, password, role } = body;

    // Validate input
    if (!name || !email || !mobile || !password || !role) {
      return NextResponse.json(
        { success: false, message: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role selected" },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { mobile }],
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin with this email or mobile already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin with createdBy reference
    const newAdmin = await Admin.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role,
      createdBy: superAdminAuth.id, // Track who created this admin
    });

    // ✅ REMOVED: Token generation and cookie setting
    // The new admin should login separately to get their own token

    const adminData = {
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      mobile: newAdmin.mobile,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      permissions: newAdmin.permissions,
      createdBy: newAdmin.createdBy,
      createdAt: newAdmin.createdAt
    };

    // ✅ UPDATED: Return response without token and cookies
    return NextResponse.json({
      success: true,
      message: `${role === 'super_admin' ? 'Super Admin' : 'Admin'} created successfully`,
      admin: adminData,
    });

  } catch (error) {
    console.error("Admin registration error:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Admin with this email or mobile already exists" 
        },
        { status: 400 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, message: "Validation error", errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}