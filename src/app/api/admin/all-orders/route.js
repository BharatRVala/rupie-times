// src/app/api/admin/all-orders/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    // Authenticate admin
    const authResult = authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error
      }, { status: authResult.status });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const statusFilter = searchParams.get('status');
    const paymentStatusFilter = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let query = {};

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }

    // Payment status filter
    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      query.paymentStatus = paymentStatusFilter;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };

      // 1. Find matching users
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      // 2. Find matching products
      const matchingProducts = await Product.find({
        heading: searchRegex
      }).select('_id');
      const productIds = matchingProducts.map(p => p._id);

      // 3. Construct Query
      query.$or = [
        { transactionId: searchRegex },
        { paymentId: searchRegex },
        { orderId: searchRegex }, // Assuming orderId might exist or be added
        { user: { $in: userIds } },
        { product: { $in: productIds } }
      ];
    }

    // Get total count for pagination
    const total = await Subscription.countDocuments(query);

    let subscriptions;

    try {
      subscriptions = await Subscription.find(query)
        .populate({
          path: 'product',
          select: 'heading shortDescription filename category variants',
          model: Product
        })
        .populate({
          path: 'user',
          select: 'name email phone profileImage',
          model: User
        })
        .populate({
          path: 'replacedSubscription',
          select: 'startDate endDate status',
          model: Subscription
        })
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);
    } catch (populateError) {
      console.log('Population failed, fetching without populated data:', populateError.message);
      subscriptions = await Subscription.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);
    }

    // ✅ REMOVED: Manual status updates - now handled by cron job

    const formattedOrders = subscriptions.map(sub => {
      const now = new Date();
      const endDate = new Date(sub.endDate);

      // Status is now automatically maintained by cron job
      const isActuallyActive = (sub.status === 'active' || sub.status === 'expiresoon') && endDate > now;
      const daysRemaining = isActuallyActive ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
      const isExpiringSoon = sub.status === 'expiresoon' || (sub.status === 'active' && daysRemaining <= 2 && daysRemaining > 0);
      const isExpired = sub.status === 'expired' || (sub.status === 'active' && endDate < now);

      // Calculate amounts with tax
      // Calculate amounts with tax
      const baseAmount = sub.variant?.price || 0;
      const discountAmount = sub.metadata?.discountAmount || 0;
      const taxableAmount = Math.max(0, baseAmount - discountAmount);
      const taxAmount = taxableAmount * 0.18;
      const totalAmount = taxableAmount + taxAmount;

      // Get product name
      let productName = 'Unknown Product';
      let productCategory = 'Uncategorized';
      let productImage = null;

      if (sub.product) {
        if (typeof sub.product === 'object') {
          productName = sub.product.heading || 'Unknown Product';
          productCategory = sub.product.category || 'Uncategorized';
          productImage = sub.product.filename;
        } else if (typeof sub.product === 'string') {
          productName = 'Product (ID: ' + sub.product + ')';
        }
      }

      // Get user info
      const userName = sub.user?.name || 'Unknown User';
      const userEmail = sub.user?.email || 'No Email';
      const userPhone = sub.user?.phone || 'No Phone';
      const userImage = sub.user?.profileImage;

      return {
        id: sub._id,
        orderNumber: `ORD-${sub._id.toString().slice(-8).toUpperCase()}`,
        product: {
          id: sub.product?._id || null,
          name: productName,
          category: productCategory,
          image: productImage,
          description: sub.product?.shortDescription || 'No description'
        },
        user: {
          id: sub.user?._id || null,
          name: userName,
          email: userEmail,
          phone: userPhone,
          image: userImage
        },
        variant: {
          duration: sub.variant?.duration || 'N/A',
          durationValue: sub.variant?.durationValue || 0,
          durationUnit: sub.variant?.durationUnit || 'months',
          durationUnit: sub.variant?.durationUnit || 'months',
          price: baseAmount,
          discountAmount: sub.metadata?.discountAmount || 0,
          promoCode: sub.metadata?.promoCode || null
        },
        pricing: {
          baseAmount: baseAmount,
          discountAmount: sub.metadata?.discountAmount || 0,
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          currency: 'INR'
        },
        status: sub.status, // Automatically updated by cron
        paymentStatus: sub.paymentStatus,
        paymentDetails: {
          paymentId: sub.paymentId || 'N/A',
          transactionId: sub.transactionId || 'N/A',
          paymentMethod: sub.metadata?.paymentMethod || 'razorpay',
          verifiedAt: sub.metadata?.paymentVerifiedAt || null
        },
        dates: {
          orderDate: sub.createdAt,
          startDate: sub.startDate,
          endDate: sub.endDate,
          lastStatusCheck: sub.lastStatusCheck,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt
        },
        subscriptionInfo: {
          daysRemaining: daysRemaining,
          isActive: isActuallyActive,
          isExpired: isExpired,
          isExpiringSoon: isExpiringSoon,
          isLatest: sub.isLatest,
          replacedSubscription: sub.replacedSubscription ? {
            id: sub.replacedSubscription._id,
            startDate: sub.replacedSubscription.startDate,
            endDate: sub.replacedSubscription.endDate,
            status: sub.replacedSubscription.status
          } : null,
          metadata: sub.metadata || {}
        }
      };
    });

    // Get statistics
    const stats = {
      total: await Subscription.countDocuments(),
      active: await Subscription.countDocuments({
        status: { $in: ['active', 'expiresoon'] },
        endDate: { $gt: new Date() },
        paymentStatus: 'completed'
      }),
      expired: await Subscription.countDocuments({
        status: 'expired'
      }),
      pending: await Subscription.countDocuments({
        paymentStatus: 'pending'
      }),
      completed: await Subscription.countDocuments({
        paymentStatus: 'completed'
      }),
      failed: await Subscription.countDocuments({
        paymentStatus: 'failed'
      }),
      revenue: {
        total: await Subscription.aggregate([
          { $match: { paymentStatus: 'completed' } },
          { $group: { _id: null, total: { $sum: '$variant.price' } } }
        ]).then(result => result[0]?.total || 0),
        monthly: await Subscription.aggregate([
          {
            $match: {
              paymentStatus: 'completed',
              createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              }
            }
          },
          { $group: { _id: null, total: { $sum: '$variant.price' } } }
        ]).then(result => result[0]?.total || 0)
      }
    };

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        status: statusFilter,
        paymentStatus: paymentStatusFilter,
        search,
        startDate,
        endDate,
        sortBy,
        sortOrder
      },
      statistics: stats,
      note: 'Subscription statuses are automatically updated every 5 minutes by cron job'
    });

  } catch (error) {
    console.error('Error fetching all orders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch orders: ' + error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

