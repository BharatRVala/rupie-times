// src/app/api/user/notifications/route.js - COMPLETE BROADCAST SUPPORT
import { NextResponse } from 'next/server';
import { authenticateUser } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import Notification from '@/app/lib/models/Notification';

import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
// ✅ Load Admin model to ensure it's available for populate
import '@/app/lib/models/Admin';

/**
 * ✅ Centralized helper to calculate all subscription-based audience metrics and ranges.
 * Ensures consistency across GET, POST, and DELETE endpoints.
 */
async function getUserSubscriptionMetrics(userId, currentDate) {
  // Fetch ALL completed subscriptions
  const allSubscriptions = await Subscription.find({
    user: userId,
    paymentStatus: 'completed'
  }).select('status startDate endDate product').lean();

  const userAudiences = ['all', 'general'];
  const EXPIRING_SOON_DAYS = 10;

  // 1. Calculate Active vs Expiring Soon Ranges (Temporal Separation)
  const activeSubscriptionRanges_Raw = [];
  const expiresoonSubscriptionRanges_Raw = [];

  allSubscriptions.forEach(sub => {
    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);
    const soonStart = new Date(end);
    soonStart.setDate(soonStart.getDate() - EXPIRING_SOON_DAYS);

    // If sub duration < 10 days, it's effectively expiresoon from day 1
    const actualSoonStart = soonStart < start ? start : soonStart;

    // Active Range: From start until it starts expiring
    if (start < actualSoonStart) {
      activeSubscriptionRanges_Raw.push({ startDate: start, endDate: actualSoonStart });
    }

    // Expiring Soon Range: From the 10-day mark until the end
    expiresoonSubscriptionRanges_Raw.push({ startDate: actualSoonStart, endDate: end });
  });

  // Sort and Merge Active Ranges
  activeSubscriptionRanges_Raw.sort((a, b) => a.startDate - b.startDate);
  const activeSubscriptionRanges = [];
  if (activeSubscriptionRanges_Raw.length > 0) {
    let current = activeSubscriptionRanges_Raw[0];
    for (let i = 1; i < activeSubscriptionRanges_Raw.length; i++) {
      const next = activeSubscriptionRanges_Raw[i];
      if (next.startDate <= current.endDate) {
        if (next.endDate > current.endDate) current.endDate = next.endDate;
      } else {
        activeSubscriptionRanges.push(current);
        current = next;
      }
    }
    activeSubscriptionRanges.push(current);
  }

  // Sort and Merge Expiring Soon Ranges
  expiresoonSubscriptionRanges_Raw.sort((a, b) => a.startDate - b.startDate);
  const expiresoonSubscriptionRanges = [];
  if (expiresoonSubscriptionRanges_Raw.length > 0) {
    let current = expiresoonSubscriptionRanges_Raw[0];
    for (let i = 1; i < expiresoonSubscriptionRanges_Raw.length; i++) {
      const next = expiresoonSubscriptionRanges_Raw[i];
      if (next.startDate <= current.endDate) {
        if (next.endDate > current.endDate) current.endDate = next.endDate;
      } else {
        expiresoonSubscriptionRanges.push(current);
        current = next;
      }
    }
    expiresoonSubscriptionRanges.push(current);
  }

  // 4. Calculate Per-Product Ranges
  const productActiveRanges = {};
  const productExpiredRanges = {};
  const productExpiresoonRanges = {};

  const subByProduct = allSubscriptions.reduce((acc, sub) => {
    if (!sub.product) return acc;
    const pid = sub.product.toString();
    const endDate = new Date(sub.endDate);
    const soonStart = new Date(endDate);
    soonStart.setDate(soonStart.getDate() - EXPIRING_SOON_DAYS);
    const actualSoonStart = soonStart < sub.startDate ? sub.startDate : soonStart;

    // Per-product Active Window (Strictly Active)
    if (sub.startDate < actualSoonStart) {
      if (!productActiveRanges[pid]) productActiveRanges[pid] = [];
      productActiveRanges[pid].push({ startDate: sub.startDate, endDate: actualSoonStart });
    }

    // Per-product Expiring Soon Window
    if (!productExpiresoonRanges[pid]) productExpiresoonRanges[pid] = [];
    productExpiresoonRanges[pid].push({ startDate: actualSoonStart, endDate: sub.endDate });

    // Mark product as having existed for expired calculation later
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push({ startDate: sub.startDate, endDate: sub.endDate });
    return acc;
  }, {});

  // Post-process Per-Product Ranges (Merge & Calculate Expired)
  for (const [pid, totalRanges] of Object.entries(subByProduct)) {
    // Merge Active
    if (productActiveRanges[pid]) {
      productActiveRanges[pid].sort((a, b) => a.startDate - b.startDate);
      const merged = [];
      let current = productActiveRanges[pid][0];
      for (let i = 1; i < productActiveRanges[pid].length; i++) {
        const next = productActiveRanges[pid][i];
        if (next.startDate <= current.endDate) {
          if (next.endDate > current.endDate) current.endDate = next.endDate;
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);
      productActiveRanges[pid] = merged;
    }

    // Merge Expiring Soon
    if (productExpiresoonRanges[pid]) {
      productExpiresoonRanges[pid].sort((a, b) => a.startDate - b.startDate);
      const merged = [];
      let current = productExpiresoonRanges[pid][0];
      for (let i = 1; i < productExpiresoonRanges[pid].length; i++) {
        const next = productExpiresoonRanges[pid][i];
        if (next.startDate <= current.endDate) {
          if (next.endDate > current.endDate) current.endDate = next.endDate;
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);
      productExpiresoonRanges[pid] = merged;
    }

    // Calculate Expired (Gaps between combined active/expiresoon periods)
    totalRanges.sort((a, b) => a.startDate - b.startDate);
    const mergedTotal = [];
    let curTotal = totalRanges[0];
    for (let i = 1; i < totalRanges.length; i++) {
      const next = totalRanges[i];
      if (next.startDate <= curTotal.endDate) {
        if (next.endDate > curTotal.endDate) curTotal.endDate = next.endDate;
      } else {
        mergedTotal.push(curTotal);
        curTotal = next;
      }
    }
    mergedTotal.push(curTotal);

    const expired = [];
    for (let i = 0; i < mergedTotal.length - 1; i++) {
      expired.push({ startDate: mergedTotal[i].endDate, endDate: mergedTotal[i + 1].startDate });
    }
    const last = mergedTotal[mergedTotal.length - 1];
    if (last.endDate < currentDate) {
      expired.push({ startDate: last.endDate, endDate: new Date(8640000000000000) });
    }
    productExpiredRanges[pid] = expired;
  }

  // 5. Global Expired Ranges (Gaps in total subscription history)
  const expiredSubscriptionRanges = [];
  const totalMergedRanges = [];
  const allSorted = allSubscriptions.map(s => ({ start: new Date(s.startDate), end: new Date(s.endDate) })).sort((a, b) => a.start - b.start);
  if (allSorted.length > 0) {
    let current = allSorted[0];
    for (let i = 1; i < allSorted.length; i++) {
      if (allSorted[i].start <= current.end) {
        if (allSorted[i].end > current.end) current.end = allSorted[i].end;
      } else {
        totalMergedRanges.push(current);
        current = allSorted[i];
      }
    }
    totalMergedRanges.push(current);

    for (let i = 0; i < totalMergedRanges.length - 1; i++) {
      expiredSubscriptionRanges.push({ startDate: totalMergedRanges[i].end, endDate: totalMergedRanges[i + 1].start });
    }
    if (totalMergedRanges[totalMergedRanges.length - 1].end < currentDate) {
      expiredSubscriptionRanges.push({ startDate: totalMergedRanges[totalMergedRanges.length - 1].end, endDate: new Date(8640000000000000) });
    }
  }

  // 6. Calculate Product Status Map and Update Global Audiences
  const productStatusMap = {};
  allSubscriptions.forEach(sub => {
    if (!sub.product) return;
    const pid = sub.product.toString();
    const endDate = new Date(sub.endDate);
    const soonStart = new Date(endDate);
    soonStart.setDate(soonStart.getDate() - EXPIRING_SOON_DAYS);
    const actualSoonStart = soonStart < sub.startDate ? sub.startDate : soonStart;

    let effectiveStatus = sub.status;
    if (endDate < currentDate) {
      effectiveStatus = 'expired';
    } else if (currentDate >= actualSoonStart) {
      effectiveStatus = 'expiresoon';
    } else {
      effectiveStatus = 'active';
    }

    const currentStatus = productStatusMap[pid];
    // Priority: active > expiresoon > expired
    if (!currentStatus || (effectiveStatus === 'active') || (effectiveStatus === 'expiresoon' && currentStatus === 'expired')) {
      productStatusMap[pid] = effectiveStatus;
    }
  });

  // ✅ REFINED: Additive Audience Logic
  // A user can be in multiple audiences if they have multiple products in different states
  const statuses = Object.values(productStatusMap);
  if (statuses.some(s => s === 'active')) {
    if (!userAudiences.includes('active')) userAudiences.push('active');
  }
  if (statuses.some(s => s === 'expiresoon')) {
    if (!userAudiences.includes('expiresoon')) userAudiences.push('expiresoon');
  }
  if (statuses.some(s => s === 'expired')) {
    if (!userAudiences.includes('expired')) userAudiences.push('expired');
  }

  return {
    userAudiences,
    activeSubscriptionRanges,
    expiredSubscriptionRanges,
    expiresoonSubscriptionRanges,
    productActiveRanges,
    productExpiredRanges,
    productExpiresoonRanges,
    productStatusMap
  };
}

// GET - Get notifications (including broadcasts)
export async function GET(request) {
  try {
    const currentDate = new Date();
    // console.log('� [User API] Fetching notifications');

    await dbConnect();
    const auth = authenticateUser(request);
    if (!auth.success) {
      console.error('❌ User authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // console.log(`   User ID: ${auth.id}`);

    // ✅ AUTO-CHECK: Check for subscription status updates (expired/expiresoon)
    // This ensures users get notifications even if they don't visit the subscription page
    try {
      const { SubscriptionNotifier } = await import('@/app/lib/utils/subscriptionNotifier');
      await SubscriptionNotifier.checkUserSubscriptions(auth.id);
    } catch (checkError) {
      console.error('⚠️ Error auto-checking user subscriptions:', checkError);
      // Continue execution - don't fail notification fetch just because update failed
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const showUnreadOnly = searchParams.get('unread') === 'true';
    let notificationType = searchParams.get('type') || searchParams.get('notificationType');

    // Handle comma-separated notification types
    if (notificationType && notificationType.includes(',')) {
      notificationType = notificationType.split(',').map(t => t.trim());
    }

    // console.log(`   Parameters: page=${page}, limit=${limit}, unread=${showUnreadOnly}, type=${notificationType}`);

    // ✅ NEW: Determine User Audiences and Subscription Ranges using centralized helper
    const {
      userAudiences,
      activeSubscriptionRanges,
      expiredSubscriptionRanges,
      expiresoonSubscriptionRanges,
      productActiveRanges,
      productExpiredRanges,
      productExpiresoonRanges,
      productStatusMap
    } = await getUserSubscriptionMetrics(auth.id, currentDate);

    // ✅ NEW: Get User Created Date to filter old broadcasts
    const user = await User.findById(auth.id).select('createdAt').lean();
    const userCreatedAt = user ? user.createdAt : new Date(0); // Fallback to epoch if not found

    // Get user notifications (including broadcasts)
    const result = await Notification.getUserNotifications(auth.id, {
      page,
      limit,
      showUnreadOnly,
      notificationType,
      userAudiences, // ✅ Pass audiences to model
      userCreatedAt, // ✅ Pass registration date
      activeSubscriptionRanges, // ✅ Pass OPTIMIZED subscription history for time-range filtering
      expiredSubscriptionRanges, // ✅ NEW: Pass historical expired ranges
      expiresoonSubscriptionRanges, // ✅ NEW: Pass historical expiresoon ranges
      productActiveRanges, // ✅ Pass per-product active ranges
      productExpiredRanges, // ✅ NEW: Pass per-product expired ranges
      productExpiresoonRanges, // ✅ NEW: Pass per-product expiresoon ranges
      productStatusMap // ✅ NEW: Pass current product statuses
    });

    // console.log(`✅ Found ${result.notifications.length} notifications, ${result.unreadCount} unread`);

    return NextResponse.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get notifications error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error(`❌ Detailed Error: ${error.message}`);

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to load notifications. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Mark all notifications as read
export async function POST(request) {
  try {
    const currentDate = new Date();
    // console.log('✅ [User API] Marking all notifications as read');

    await dbConnect();
    const auth = authenticateUser(request);
    if (!auth.success) {
      console.error('❌ User authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'mark_all_read') {
      // ✅ FIX: Replicate proper audience calculation from centralized helper
      const {
        userAudiences,
        activeSubscriptionRanges,
        expiredSubscriptionRanges,
        expiresoonSubscriptionRanges,
        productActiveRanges,
        productExpiredRanges,
        productExpiresoonRanges,
        productStatusMap
      } = await getUserSubscriptionMetrics(auth.id, currentDate);

      const user = await User.findById(auth.id).select('createdAt');
      const userCreatedAt = user ? user.createdAt : new Date(0);

      // Get all unread notifications for user with correct filtering
      const result = await Notification.getUserNotifications(auth.id, {
        showUnreadOnly: true,
        userAudiences,
        userCreatedAt,
        activeSubscriptionRanges,
        expiredSubscriptionRanges,
        expiresoonSubscriptionRanges,
        productActiveRanges,
        productExpiredRanges,
        productExpiresoonRanges,
        productStatusMap
      });

      let markedCount = 0;

      // Process each unread notification
      for (const notification of result.notifications) {
        if (notification.isBroadcast) {
          // For broadcast notifications, mark as read
          const broadcastResult = await Notification.markBroadcastAsRead(
            notification._id,
            auth.id,
            { name: auth.name, email: auth.email }
          );

          if (broadcastResult.success && !broadcastResult.alreadyRead) {
            markedCount++;
          }
        } else {
          // For personal notifications, mark as read
          await Notification.findByIdAndUpdate(
            notification._id,
            { isRead: true }
          );
          markedCount++;
        }
      }

      // console.log(`✅ Marked ${markedCount} notifications as read`);

      return NextResponse.json({
        success: true,
        message: `Marked ${markedCount} notifications as read`,
        markedCount
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    return NextResponse.json(
      {
        error: 'Failed to mark notifications as read',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// PATCH - Mark single notification as read
export async function PATCH(request) {
  try {
    // console.log('✅ [User API] Marking notification as read');

    await dbConnect();
    const auth = authenticateUser(request);
    if (!auth.success) {
      console.error('❌ User authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    // Handle "mark all as read"
    if (markAllAsRead) {
      return await POST(request);
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // console.log(`   Marking notification ${notificationId} as read for user ${auth.id}`);

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      console.error(`❌ Notification ${notificationId} not found`);
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Handle broadcast notifications
    if (notification.isBroadcast) {
      // console.log('   Handling broadcast notification');

      const result = await Notification.markBroadcastAsRead(
        notificationId,
        auth.id,
        { name: auth.name, email: auth.email }
      );

      if (!result.success) {
        console.error(`❌ Failed to mark broadcast as read: ${result.error}`);
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }

      // console.log(`✅ Broadcast marked as read. Read count: ${result.readCount}`);

      return NextResponse.json({
        success: true,
        message: result.alreadyRead ? 'Already read' : 'Broadcast notification marked as read',
        readCount: result.readCount,
        alreadyRead: result.alreadyRead
      });
    } else {
      // Handle personal notification
      // console.log('   Handling personal notification');

      if (!notification.userId || notification.userId.toString() !== auth.id.toString()) {
        console.error(`❌ Unauthorized access. User ID: ${auth.id}, Notification User ID: ${notification.userId}`);
        return NextResponse.json(
          { error: 'Unauthorized access to this notification' },
          { status: 403 }
        );
      }

      notification.isRead = true;
      await notification.save();

      // console.log(`✅ Personal notification marked as read: ${notificationId}`);

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    }

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Failed to update notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete user's notification (Soft delete/Hide)
export async function DELETE(request) {
  try {
    const currentDate = new Date();
    // console.log('🗑️ [User API] Deleting notification (soft delete)');

    await dbConnect();
    const auth = authenticateUser(request);
    if (!auth.success) {
      console.error('❌ User authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { notificationId, deleteAll } = body;

    // Handle "delete all" (clear all notifications for this user)
    if (deleteAll) {
      // Find all visible notifications for this user (using getUserNotifications for consistent filtering)
      const {
        userAudiences,
        activeSubscriptionRanges,
        expiredSubscriptionRanges,
        expiresoonSubscriptionRanges,
        productActiveRanges,
        productExpiredRanges,
        productExpiresoonRanges,
        productStatusMap
      } = await getUserSubscriptionMetrics(auth.id, currentDate);

      const user = await User.findById(auth.id).select('createdAt');
      const userCreatedAt = user ? user.createdAt : new Date(0);

      const result = await Notification.getUserNotifications(auth.id, {
        limit: 1000,
        userAudiences,
        userCreatedAt,
        activeSubscriptionRanges,
        expiredSubscriptionRanges,
        expiresoonSubscriptionRanges,
        productActiveRanges,
        productExpiredRanges,
        productExpiresoonRanges,
        productStatusMap
      });

      let hiddenCount = 0;
      for (const notification of result.notifications) {
        await Notification.hideNotificationForUser(notification._id, auth.id);
        hiddenCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${hiddenCount} notifications`
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Single notification soft delete
    const result = await Notification.hideNotificationForUser(notificationId, auth.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete notification' },
        { status: 400 }
      );
    }

    // console.log(`✅ Notification soft deleted: ${notificationId}`);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete notification error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete notification',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}