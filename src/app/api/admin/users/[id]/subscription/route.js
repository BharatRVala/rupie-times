// src/app/api/admin/users/[id]/subscription/route.js - DEBUG VERSION
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/utils/dbConnect';
import Subscription from '@/app/lib/models/Subscription';
import User from '@/app/lib/models/User';
import Product from '@/app/lib/models/product';
import { authenticateAdmin } from '@/app/lib/middleware/auth';

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

    const { id: userId } = await params;

    // Validate user exists
    const user = await User.findById(userId).select('name email mobile');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const productId = searchParams.get('productId') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter query
    let filterQuery = { user: userId };

    // Status filter
    if (status !== 'all') {
      if (status === 'active') {
        filterQuery.status = { $in: ['active', 'expiresoon'] };
        filterQuery.endDate = { $gt: new Date() };
      } else if (status === 'expired') {
        filterQuery.status = 'expired';
      } else if (status === 'expiresoon') {
        filterQuery.status = 'expiresoon';
        filterQuery.endDate = { $gt: new Date() };
      } else {
        filterQuery.status = status;
      }
    }

    // Payment status filter
    if (paymentStatus !== 'all') {
      filterQuery.paymentStatus = paymentStatus;
    }

    // Product filter
    if (productId) {
      filterQuery.product = productId;
    }

    // Get subscriptions with pagination and population
    const subscriptions = await Subscription.find(filterQuery)
      .populate('product', 'heading shortDescription category filename')
      .populate('replacedSubscription', 'startDate endDate status')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Subscription.countDocuments(filterQuery);

    // ✅ ADDED: Real-time status calculation for display
    const now = new Date();
    const formattedSubscriptions = subscriptions.map(subscription => {
      const endDate = new Date(subscription.endDate);

      // ✅ Calculate real-time status regardless of stored status
      let realTimeStatus = subscription.status;
      let isActuallyActive = false;
      let isExpiringSoon = false;
      let daysRemaining = 0;
      let needsStatusUpdate = false;

      if (subscription.paymentStatus === 'completed') {
        if (endDate < now) {
          // Subscription has expired in real-time
          realTimeStatus = 'expired';
          isActuallyActive = false;
          daysRemaining = 0;
          needsStatusUpdate = (subscription.status !== 'expired');
        } else {
          // Subscription is still active
          daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 10 && daysRemaining > 0) {
            isExpiringSoon = true;
            if (subscription.status !== 'expiresoon') {
              realTimeStatus = 'expiresoon';
              needsStatusUpdate = true;
            }
          } else {
            isActuallyActive = true;
            if (daysRemaining > 10 && subscription.status === 'expiresoon') {
              realTimeStatus = 'active';
              needsStatusUpdate = true;
            }
          }
        }
      } else {
        // For non-completed payments, use stored status
        isActuallyActive = false;
        daysRemaining = 0;
      }

      return {
        id: subscription._id.toString(),
        product: subscription.product ? {
          id: subscription.product._id.toString(),
          heading: subscription.product.heading,
          shortDescription: subscription.product.shortDescription,
          category: subscription.product.category,
          filename: subscription.product.filename
        } : null,
        variant: subscription.variant,
        status: realTimeStatus, // ✅ Use real-time calculated status
        storedStatus: subscription.status, // Keep original for reference
        paymentStatus: subscription.paymentStatus,
        paymentId: subscription.paymentId,
        transactionId: subscription.transactionId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isLatest: subscription.isLatest,
        isActive: isActuallyActive,
        isExpiringSoon: isExpiringSoon,
        daysRemaining: daysRemaining,
        totalValue: subscription.variant?.price || 0,
        replacedSubscription: subscription.replacedSubscription ? {
          id: subscription.replacedSubscription._id.toString(),
          startDate: subscription.replacedSubscription.startDate,
          endDate: subscription.replacedSubscription.endDate,
          status: subscription.replacedSubscription.status
        } : null,
        metadata: subscription.metadata,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        lastStatusCheck: subscription.lastStatusCheck,
        needsStatusUpdate: needsStatusUpdate, // Flag for UI to show update needed
        historicalArticleLimit: subscription.historicalArticleLimit // Ensure this is returned
      };
    });

    // ✅ FIXED: Get subscription statistics for this user with real-time calculation
    const nowForStats = new Date();
    const stats = await Subscription.aggregate([
      { $match: { user: userId } },
      {
        $project: {
          status: 1,
          paymentStatus: 1,
          endDate: 1,
          variant: 1,
          // Calculate real-time status for statistics
          realTimeStatus: {
            $cond: [
              { $eq: ['$paymentStatus', 'completed'] },
              {
                $cond: [
                  { $lt: ['$endDate', nowForStats] },
                  'expired',
                  {
                    $cond: [
                      {
                        $and: [
                          { $gt: ['$endDate', nowForStats] },
                          {
                            $lte: [
                              { $subtract: ['$endDate', nowForStats] },
                              10 * 24 * 60 * 60 * 1000 // 10 days in milliseconds
                            ]
                          }
                        ]
                      },
                      'expiresoon',
                      'active'
                    ]
                  }
                ]
              },
              '$status' // Use stored status for non-completed payments
            ]
          },
          variantPrice: '$variant.price'
        }
      },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: {
              $cond: [
                { $in: ['$realTimeStatus', ['active', 'expiresoon']] },
                1,
                0
              ]
            }
          },
          expiredSubscriptions: {
            $sum: {
              $cond: [
                { $eq: ['$realTimeStatus', 'expired'] },
                1,
                0
              ]
            }
          },
          expiresoonSubscriptions: {
            $sum: {
              $cond: [
                { $eq: ['$realTimeStatus', 'expiresoon'] },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'completed'] },
                '$variantPrice',
                0
              ]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'pending'] },
                1,
                0
              ]
            }
          },
          failedPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'failed'] },
                1,
                0
              ]
            }
          },
          refundedPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const subscriptionStats = stats[0] || {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      expiredSubscriptions: 0,
      expiresoonSubscriptions: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      failedPayments: 0,
      refundedPayments: 0
    };

    // ✅ Calculate subscriptions needing status update
    const subscriptionsNeedingUpdate = formattedSubscriptions.filter(sub => sub.needsStatusUpdate).length;

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile
      },
      subscriptions: formattedSubscriptions,
      statistics: {
        total: subscriptionStats.totalSubscriptions,
        active: subscriptionStats.activeSubscriptions,
        expired: subscriptionStats.expiredSubscriptions,
        expiresoon: subscriptionStats.expiresoonSubscriptions,
        totalRevenue: subscriptionStats.totalRevenue,
        pendingPayments: subscriptionStats.pendingPayments,
        failedPayments: subscriptionStats.failedPayments,
        refundedPayments: subscriptionStats.refundedPayments,
        needsStatusUpdate: subscriptionsNeedingUpdate
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        status,
        paymentStatus,
        productId,
        sortBy,
        sortOrder
      },
      realTimeInfo: {
        calculatedAt: now.toISOString(),
        note: 'Statuses are calculated in real-time based on current server time'
      },
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      }
    });

  } catch (error) {
    console.error('Error fetching user subscriptions:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to access user subscriptions'
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
      error: 'Failed to fetch user subscriptions: ' + error.message
    }, { status: 500 });
  }
}

