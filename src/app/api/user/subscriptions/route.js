// src/app/api/user/subscriptions/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    const user = authenticateUser(request);
    if (!user.success) {
      return NextResponse.json(
        { success: false, error: user.error },
        { status: user.status }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'active';
    const userId = user.id;

    // ✅ Check and update expired subscriptions for this user
    const now = new Date();

    // Find subscriptions that need to be marked as expired
    const subscriptionsToExpire = await Subscription.find({
      user: userId,
      endDate: { $lt: now },
      status: { $ne: 'expired' },
      paymentStatus: 'completed'
    })
      .populate('product', 'heading shortDescription')
      .populate('user', 'name email');

    // Update and create notifications for each expired subscription in parallel
    if (subscriptionsToExpire.length > 0) {
      const { SubscriptionNotifier } = await import('@/app/lib/utils/subscriptionNotifier');

      await Promise.all(subscriptionsToExpire.map(async (subscription) => {
        try {
          const oldStatus = subscription.status;
          subscription.status = 'expired';
          subscription.lastStatusCheck = now;

          if (subscription.startDate && subscription.endDate && subscription.endDate <= subscription.startDate) {
            const newEndDate = new Date(subscription.startDate);
            newEndDate.setMinutes(newEndDate.getMinutes() + 1);
            subscription.endDate = newEndDate;
          }

          await subscription.save();
          await SubscriptionNotifier.createStatusChangeNotification(
            subscription,
            oldStatus,
            'expired',
            'auto_check'
          );
        } catch (subError) {
          console.error(`❌ [Subscriptions API] Error processing expired subscription ${subscription._id}:`, subError);
        }
      }));
    }

    // Build Query
    let query = {
      user: userId,
      isLatest: true,
      paymentStatus: 'completed'
    };

    if (statusFilter === 'active') {
      query.status = { $in: ['active', 'expiresoon'] };
      query.endDate = { $gt: now };
    } else if (statusFilter === 'expired') {
      query.status = 'expired';
    } else if (statusFilter === 'expiresoon') {
      query.status = 'expiresoon';
      query.endDate = { $gt: now };
    }

    // Fetch Data - OPTIMIZED
    // Use .lean() and exclude heavy nested fields like articles.sections
    const subscriptions = await Subscription.find(query)
      .populate({
        path: 'product',
        select: 'heading shortDescription filename category variants articles.mainHeading articles.isActive articles.createdAt articles._id',
        model: Product,
        // Exclude content-heavy fields from nested articles
        options: { lean: true }
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedSubscriptions = subscriptions.map(sub => {
      const endDate = new Date(sub.endDate);
      const isActuallyActive = (sub.status === 'active' || sub.status === 'expiresoon') && endDate > now;
      const daysRemaining = isActuallyActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

      return {
        id: sub._id,
        product: sub.product ? {
          _id: sub.product._id,
          heading: sub.product.heading || 'No Title',
          shortDescription: sub.product.shortDescription || 'No description available',
          filename: sub.product.filename || null,
          category: sub.product.category || 'Uncategorized',
          variants: sub.product.variants || [],
          articlesCount: sub.product.articles?.filter(article => article.isActive).length || 0,
          latestArticleId: (() => {
            if (!sub.product || !sub.product.articles) return null;

            // Logic implemented for lean objects
            const subStartDate = sub.originalStartDate || sub.startDate;
            const lookBack = sub.historicalArticleLimit || 5;

            const subDate = new Date(subStartDate);
            const active = sub.product.articles.filter(a => a.isActive && a.createdAt);

            const future = active.filter(a => new Date(a.createdAt) > subDate);
            const historical = active.filter(a => new Date(a.createdAt) <= subDate)
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, lookBack);

            const allAccessible = [...historical, ...future].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return allAccessible.length > 0 ? allAccessible[0]._id : null;
          })() || null
        } : {
          _id: null,
          heading: 'Product Unavailable',
          shortDescription: 'This product is no longer available',
          filename: null,
          category: 'Uncategorized',
          variants: [],
          articlesCount: 0,
          latestArticleId: null
        },
        variant: sub.variant,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        paymentStatus: sub.paymentStatus,
        isActive: isActuallyActive,
        daysRemaining: daysRemaining,
        isExpired: sub.status === 'expired',
        isExpiringSoon: sub.status === 'expiresoon',
        isLatest: sub.isLatest
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: formattedSubscriptions,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      filters: {
        status: statusFilter,
        count: formattedSubscriptions.length
      }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);

    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch subscriptions: ' + error.message
    }, { status: 500 });
  }
}