// src/app/api/admin/users/[id]/status/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function PUT(request, { params }) {
  try {
    // ✅ Check admin authentication with new pattern
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error 
        }, 
        { status: authResult.status }
      );
    }

    await connectDB();
    
    const { id } = await params;
    const { isActive } = await request.json();

    // Validate request body
    if (isActive === undefined || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive field is required and must be a boolean' },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating themselves
    if (id === authResult.id && !isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    console.log(`Updating user ${id} status to:`, isActive);

    // Find the user first to verify existence
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user status
    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: Boolean(isActive),
        updatedAt: new Date(),
        updatedBy: authResult.email
      },
      { new: true, runValidators: true }
    ).select('-password');

    console.log('Updated user:', user);

    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: userResponse,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    
    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to update user status' 
        },
        { status: 401 }
      );
    }
    
    // Handle invalid ID format
    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update user status: ' + error.message
    }, { status: 500 });
  }
}

// ✅ PATCH - Alternative method for status update
export async function PATCH(request, { params }) {
  try {
    // ✅ Check admin authentication with new pattern
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error 
        }, 
        { status: authResult.status }
      );
    }

    await connectDB();
    
    const { id } = await params;
    const body = await request.json();

    // Allow partial updates for status
    const updateFields = {};
    if (body.isActive !== undefined) {
      updateFields.isActive = Boolean(body.isActive);
    }
    
    // Add tracking fields
    updateFields.updatedAt = new Date();
    updateFields.updatedBy = authResult.email;

    // Prevent admin from deactivating themselves
    if (id === authResult.id && updateFields.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      address: user.address,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: userResponse,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    
    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Admin authentication required to update user status' 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update user status: ' + error.message
    }, { status: 500 });
  }
}