// ✅ PUT - Update specific subscription by subscription ID
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

    const { id: userId } = await params;
    const body = await request.json();

    console.log('PUT Subscription Update Body:', body); // DEBUG LOG

    const {
      subscriptionId,
      status,
      paymentStatus,
      startDate,
      endDate,
      isLatest,
      notes,
      extendDuration,
      extendUnit,
      historicalArticleLimit
    } = body;

    // Validate required fields
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    }).populate('product', 'heading shortDescription category');

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found for this user' },
        { status: 404 }
      );
    }

    // Build update object
    const updateFields = {};
    const metadataUpdates = {
      ...subscription.metadata,
      lastUpdatedBy: authResult.email,
      lastUpdatedAt: new Date()
    };

    // Update status if provided
    if (status && ['active', 'expired', 'expiresoon'].includes(status)) {
      updateFields.status = status;
      metadataUpdates.statusChange = {
        from: subscription.status,
        to: status,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update payment status if provided
    if (paymentStatus && ['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      updateFields.paymentStatus = paymentStatus;
      metadataUpdates.paymentStatusChange = {
        from: subscription.paymentStatus,
        to: paymentStatus,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update start date if provided
    if (startDate) {
      updateFields.startDate = new Date(startDate);
      metadataUpdates.startDateUpdated = {
        from: subscription.startDate,
        to: new Date(startDate),
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update end date if provided
    if (endDate) {
      updateFields.endDate = new Date(endDate);
      metadataUpdates.endDateUpdated = {
        from: subscription.endDate,
        to: new Date(endDate),
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // ✅ FIXED: Extend subscription duration with correct calculation
    if (extendDuration && extendUnit) {
      const currentEndDate = new Date(subscription.endDate);
      let newEndDate = new Date(currentEndDate);

      switch (extendUnit) {
        case 'minutes':
          newEndDate.setMinutes(currentEndDate.getMinutes() + extendDuration);
          break;
        case 'hours':
          newEndDate.setHours(currentEndDate.getHours() + extendDuration);
          break;
        case 'days':
          newEndDate.setDate(currentEndDate.getDate() + extendDuration);
          break;
        case 'weeks':
          newEndDate.setDate(currentEndDate.getDate() + (extendDuration * 7));
          break;
        case 'months':
          newEndDate.setMonth(currentEndDate.getMonth() + extendDuration);
          break;
        case 'years':
          newEndDate.setFullYear(currentEndDate.getFullYear() + extendDuration);
          break;
        default:
          newEndDate.setMonth(currentEndDate.getMonth() + extendDuration);
      }

      updateFields.endDate = newEndDate;
      metadataUpdates.extended = {
        previousEndDate: subscription.endDate,
        newEndDate: newEndDate,
        durationAdded: extendDuration,
        unitAdded: extendUnit,
        extendedAt: new Date(),
        extendedBy: authResult.email
      };
    }

    // Update isLatest if provided
    if (isLatest !== undefined) {
      updateFields.isLatest = isLatest;
      metadataUpdates.isLatestUpdated = {
        from: subscription.isLatest,
        to: isLatest,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update historicalArticleLimit if provided
    if (historicalArticleLimit !== undefined) {
      console.log('PUT: Updating historicalArticleLimit to', historicalArticleLimit); // DEBUG LOG
      updateFields.historicalArticleLimit = historicalArticleLimit;
      metadataUpdates.historicalArticleLimitUpdated = {
        from: subscription.historicalArticleLimit,
        to: historicalArticleLimit,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Add notes if provided
    if (notes) {
      metadataUpdates.adminNotes = metadataUpdates.adminNotes || [];
      metadataUpdates.adminNotes.push({
        note: notes,
        addedAt: new Date(),
        addedBy: authResult.email
      });
    }

    // Add metadata updates
    updateFields.metadata = metadataUpdates;
    updateFields.updatedAt = new Date();

    console.log('PUT: Final updateFields:', updateFields); // DEBUG LOG

    // Apply updates
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('product', 'heading shortDescription category');

    const subscriptionResponse = {
      id: updatedSubscription._id.toString(),
      product: updatedSubscription.product ? {
        id: updatedSubscription.product._id.toString(),
        heading: updatedSubscription.product.heading,
        shortDescription: updatedSubscription.product.shortDescription,
        category: updatedSubscription.product.category
      } : null,
      variant: updatedSubscription.variant,
      status: updatedSubscription.status,
      paymentStatus: updatedSubscription.paymentStatus,
      paymentId: updatedSubscription.paymentId,
      transactionId: updatedSubscription.transactionId,
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      isLatest: updatedSubscription.isLatest,
      isActive: updatedSubscription.isActive,
      isExpiringSoon: updatedSubscription.isExpiringSoon,
      daysRemaining: updatedSubscription.daysRemaining,
      metadata: updatedSubscription.metadata,
      createdAt: updatedSubscription.createdAt,
      updatedAt: updatedSubscription.updatedAt,
      historicalArticleLimit: updatedSubscription.historicalArticleLimit
    };

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: subscriptionResponse,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      },
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      changes: Object.keys(updateFields).filter(key => key !== 'metadata' && key !== 'updatedAt')
    });

  } catch (error) {
    console.error('Error updating subscription:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to update subscriptions'
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
      error: 'Failed to update subscription: ' + error.message
    }, { status: 500 });
  }
}

// ✅ PATCH - Partial update for specific subscription
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

    const { id: userId } = await params;
    const body = await request.json();

    console.log('PATCH Subscription Update Body:', body); // DEBUG LOG

    const {
      subscriptionId,
      status,
      paymentStatus,
      startDate,
      endDate,
      notes,
      extendDuration,
      extendUnit,
      historicalArticleLimit
    } = body;

    // Validate required fields
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    }).populate('product', 'heading shortDescription category');

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found for this user' },
        { status: 404 }
      );
    }

    // Build update object for partial updates
    const updateFields = {};
    const metadataUpdates = {
      ...subscription.metadata,
      lastUpdatedBy: authResult.email,
      lastUpdatedAt: new Date()
    };

    // Update status if provided
    if (status && ['active', 'expired', 'expiresoon'].includes(status)) {
      updateFields.status = status;
      metadataUpdates.statusChange = {
        from: subscription.status,
        to: status,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update payment status if provided
    if (paymentStatus && ['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      updateFields.paymentStatus = paymentStatus;
      metadataUpdates.paymentStatusChange = {
        from: subscription.paymentStatus,
        to: paymentStatus,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update start date if provided
    if (startDate) {
      updateFields.startDate = new Date(startDate);
      metadataUpdates.startDateUpdated = {
        from: subscription.startDate,
        to: new Date(startDate),
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Update end date if provided
    if (endDate) {
      updateFields.endDate = new Date(endDate);
      metadataUpdates.endDateUpdated = {
        from: subscription.endDate,
        to: new Date(endDate),
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // ✅ FIXED: Extend subscription duration with correct calculation
    if (extendDuration && extendUnit) {
      const currentEndDate = new Date(subscription.endDate);
      let newEndDate = new Date(currentEndDate);

      switch (extendUnit) {
        case 'minutes':
          newEndDate.setMinutes(currentEndDate.getMinutes() + extendDuration);
          break;
        case 'hours':
          newEndDate.setHours(currentEndDate.getHours() + extendDuration);
          break;
        case 'days':
          newEndDate.setDate(currentEndDate.getDate() + extendDuration);
          break;
        case 'weeks':
          newEndDate.setDate(currentEndDate.getDate() + (extendDuration * 7));
          break;
        case 'months':
          newEndDate.setMonth(currentEndDate.getMonth() + extendDuration);
          break;
        case 'years':
          newEndDate.setFullYear(currentEndDate.getFullYear() + extendDuration);
          break;
        default:
          newEndDate.setMonth(currentEndDate.getMonth() + extendDuration);
      }

      updateFields.endDate = newEndDate;
      metadataUpdates.extended = {
        previousEndDate: subscription.endDate,
        newEndDate: newEndDate,
        durationAdded: extendDuration,
        unitAdded: extendUnit,
        extendedAt: new Date(),
        extendedBy: authResult.email
      };
    }

    // Update historicalArticleLimit if provided
    if (historicalArticleLimit !== undefined) {
      console.log('PATCH: Updating historicalArticleLimit to', historicalArticleLimit); // DEBUG LOG
      updateFields.historicalArticleLimit = historicalArticleLimit;
      metadataUpdates.historicalArticleLimitUpdated = {
        from: subscription.historicalArticleLimit,
        to: historicalArticleLimit,
        changedAt: new Date(),
        changedBy: authResult.email
      };
    }

    // Add notes if provided
    if (notes) {
      metadataUpdates.adminNotes = metadataUpdates.adminNotes || [];
      metadataUpdates.adminNotes.push({
        note: notes,
        addedAt: new Date(),
        addedBy: authResult.email
      });
    }

    // Add metadata updates
    updateFields.metadata = metadataUpdates;
    updateFields.updatedAt = new Date();

    console.log('PATCH: Final updateFields:', updateFields); // DEBUG LOG

    // Apply partial updates
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('product', 'heading shortDescription category');

    const subscriptionResponse = {
      id: updatedSubscription._id.toString(),
      product: updatedSubscription.product ? {
        id: updatedSubscription.product._id.toString(),
        heading: updatedSubscription.product.heading,
        shortDescription: updatedSubscription.product.shortDescription,
        category: updatedSubscription.product.category
      } : null,
      variant: updatedSubscription.variant,
      status: updatedSubscription.status,
      paymentStatus: updatedSubscription.paymentStatus,
      startDate: updatedSubscription.startDate,
      endDate: updatedSubscription.endDate,
      isLatest: updatedSubscription.isLatest,
      isActive: updatedSubscription.isActive,
      isExpiringSoon: updatedSubscription.isExpiringSoon,
      daysRemaining: updatedSubscription.daysRemaining,
      metadata: updatedSubscription.metadata,
      createdAt: updatedSubscription.createdAt,
      updatedAt: updatedSubscription.updatedAt,
      historicalArticleLimit: updatedSubscription.historicalArticleLimit // Ensure this is returned
    };

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: subscriptionResponse,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      },
      admin: {
        id: authResult.id,
        name: authResult.name,
        email: authResult.email
      },
      changes: Object.keys(updateFields).filter(key => key !== 'metadata' && key !== 'updatedAt')
    });

  } catch (error) {
    console.error('Error updating subscription:', error);

    // ✅ Handle authentication errors specifically
    if (error.message.includes('authentication failed')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Admin authentication required to update subscriptions'
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
      error: 'Failed to update subscription: ' + error.message
    }, { status: 500 });
  }
}