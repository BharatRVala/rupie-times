// src/app/api/admin/notifications/stats/route.js - COMPLETE BROADCAST VERSION
import { NextResponse } from 'next/server';
import { authenticateAdmin } from '@/app/lib/middleware/auth';
import dbConnect from '@/app/lib/utils/dbConnect';
import Notification from '@/app/lib/models/Notification';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await dbConnect();
    
    const auth = authenticateAdmin(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    console.log('📊 [Admin API] Getting broadcast statistics');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // Get broadcast notification statistics
      const statsAggregation = await Notification.aggregate([
        {
          $match: {
            isBroadcast: true
          }
        },
        {
          $group: {
            _id: '$notificationType',
            count: { $sum: 1 },
            totalReadCount: {
              $sum: { $size: '$readBy' }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      console.log('📊 Broadcast aggregation result:', statsAggregation);

      // Get total counts for broadcast notifications
      const [totalBroadcasts, myBroadcasts, todayBroadcasts] = await Promise.all([
        Notification.countDocuments({ isBroadcast: true }),
        Notification.countDocuments({
          isBroadcast: true,
          sentBy: auth.id
        }),
        Notification.countDocuments({ 
          isBroadcast: true,
          createdAt: { 
            $gte: today,
            $lt: tomorrow 
          } 
        })
      ]);

      console.log('📊 Broadcast count results:', {
        totalBroadcasts,
        myBroadcasts,
        todayBroadcasts
      });

      // Get total users count
      const User = mongoose.models.User;
      const totalUsers = await User.countDocuments({});
      
      // Get recent broadcast notifications with read stats
      const recentBroadcasts = await Notification.find({
        isBroadcast: true,
        sentBy: auth.id
      })
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

      const recentBroadcastsWithStats = await Promise.all(
        recentBroadcasts.map(async notification => {
          const notificationObj = notification.toObject();
          notificationObj.readCount = notification.readBy.length;
          notificationObj.readPercentage = totalUsers > 0 ? 
            Math.round((notification.readBy.length / totalUsers) * 100) : 0;
          return notificationObj;
        })
      );

      // Transform aggregation result
      const byType = {};
      statsAggregation.forEach(item => {
        if (item._id) {
          byType[item._id] = {
            count: item.count || 0,
            avgReadCount: totalUsers > 0 ? 
              Math.round((item.totalReadCount / item.count) || 0) : 0
          };
        }
      });

      return NextResponse.json({
        success: true,
        stats: {
          totals: {
            allBroadcasts: totalBroadcasts,
            myBroadcasts,
            todayBroadcasts,
            totalUsers
          },
          byType: byType,
          recentBroadcasts: recentBroadcastsWithStats
        }
      });

    } catch (aggregationError) {
      console.error('❌ Broadcast aggregation error:', aggregationError);
      
      // Fallback
      return NextResponse.json({
        success: true,
        stats: {
          totals: {
            allBroadcasts: 0,
            myBroadcasts: 0,
            todayBroadcasts: 0,
            totalUsers: 0
          },
          byType: {
            'general': { count: 0, avgReadCount: 0 }
          },
          recentBroadcasts: []
        }
      });
    }

  } catch (error) {
    console.error('❌ Error getting broadcast stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch broadcast statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}