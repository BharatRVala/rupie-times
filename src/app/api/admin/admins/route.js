// src/app/api/admin/admins/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateSuperAdmin } from "@/app/lib/middleware/auth";

export async function GET(req) {
  try {
    await connectDB();

    // ✅ ONLY SUPER ADMIN CAN ACCESS ALL ADMINS
    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const role = searchParams.get('role'); // 'admin' or 'super_admin'
    const isActive = searchParams.get('isActive'); // 'true' or 'false'
    const search = searchParams.get('search'); // search in name, email, mobile

    // Build filter object
    const filter = {};
    
    // Filter by role
    if (role && ['admin', 'super_admin'].includes(role)) {
      filter.role = role;
    }
    
    // Filter by active status
    if (isActive !== null) {
      filter.isActive = isActive === 'true';
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalAdmins = await Admin.countDocuments(filter);
    const totalPages = Math.ceil(totalAdmins / limit);

    // Get admins with pagination and population
    const admins = await Admin.find(filter)
      .select('-password -loginAttempts -lockUntil') // Exclude sensitive fields
      .populate('createdBy', 'name email') // Populate creator info
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain objects

    // Transform data for response
    const adminsData = admins.map(admin => ({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      mobile: admin.mobile,
      role: admin.role,
      permissions: admin.permissions,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdBy: admin.createdBy ? {
        id: admin.createdBy._id,
        name: admin.createdBy.name,
        email: admin.createdBy.email
      } : null,
      notes: admin.notes,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    }));

    return NextResponse.json({
      success: true,
      admins: adminsData,
      pagination: {
        currentPage: page,
        totalPages,
        totalAdmins,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Get admins error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Server error while fetching admins",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: POST method to create admin (if you want to keep it separate from auth/register)
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
    const { name, email, mobile, password, role, permissions, notes } = body;

    // Validate required fields
    if (!name || !email || !mobile || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Name, email, mobile, password and role are required" },
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
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = await Admin.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role,
      permissions: permissions || {},
      notes,
      createdBy: superAdminAuth.id,
    });

    // Return admin data without sensitive fields
    const adminData = {
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      mobile: newAdmin.mobile,
      role: newAdmin.role,
      permissions: newAdmin.permissions,
      isActive: newAdmin.isActive,
      notes: newAdmin.notes,
      createdBy: newAdmin.createdBy,
      createdAt: newAdmin.createdAt
    };

    return NextResponse.json({
      success: true,
      message: `${role === 'super_admin' ? 'Super Admin' : 'Admin'} created successfully`,
      admin: adminData,
    }, { status: 201 });

  } catch (error) {
    console.error("Create admin error:", error);
    
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
      { 
        success: false, 
        message: "Server error while creating admin",
        error: error.message 
      },
      { status: 500 }
    );
  }
}