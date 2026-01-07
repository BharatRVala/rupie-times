// src/app/api/admin/notifications/route.js - COMPLETE BROADCAST VERSION
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import Notification from '@/app/lib/models/Notification';

export async function GET(request) {
  try {
    // console.log('📋 [Admin API] Fetching broadcast notifications');

    await dbConnect();
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // console.log(`   Authenticated admin: ${auth.name} (${auth.role})`);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const adminId = searchParams.get('adminId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get ONLY broadcast notifications
    const result = await Notification.getBroadcastNotifications({
      page,
      limit,
      adminId: adminId || null, // ✅ Fix: Show ALL broadcasts if no specific ID requested
      startDate,
      endDate
    });

    // console.log(`✅ Found ${result.notifications.length} broadcast notifications`);

    return NextResponse.json({
      success: true,
      data: result.notifications,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: result.pages
      }
    });

  } catch (error) {
    console.error('❌ Error fetching broadcast notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch broadcast notifications',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create BROADCAST notification (ONE document for all users)
export async function POST(request) {
  try {
    // console.log('📢 [Admin API] Creating broadcast notification');

    await dbConnect();
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // console.log(`   Authenticated admin: ${auth.name} (${auth.id})`);

    const body = await request.json();
    const { title, message, notificationType = 'general', targetAudience = 'all', productId } = body;

    // console.log('📥 Request data:', {
    //   title,
    //   messageLength: message?.length || 0,
    //   notificationType,
    //   targetAudience
    // });

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be less than 200 characters' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Create ONE broadcast notification
    const broadcastNotification = await Notification.createAdminBroadcastNotification({
      title,
      message,
      adminId: auth.id,
      notificationType,
      targetAudience,
      targetProductId: productId
    });

    if (!broadcastNotification) {
      return NextResponse.json(
        { error: 'Failed to create broadcast notification' },
        { status: 500 }
      );
    }

    // console.log(`✅ Broadcast notification created: ${broadcastNotification._id}`);

    return NextResponse.json({
      success: true,
      message: 'Broadcast notification created successfully',
      data: broadcastNotification,
      count: 1 // Only 1 document created
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating broadcast notification:', error);
    return NextResponse.json(
      {
        error: 'Failed to create broadcast notification: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete broadcast notifications
export async function DELETE(request) {
  try {
    // console.log('🗑️ [Admin API] Deleting broadcast notification(s)');

    await dbConnect();
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { notificationIds, olderThanDays } = body;

    let query = {
      isBroadcast: true, // Only broadcast notifications
      sentBy: auth.id // Only notifications created by this admin
    };

    if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      query.createdAt = { $lt: cutoffDate };
    }

    const result = await Notification.deleteMany(query);

    // console.log(`✅ Deleted ${result.deletedCount} broadcast notifications`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} broadcast notification(s)`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error deleting broadcast notifications:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete broadcast notifications',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH - Update broadcast notification (optional)
export async function PATCH(request) {
  try {
    // console.log('✏️ [Admin API] Updating broadcast notification');

    await dbConnect();
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { notificationId, title, message } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Find the broadcast notification
    const notification = await Notification.findOne({
      _id: notificationId,
      isBroadcast: true,
      sentBy: auth.id // Only creator can update
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Broadcast notification not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (title !== undefined) {
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'Title must be less than 200 characters' },
          { status: 400 }
        );
      }
      notification.title = title;
    }

    if (message !== undefined) {
      if (message.length > 1000) {
        return NextResponse.json(
          { error: 'Message must be less than 1000 characters' },
          { status: 400 }
        );
      }
      notification.message = message;
    }

    await notification.save();

    // console.log(`✅ Broadcast notification updated: ${notificationId}`);

    return NextResponse.json({
      success: true,
      message: 'Broadcast notification updated successfully',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error updating broadcast notification:', error);
    return NextResponse.json(
      {
        error: 'Failed to update broadcast notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}