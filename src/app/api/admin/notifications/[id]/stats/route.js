// src/app/api/admin/notifications/[id]/stats/route.js - COMPLETE
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import Notification from '@/app/lib/models/Notification';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    console.log(`📊 [Admin API] Getting broadcast stats for notification: ${id}`);

    // Get broadcast statistics
    const stats = await Notification.getBroadcastStats(id);
    
    if (!stats) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Broadcast notification not found or not a broadcast notification' 
        },
        { status: 404 }
      );
    }
    
    // ✅ Allow all admins to view stats (removed restriction)
    // Log who is viewing stats for audit purposes
    console.log(`📊 Admin ${auth.id} viewing stats for notification created by: ${stats.notification.sentBy?._id || stats.notification.sentBy}`);

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting broadcast stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get broadcast notification statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}