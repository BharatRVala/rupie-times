// src/app/api/admin/users/[id]/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import User from '@/app/lib/models/User';
import DeletedUser from '@/app/lib/models/deletedUser';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import bcrypt from 'bcryptjs';

export async function DELETE(request, { params }) {
  try {
    // Check admin authentication
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    await connectDB();

    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === authResult.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const user = await User.findById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Archive user data
    await DeletedUser.create({
      originalUserId: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      password: user.password,
      role: user.role,
      userData: {
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isActive: user.isActive
      },
      reason: 'Deleted by admin'
    });

    // Delete from Users collection
    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted and archived successfully',
      deletedUser: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);

    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { success: false, error: 'Admin authentication required to delete users' },
        { status: 401 }
      );
    }

    if (error.name === 'CastError') {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete user: ' + error.message
    }, { status: 500 });
  }
}

// ✅ GET - Get single user by ID
export async function GET(request, { params }) {
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

    let user = await User.findById(id).select('-password');

    if (!user) {
      // Try to find in DeletedUser collection by originalUserId OR by its own _id
      // The admin list returns DeletedUser._id, so we need to check that too
      let deletedUser = await DeletedUser.findOne({ originalUserId: id });

      if (!deletedUser) {
        deletedUser = await DeletedUser.findById(id);
      }

      if (deletedUser) {
        // Map deleted user to standard user structure
        user = {
          _id: deletedUser.originalUserId,
          name: deletedUser.name,
          email: deletedUser.email,
          mobile: deletedUser.mobile,
          role: deletedUser.role,
          address: deletedUser.userData?.address || {},
          isActive: false,
          createdAt: deletedUser.userData?.createdAt,
          updatedAt: deletedUser.userData?.updatedAt,
          isDeleted: true
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
    }

    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      address: user.address,
      isActive: user.isActive,
      isDeleted: user.isDeleted || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Fetch user subscriptions
    const { default: Subscription } = await import('@/app/lib/models/Subscription');
    const { default: Product } = await import('@/app/lib/models/product'); // Correct import

    const subscriptions = await Subscription.find({ user: id })
      .populate({
        path: 'product',
        select: 'heading shortDescription filename category',
        model: Product
      })
      .sort({ createdAt: -1 });

    const formattedSubscriptions = subscriptions.map(sub => {
      const now = new Date();
      const endDate = new Date(sub.endDate);
      const daysIncludingToday = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

      return {
        id: sub._id.toString(),
        name: sub.product?.heading || 'Unknown Product',
        description: sub.product?.shortDescription || '',
        category: sub.product?.category || 'Uncategorized',
        image: sub.product?.filename ? `/api/user/products/image/${sub.product.filename}` : '/assets/product.svg',
        price: `₹${sub.variant?.price || 0}`,
        startDate: sub.startDate,
        endDate: sub.endDate,
        daysLeft: daysIncludingToday > 0 ? `${daysIncludingToday} Days` : 'Expired',
        status: (daysIncludingToday > 0)
          ? ((daysIncludingToday <= 10 || sub.status === 'expiresoon') ? 'Expiring Soon' : 'Active')
          : 'Expired',
        rawStatus: sub.status,
        createdAt: sub.createdAt,
        variant: sub.variant
      };
    });

    // ✅ Inject Trial Subscription if available
    if (user.trial && user.trial.startDate) {
      const now = new Date();
      const trialEnd = new Date(user.trial.endDate);
      const isTrialActive = trialEnd > now;
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

      const trialSubscription = {
        id: `TRIAL_${user._id.toString()}`,
        name: 'Trial Activation',
        description: '7-Day Free Trial Access',
        category: 'Trial',
        image: '/assets/sharp.svg', // Placeholder or specific trial asset
        price: '₹0',
        startDate: user.trial.startDate,
        endDate: user.trial.endDate,
        daysLeft: isTrialActive ? `${daysLeft} Days` : 'Expired',
        status: isTrialActive ? 'Active' : 'Expired',
        rawStatus: isTrialActive ? 'active' : 'expired',
        createdAt: user.trial.startDate,
        variant: { duration: '7 Days', price: 0 }
      };

      // Add to the beginning of the list
      formattedSubscriptions.unshift(trialSubscription);
    }

    return NextResponse.json({
      success: true,
      user: { ...userResponse, subscribedProducts: formattedSubscriptions },
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to access user details'
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
      error: 'Failed to fetch user: ' + error.message
    }, { status: 500 });
  }
}

// ✅ PUT - Update user
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
    const body = await request.json();

    const {
      name,
      email,
      mobile,
      address,
      isActive,
      password,
      trial // ✅ NEW: Allow updating trial from admin
    } = body;

    // Prevent admin from modifying their own status
    if (id === authResult.id && isActive !== undefined) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify your own status' },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Build update object
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (mobile !== undefined) updateFields.mobile = mobile;
    if (address !== undefined) updateFields.address = address;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // ✅ Handle Trial Updates & Notifications
    if (trial) {
      updateFields.trial = { ...currentUser.trial, ...trial };

      try {
        const Notification = (await import('@/app/lib/models/Notification')).default;

        // Check for Activation
        if (trial.isUsed === true && currentUser.trial?.isUsed !== true) {
          await Notification.create({
            title: "Free Trial Active",
            message: "Your free trial has been activated by an administrator.",
            userId: currentUser._id,
            notificationType: "trial_active",
            isBroadcast: false,
            isRead: false
          });
        }

        // Check for Expiration (Manual Date Change to Past)
        if (trial.endDate) {
          const newEnd = new Date(trial.endDate);
          const oldEnd = currentUser.trial?.endDate ? new Date(currentUser.trial.endDate) : null;
          const now = new Date();

          if (newEnd < now && (!oldEnd || oldEnd > now)) {
            // Trial was active, now expired
            await Notification.create({
              title: "Trial Expired",
              message: "Your free trial has been expired by an administrator.",
              userId: currentUser._id,
              notificationType: "trial_expired",
              isBroadcast: false,
              isRead: false
            });

            // Set flag so auto-checker doesn't duplicate
            updateFields.trial.expirationNotified = true;
          }
        }
      } catch (notifErr) {
        console.error("Error creating admin trial notification:", notifErr);
      }
    }

    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }

    updateFields.updatedAt = new Date();
    updateFields.updatedBy = authResult.email;

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
      address: user.address,
      isActive: user.isActive,
      trial: user.trial, // Include trial in response
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse,
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);

    // ✅ Handle authentication errors specifically
    if (error?.message?.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to update users'
        },
        { status: 401 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'Validation error: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update user: ' + error.message
    }, { status: 500 });
  }
}