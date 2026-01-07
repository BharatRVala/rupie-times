// src/app/api/admin/admins/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/utils/dbConnect";
import Admin from "@/app/lib/models/Admin";
import { authenticateSuperAdmin } from "@/app/lib/middleware/auth";

// GET single admin
export async function GET(req, { params }) {
  try {
    await connectDB();

    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    // ✅ FIX: Await the params promise
    const { id } = await params;

    const admin = await Admin.findById(id)
      .select('-password -loginAttempts -lockUntil')
      .populate('createdBy', 'name email');

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        notes: admin.notes,
        createdBy: admin.createdBy,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });

  } catch (error) {
    console.error("Get admin error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while fetching admin",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// DELETE admin
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    // ✅ ONLY SUPER ADMIN CAN DELETE ADMINS
    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    // ✅ FIX: Await the params promise
    const { id } = await params;

    // Check if admin exists
    const adminToDelete = await Admin.findById(id);
    if (!adminToDelete) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    // ✅ PREVENT SELF-DELETION
    if (adminToDelete._id.toString() === superAdminAuth.id) {
      return NextResponse.json(
        { success: false, message: "Cannot delete your own account" },
        { status: 403 }
      );
    }

    // Delete the admin
    await Admin.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "Admin deleted successfully",
    });

  } catch (error) {
    console.error("Delete admin error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while deleting admin",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// PUT - Update full admin details
export async function PUT(req, { params }) {
  try {
    await connectDB();

    // ✅ ONLY SUPER ADMIN CAN UPDATE ADMIN DETAILS
    const superAdminAuth = authenticateSuperAdmin(req);
    if (!superAdminAuth.success) {
      return NextResponse.json(
        { success: false, message: superAdminAuth.error },
        { status: superAdminAuth.status }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, mobile, role, password, notes } = body;

    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    // Check for duplicates (email/mobile) excluding current admin
    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 });
      }
    }
    if (mobile && mobile !== admin.mobile) {
      const existingMobile = await Admin.findOne({ mobile, _id: { $ne: id } });
      if (existingMobile) {
        return NextResponse.json({ success: false, message: "Mobile already exists" }, { status: 400 });
      }
    }

    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (mobile) admin.mobile = mobile;
    if (role) admin.role = role;
    if (notes) admin.notes = notes;

    // Update password if provided
    if (password && password.trim() !== "") {
      const bcrypt = await import('bcryptjs');
      admin.password = await bcrypt.hash(password, 10);
    }

    await admin.save();

    return NextResponse.json({
      success: true,
      message: "Admin updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        mobile: admin.mobile,
        role: admin.role,
        isActive: admin.isActive,
        updatedAt: admin.updatedAt
      }
    });

  } catch (error) {
    console.error("Update admin error:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update admin status
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