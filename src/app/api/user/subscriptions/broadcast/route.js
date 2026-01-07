// src/app/api/admin/notifications/broadcast/route.js
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import { SubscriptionNotifier } from '@/app/lib/utils/subscriptionNotifier';

export async function POST(request) {
  try {
    console.log('📢 [ADMIN BROADCAST API] Sending notification to all users');
    
    await dbConnect();
    
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      console.error('❌ Admin authentication failed:', auth.error);
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    console.log(`   Authenticated admin: ${auth.name} (${auth.role})`);

    const body = await request.json();
    const { 
      title, 
      message, 
      notificationType = 'general', 
      subscriptionId, 
      subscriptionStatus,
      changeReason,
      adminNotes
    } = body;

    console.log('📥 Request data:', {
      title,
      messageLength: message?.length || 0,
      notificationType,
      subscriptionId,
      subscriptionStatus,
      adminId: auth.id
    });

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Prepare data for SubscriptionNotifier
    const notificationData = {
      adminId: auth.id,
      title,
      message,
      notificationType,
      subscriptionId,
      subscriptionStatus,
      changeReason: changeReason || 'Admin broadcast notification',
      adminNotes,
      subscriptionSnapshot: subscriptionId ? {
        id: subscriptionId,
        status: subscriptionStatus
      } : null
    };

    // Use SubscriptionNotifier to send to all users
    console.log('🔔 Broadcasting notification to all users...');
    const result = await SubscriptionNotifier.sendAdminNotificationToAllUsers(notificationData);

    if (result.success) {
      console.log(`✅ Broadcast successful: Sent to ${result.totalUsers} users`);
      
      return NextResponse.json({
        success: true,
        message: `Notification successfully sent to ${result.totalUsers} users`,
        data: {
          totalUsers: result.totalUsers,
          notificationTypes: result.notificationTypes,
          sampleNotifications: result.sampleNotifications,
          timestamp: result.timestamp,
          admin: {
            id: auth.id,
            name: auth.name,
            email: auth.email
          }
        }
      }, { status: 201 });
    } else {
      console.error('❌ Broadcast failed:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send notification: ' + result.error 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Broadcast notification error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to broadcast notification: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}