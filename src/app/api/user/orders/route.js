// src/app/api/user/orders/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import Product from '@/app/lib/models/product';
import { authenticateUser } from '@/app/lib/middleware/auth';

export async function GET(request) {
  try {
    // ✅ Use updated authentication middleware
    const user = authenticateUser(request);

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || 'all';
    const skip = (page - 1) * limit;

    // Build query
    let query = {
      user: user.id,
      paymentStatus: { $in: ['completed', 'pending', 'failed'] }
    };

    // Filter by payment status if specified
    if (status !== 'all') {
      query.paymentStatus = status;
    }

    // ✅ Get orders with proper population
    const orders = await Subscription.find(query)
      .populate({
        path: 'product',
        select: 'heading shortDescription filename category',
        model: Product
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Subscription.countDocuments(query);

    // ✅ SIMPLE REAL-TIME STATUS CALCULATION
    const formattedOrders = orders.map(order => {
      const now = new Date();
      const endDate = new Date(order.endDate);

      // Calculate real-time status
      let realTimeStatus = order.status;
      let isSubscriptionActive = false;
      let daysRemaining = 0;

      if (order.paymentStatus === 'completed') {
        if (endDate < now) {
          // Expired
          realTimeStatus = 'expired';
          isSubscriptionActive = false;
        } else {
          // Still active
          const timeDiff = endDate - now;
          daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          isSubscriptionActive = true;

          // Update status based on days remaining
          if (daysRemaining <= 2) {
            realTimeStatus = 'expiresoon';
          } else {
            realTimeStatus = 'active';
          }
        }
      } else {
        // For non-completed payments
        isSubscriptionActive = false;
        if (order.paymentStatus === 'pending') {
          realTimeStatus = 'pending';
        } else if (order.paymentStatus === 'failed') {
          realTimeStatus = 'failed';
        }
      }

      // Order status for filtering
      let orderStatus = order.paymentStatus === 'completed' ? 'completed' :
        order.paymentStatus === 'pending' ? 'pending' :
          order.paymentStatus === 'failed' ? 'failed' : 'unknown';

      return {
        id: order._id,
        orderId: order.transactionId || `ORD_${order._id.toString().slice(-8)}`,
        product: order.product ? {
          _id: order.product._id,
          heading: order.product.heading || 'No Title',
          shortDescription: order.product.shortDescription || 'No description available',
          filename: order.product.filename || null,
          category: order.product.category || 'Uncategorized'
        } : {
          _id: null,
          heading: 'Product Not Available',
          shortDescription: 'This product is no longer available',
          filename: null,
          category: 'Uncategorized'
        },
        variant: order.variant || {
          duration: 'N/A',
          price: 0,
          durationValue: 0,
          durationUnit: 'months'
        },
        // Order details
        orderDate: order.createdAt,
        paymentStatus: order.paymentStatus,
        orderStatus: orderStatus,
        paymentId: order.paymentId,
        transactionId: order.transactionId,
        amount: order.variant?.price || 0,
        discountAmount: order.metadata?.discountAmount || 0,
        promoCode: order.metadata?.promoCode || null,

        // ✅ REAL-TIME CALCULATED STATUS (always accurate)
        subscriptionStatus: realTimeStatus,
        startDate: order.startDate,
        endDate: order.endDate,
        isSubscriptionActive: isSubscriptionActive,
        daysRemaining: daysRemaining,
        isLatest: order.isLatest,

        paymentMethod: order.metadata?.paymentMethod || 'razorpay',
        replacedSubscription: order.replacedSubscription
      };
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        totalOrders: total,
        completed: await Subscription.countDocuments({
          user: user.id,
          paymentStatus: 'completed'
        }),
        pending: await Subscription.countDocuments({
          user: user.id,
          paymentStatus: 'pending'
        }),
        failed: await Subscription.countDocuments({
          user: user.id,
          paymentStatus: 'failed'
        })
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);

    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required to access orders'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch orders: ' + error.message
    }, { status: 500 });
  }
}