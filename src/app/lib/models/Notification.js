// src/app/lib/models/Notification.js - FIXED VERSION
import mongoose from 'mongoose';




const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },

  // For user-specific notifications
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },

  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },

  notificationType: {
    type: String,
    default: 'general'
  },

  // ✅ BROADCAST FEATURE: Track who has read (for admin broadcasts)
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: String,
    email: String,
    readAt: {
      type: Date,
      default: Date.now
    },
    _id: false
  }],

  // ✅ BROADCAST FEATURE: Is this a broadcast notification?
  isBroadcast: {
    type: Boolean,
    default: false
  },

  // ✅ TARGETING FEATURE: Who sees this broadcast?
  targetAudience: {
    type: String,
    enum: ['all', 'active', 'expired', 'expiresoon', 'general', 'product_wise'], // general is alias for all
    default: 'all'
  },

  // ✅ TARGETING FEATURE: Specific product for product_wise audience
  targetProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },

  // ✅ SOFT DELETE FEATURE: Hide notification for specific users
  hiddenFor: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hiddenAt: {
      type: Date,
      default: Date.now
    },
    _id: false
  }],

  isRead: {
    type: Boolean,
    default: false
  },

  metadata: {
    // For auto notifications (subscription status changes)
    oldStatus: String,
    newStatus: String,
    triggeredBy: {
      type: String,
      enum: ['system', 'admin', 'payment', 'cron', 'auto_check', 'manual_check'],
      default: 'system'
    },

    // For subscription details
    subscriptionDetails: {
      productName: String,
      duration: String,
      durationValue: Number,
      durationUnit: String,
      price: Number,
      status: String,
      startDate: Date,
      endDate: Date,
      daysRemaining: Number
    },

    // For admin broadcasts
    adminId: mongoose.Schema.Types.ObjectId,
    changeReason: String,
    totalUsers: Number // How many users this was sent to
  }
}, {
  timestamps: true
});

// Indexes for better performance
NotificationSchema.index({ userId: 1, createdAt: -1 }); // Optimized for personal feed
NotificationSchema.index({ isBroadcast: 1, createdAt: -1 }); // Optimized for broadcast feed
NotificationSchema.index({ 'readBy.userId': 1 }); // To quickly check if a user read a broadcast
NotificationSchema.index({ 'hiddenFor.userId': 1 }); // To quickly check if hidden for user
NotificationSchema.index({ sentBy: 1 });
NotificationSchema.index({ notificationType: 1 });
NotificationSchema.index({ targetAudience: 1 });
NotificationSchema.index({ targetProductId: 1 });
NotificationSchema.index({ subscriptionId: 1 }); // Important for deduplication check

// ========== STATIC METHODS ==========

// ✅ FIXED: Auto notifications for subscription status changes
NotificationSchema.statics.createSubscriptionStatusNotification = async function (
  subscription,
  oldStatus,
  newStatus,
  triggeredBy = 'system'
) {
  try {
    // console.log('📝 [Notification.createSubscriptionStatusNotification] START');
    // console.log(`   Subscription ID: ${subscription._id}`);
    // console.log(`   User ID: ${subscription.user}`);
    // console.log(`   Old Status: ${oldStatus}`);
    // console.log(`   New Status: ${newStatus}`);
    // console.log(`   Triggered By: ${triggeredBy}`);

    // Determine notification type based on newStatus
    let notificationType;
    let title;
    let message;

    if (newStatus === 'active') {
      notificationType = 'subscription_active';
      title = '✅ Subscription Activated';
      message = `Your subscription for "${subscription.product?.heading || 'Product'}" has been activated!`;
    }
    else if (newStatus === 'expiresoon') {
      notificationType = 'subscription_expiring_soon';
      title = '⏰ Subscription Expiring Soon';
      message = `Your subscription for "${subscription.product?.heading || 'Product'}" is expiring soon.`;
    }
    else if (newStatus === 'expired') {
      notificationType = 'subscription_expired';
      title = '❌ Subscription Expired';
      message = `Your subscription for "${subscription.product?.heading || 'Product'}" has expired.`;
    }
    else {
      // Default fallback
      notificationType = 'general';
      title = 'Subscription Update';
      message = `Your subscription for "${subscription.product?.heading || 'Product'}" status has been updated.`;
    }

    // console.log(`   Notification Type: ${notificationType}`);
    // console.log(`   Title: ${title}`);
    // console.log(`   Message: ${message}`);

    // Prepare subscription details
    const subscriptionDetails = {
      productName: subscription.product?.heading || 'Unknown Product',
      duration: subscription.variant?.duration || 'N/A',
      durationValue: subscription.variant?.durationValue,
      durationUnit: subscription.variant?.durationUnit,
      price: subscription.variant?.price,
      status: newStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysRemaining: subscription.daysRemaining
    };

    // Create the notification
    const notificationData = {
      title: title,
      message: message,
      userId: subscription.user?._id || subscription.user,
      subscriptionId: subscription._id,
      notificationType: notificationType,
      isBroadcast: false, // NOT a broadcast - user-specific
      isRead: false,
      metadata: {
        oldStatus: oldStatus,
        newStatus: newStatus,
        triggeredBy: triggeredBy,
        subscriptionDetails: subscriptionDetails
      }
    };

    // console.log('📝 Creating notification with data:', {
    //   userId: notificationData.userId,
    //   subscriptionId: notificationData.subscriptionId,
    //   notificationType: notificationData.notificationType
    // });

    const notification = await this.create(notificationData);

    // console.log(`✅ [Notification.createSubscriptionStatusNotification] Auto-notification created: ${notification._id}`);
    // console.log(`   User ID: ${notification.userId}`);
    // console.log(`   Type: ${notification.notificationType}`);
    // console.log(`   Title: ${notification.title}`);

    return notification;
  } catch (error) {
    console.error('❌ [Notification.createSubscriptionStatusNotification] ERROR:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:');
    console.error('   Subscription:', subscription?._id);
    console.error('   Old Status:', oldStatus);
    console.error('   New Status:', newStatus);
    console.error('   Triggered By:', triggeredBy);
    return null;
  }
};

// ✅ NEW: Create ADMIN BROADCAST notification (ONE document for all users)
NotificationSchema.statics.createAdminBroadcastNotification = async function (data) {
  try {
    const { title, message, adminId, notificationType = 'general', targetAudience = 'all', targetProductId } = data;

    // console.log(`📢 [Notification] Creating BROADCAST notification: "${title}"`);

    // Get total users count
    const User = mongoose.models.User;
    const totalUsers = await User.countDocuments({});

    // Create ONE broadcast notification (NO userId field)
    const broadcastNotification = await this.create({
      title,
      message,
      sentBy: adminId,
      notificationType,
      targetAudience, // ✅ Save targeting info
      targetProductId, // ✅ Save target product if any
      isBroadcast: true, // ✅ Mark as broadcast
      readBy: [], // ✅ Empty array initially
      metadata: {
        triggeredBy: 'admin',
        adminId,
        totalUsers,
        changeReason: 'Admin broadcast to ' + (targetAudience === 'product_wise' ? 'product ' + targetProductId : 'all users')
      }
    });

    // console.log(`✅ BROADCAST notification created: ${broadcastNotification._id}`);
    // console.log(`   Total users: ${totalUsers}`);

    return broadcastNotification;
  } catch (error) {
    console.error('❌ Error creating broadcast notification:', error);
    return null;
  }
};

// ✅ NEW: Mark broadcast as read by specific user
NotificationSchema.statics.markBroadcastAsRead = async function (notificationId, userId, userData) {
  try {
    const notification = await this.findById(notificationId);

    if (!notification || !notification.isBroadcast) {
      return { success: false, error: 'Broadcast notification not found' };
    }

    // Check if user already read it
    const alreadyRead = notification.readBy.some(reader =>
      reader.userId.toString() === userId.toString()
    );

    if (!alreadyRead) {
      // Add user to readBy array
      notification.readBy.push({
        userId,
        name: userData.name,
        email: userData.email,
        readAt: new Date()
      });

      await notification.save();
      // console.log(`✅ User ${userId} marked broadcast as read`);
    }

    return {
      success: true,
      alreadyRead,
      readCount: notification.readBy.length
    };
  } catch (error) {
    console.error('Error marking broadcast as read:', error);
    return { success: false, error: error.message };
  }
};

// ✅ NEW: Soft delete notification for user (Hide it)
NotificationSchema.statics.hideNotificationForUser = async function (notificationId, userId) {
  try {
    // console.log(`🙈 Hiding notification ${notificationId} for user ${userId}`);
    const notification = await this.findById(notificationId);

    if (!notification) {
      return { success: false, error: 'Notification not found' };
    }

    // Check if user is authorized (owner or broadcast recipient)
    if (!notification.isBroadcast && notification.userId && notification.userId.toString() !== userId.toString()) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if already hidden
    const isHidden = notification.hiddenFor?.some(h => h.userId.toString() === userId.toString());

    if (!isHidden) {
      // Add to hiddenFor array
      notification.hiddenFor = notification.hiddenFor || [];
      notification.hiddenFor.push({
        userId: userId,
        hiddenAt: new Date()
      });
      await notification.save();
    }

    return { success: true };
  } catch (error) {
    console.error('Error hiding notification:', error);
    return { success: false, error: error.message };
  }
};

// ✅ NEW: Get ALL notifications for user (broadcast + personal)
NotificationSchema.statics.getUserNotifications = async function (userId, options = {}) {
  try {
    const {
      page = 1,
      limit = 50,
      showUnreadOnly = false,
      notificationType,
      userAudiences = ['all'],
      userCreatedAt = new Date(0),
      activeSubscriptionRanges = [],
      expiredSubscriptionRanges = [], // ✅ NEW: Historical expired ranges
      expiresoonSubscriptionRanges = [], // ✅ NEW: Historical expiresoon ranges
      productActiveRanges = {}, // ✅ Map of { productId: Array<{startDate, endDate}> }
      productExpiredRanges = {}, // ✅ NEW: Map of { productId: Array<{startDate, endDate}> }
      productExpiresoonRanges = {}, // ✅ NEW: Map of { productId: Array<{startDate, endDate}> }
      productStatusMap = {} // ✅ NEW: Map of { productId: status }
    } = options;
    const skip = (page - 1) * limit;

    // Build audience conditions dynamically
    let audienceConditions = [
      { targetAudience: 'all' },
      { targetAudience: 'general' }, // Backward compatibility
      { targetAudience: { $exists: false } } // Backward compatibility
    ];

    // ✅ NEW: Handle state-based audiences (active, expiresoon, expired) with TIME-RANGE support
    const stateTypes = ['active', 'expiresoon', 'expired'];
    stateTypes.forEach(state => {
      const isTargeted = userAudiences.includes(state);

      // Determine which ranges to use for this state
      let globalRanges = [];
      let productRangesMap = {};

      if (state === 'active') {
        globalRanges = activeSubscriptionRanges;
        productRangesMap = productActiveRanges;
      } else if (state === 'expiresoon') {
        globalRanges = expiresoonSubscriptionRanges;
        productRangesMap = productExpiresoonRanges;
      } else if (state === 'expired') {
        globalRanges = expiredSubscriptionRanges;
        productRangesMap = productExpiredRanges;
      }

      if (isTargeted || globalRanges.length > 0) {
        const condition = { targetAudience: state };
        const stateOrConditions = [];

        // 1. Global matching (no targetProductId)
        if (globalRanges.length > 0) {
          stateOrConditions.push({
            targetProductId: { $exists: false },
            $or: globalRanges.map(range => ({
              createdAt: { $gte: range.startDate, $lte: range.endDate }
            }))
          });
        }

        // 2. Product-specific matching
        // ✅ KEEP: ranges for product-specific targeting to allow historical visibility per product
        for (const [pid, ranges] of Object.entries(productRangesMap)) {
          if (ranges && ranges.length > 0) {
            stateOrConditions.push({
              targetProductId: new mongoose.Types.ObjectId(pid),
              $or: ranges.map(range => ({
                createdAt: { $gte: range.startDate, $lte: range.endDate }
              }))
            });
          }
        }

        if (stateOrConditions.length > 0) {
          condition.$or = stateOrConditions;
          audienceConditions.push(condition);
        }
      }
    });

    // ✅ Handle 'product_wise' audience
    // Broadened: User sees it if they had ANY subscription (active OR expired) for that product
    if ((productActiveRanges && Object.keys(productActiveRanges).length > 0) ||
      (productExpiredRanges && Object.keys(productExpiredRanges).length > 0)) {
      const productConditions = [];

      // Check Active ranges for the product
      for (const [productId, ranges] of Object.entries(productActiveRanges)) {
        if (ranges && ranges.length > 0) {
          productConditions.push({
            targetAudience: 'product_wise',
            targetProductId: new mongoose.Types.ObjectId(productId),
            $or: ranges.map(range => ({
              createdAt: { $gte: range.startDate, $lte: range.endDate }
            }))
          });
        }
      }

      // Check Expiring Soon ranges for the product
      for (const [productId, ranges] of Object.entries(productExpiresoonRanges)) {
        if (ranges && ranges.length > 0) {
          productConditions.push({
            targetAudience: 'product_wise',
            targetProductId: new mongoose.Types.ObjectId(productId),
            $or: ranges.map(range => ({
              createdAt: { $gte: range.startDate, $lte: range.endDate }
            }))
          });
        }
      }

      if (productConditions.length > 0) {
        audienceConditions.push({ $or: productConditions });
      }
    }

    // Query for: 
    // 1. User's personal notifications (userId matches)
    // 2. Broadcast notifications (isBroadcast: true AND audience matches AND created AFTER user joined)
    // 3. AND NOT hidden for this user
    let query = {
      $and: [
        {
          $or: [
            { userId: userId }, // Personal notifications
            {
              isBroadcast: true,
              createdAt: { $gte: userCreatedAt }, // ✅ Only show broadcasts created AFTER user joined
              $or: audienceConditions
            }
          ]
        },
        // ✅ NEW: Exclude notifications hidden by this user
        {
          'hiddenFor.userId': { $ne: userId }
        }
      ]
    };

    // ✅ ADDED: Filter by notification type if provided
    let typeFilter = null;
    if (notificationType) {
      // Support comma-separated list of types
      const types = typeof notificationType === 'string'
        ? notificationType.split(',').map(t => t.trim())
        : Array.isArray(notificationType)
          ? notificationType
          : [notificationType];

      typeFilter = { notificationType: { $in: types } };
    }

    if (showUnreadOnly) {
      // Better approach: combine base query (which has perfect audience targeting) with unread check
      query = {
        $and: [
          query, // Inherit all audience/time-travel logic
          {
            $or: [
              { userId: userId, isRead: false }, // Personal unread
              { isBroadcast: true, readBy: { $not: { $elemMatch: { userId: userId } } } } // Broadcast unread
            ]
          }
        ]
      };
    } else if (typeFilter) {
      // If only type filter (no unread filter), combine with base query
      query = {
        $and: [
          query,
          typeFilter
        ]
      };
    }

    // Check if Admin model is registered before populating
    const hasAdminModel = mongoose.models.Admin !== undefined;

    let queryBuilder = this.find(query);

    // Only populate sentBy if Admin model exists
    if (hasAdminModel) {
      queryBuilder = queryBuilder.populate('sentBy', 'name email');
    }

    const [notifications, total] = await Promise.all([
      queryBuilder
        .populate('subscriptionId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.countDocuments(query)
    ]);

    // Calculate unread count (using the same strict query)
    const unreadQuery = {
      $and: [
        query,
        {
          $or: [
            { userId: userId, isRead: false },
            { isBroadcast: true, readBy: { $not: { $elemMatch: { userId: userId } } } }
          ]
        }
      ]
    };
    // The previous `unreadQuery` in the pasted code was flawed because it redefined audience logic loosely.
    // Re-using `query` is safer but `query` might already have unread filters if showUnreadOnly was true.
    // If showUnreadOnly was true, query is already observing unread.
    // If showUnreadOnly was false, we need to construct a parallel query for unread count.

    // Reconstruct clean query for Unread Count stats (ignoring pagination filters)
    let statsBaseQuery = {
      $or: [
        { userId: userId },
        {
          isBroadcast: true,
          createdAt: { $gte: userCreatedAt },
          $or: audienceConditions
        }
      ]
    };

    const unreadCountQuery = {
      $and: [
        statsBaseQuery,
        {
          $or: [
            { userId: userId, isRead: false },
            { isBroadcast: true, readBy: { $not: { $elemMatch: { userId: userId } } } }
          ]
        },
        {
          'hiddenFor.userId': { $ne: userId }
        }
      ]
    };

    const unreadCount = await this.countDocuments(unreadCountQuery);

    // Enhance broadcast notifications with user's read status and stats
    const User = mongoose.models.User;
    const totalUsers = await User.countDocuments({});

    const enhancedNotifications = notifications.map(notification => {
      const notificationObj = notification.toObject();

      if (notification.isBroadcast) {
        // Check if user has read this broadcast
        const hasRead = notification.readBy.some(reader =>
          reader.userId.toString() === userId.toString()
        );
        notificationObj.isRead = hasRead;
        notificationObj.readCount = notification.readBy.length;
        // Ensure totalUsers is available from metadata or use current total
        if (!notificationObj.metadata?.totalUsers) {
          if (!notificationObj.metadata) notificationObj.metadata = {};
          notificationObj.metadata.totalUsers = totalUsers;
        }
      }

      return notificationObj;
    });

    return {
      notifications: enhancedNotifications,
      total,
      unreadCount
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
};

// ✅ FIXED: New subscription notification (for payments)
NotificationSchema.statics.createNewSubscriptionNotification = async function (subscription) {
  try {
    // console.log(`🎉 [Notification] Creating new subscription notification`);
    // console.log(`   Subscription ID: ${subscription._id}`);
    // console.log(`   User ID: ${subscription.user}`);
    // console.log(`   Product: ${subscription.product?.heading || 'Unknown'}`);

    return await this.createSubscriptionStatusNotification(
      subscription,
      null,
      'active',
      'payment'
    );
  } catch (error) {
    console.error('❌ Error creating new subscription notification:', error);
    console.error('❌ Error stack:', error.stack);
    return null;
  }
};

// ✅ NEW: Get broadcast statistics for admin
NotificationSchema.statics.getBroadcastStats = async function (notificationId) {
  try {
    const notification = await this.findById(notificationId)
      .populate('sentBy', 'name email')
      .populate('readBy.userId', 'name email');

    if (!notification || !notification.isBroadcast) {
      console.log('❌ Broadcast notification not found:', notificationId);
      return null;
    }

    // Get total users count
    const User = mongoose.models.User;
    const totalUsers = await User.countDocuments({});

    return {
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        sentBy: notification.sentBy,
        createdAt: notification.createdAt,
        notificationType: notification.notificationType
      },
      stats: {
        totalUsers,
        readByCount: notification.readBy.length,
        notReadByCount: totalUsers - notification.readBy.length,
        readPercentage: totalUsers > 0 ?
          Math.round((notification.readBy.length / totalUsers) * 100) : 0,
        readBy: notification.readBy.map(reader => ({
          userId: reader.userId,
          name: reader.name || reader.userId?.name,
          email: reader.email || reader.userId?.email,
          readAt: reader.readAt
        }))
      }
    };
  } catch (error) {
    console.error('❌ Error getting broadcast stats:', error);
    return null;
  }
};

// ✅ NEW: Get all broadcast notifications for admin
NotificationSchema.statics.getBroadcastNotifications = async function (options = {}) {
  try {
    const { page = 1, limit = 20, adminId } = options;
    const skip = (page - 1) * limit;

    let query = { isBroadcast: true };

    if (adminId && adminId !== 'current' && adminId !== 'undefined' && adminId !== 'null') {
      // Only filter by adminId if it's a valid ObjectId
      try {
        const objectId = new mongoose.Types.ObjectId(adminId);
        query.sentBy = objectId;
      } catch (error) {
        console.log('⚠️ Invalid adminId for filtering:', adminId);
        // Don't filter by adminId if it's invalid
      }
    }

    const [notifications, total] = await Promise.all([
      this.find(query)
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.countDocuments(query)
    ]);

    // Get total users for each broadcast
    const User = mongoose.models.User;
    const totalUsers = await User.countDocuments({});

    const notificationsWithStats = await Promise.all(
      notifications.map(async notification => {
        const notificationObj = notification.toObject();
        notificationObj.readCount = notification.readBy.length;
        notificationObj.readPercentage = totalUsers > 0 ?
          Math.round((notification.readBy.length / totalUsers) * 100) : 0;
        return notificationObj;
      })
    );

    return {
      notifications: notificationsWithStats,
      total,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ Error getting broadcast notifications:', error);
    return { notifications: [], total: 0, pages: 0 };
  }
};

// ✅ EXISTING: Find notifications for user (backward compatibility)
NotificationSchema.statics.findForUser = function (userId, options = {}) {
  const { limit = 50, skip = 0, unreadOnly = false, notificationType } = options;

  let query = { userId: userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (notificationType) {
    query.notificationType = notificationType;
  }

  return this.find(query)
    .populate('sentBy', 'name email')
    .populate('subscriptionId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// ✅ EXISTING: Get unread count for user
NotificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    userId: userId,
    isRead: false
  });
};

// ✅ EXISTING: Mark notification as read (instance method)
NotificationSchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// ✅ EXISTING: Find admin-created notifications
NotificationSchema.statics.findAdminCreatedNotifications = function (options = {}) {
  const { page = 1, limit = 20, adminId } = options;
  const skip = (page - 1) * limit;

  let query = {
    sentBy: { $ne: null },
    'metadata.triggeredBy': 'admin'
  };

  if (adminId && adminId !== 'current') {
    query.sentBy = adminId;
  }

  return this.find(query)
    .populate('sentBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// ✅ EXISTING: Create admin notification (multiple documents - for backward compatibility)
NotificationSchema.statics.createAdminNotification = async function (data) {
  try {
    // console.log(`📝 Creating admin notification (multiple documents)`);

    const User = mongoose.models.User;
    const users = await User.find({}, '_id name email');

    const notifications = [];

    for (const user of users) {
      const notification = await this.create({
        title: data.title,
        message: data.message,
        notificationType: data.notificationType || 'general',
        subscriptionId: data.subscriptionId || null,
        userId: user._id,
        sentBy: data.adminId,
        metadata: {
          triggeredBy: 'admin',
          adminId: data.adminId,
          changeReason: data.changeReason || 'Manual admin notification'
        }
      });
      notifications.push(notification);
    }

    // console.log(`✅ Admin notification created for ${notifications.length} users`);
    return notifications;
  } catch (error) {
    console.error('Error creating admin notification:', error);
    return [];
  }
};

// ✅ EXISTING: Get statistics
NotificationSchema.statics.getStatistics = async function () {
  try {
    const [
      totalCount,
      unreadCount,
      byType
    ] = await Promise.all([
      this.countDocuments(),
      this.countDocuments({ isRead: false }),
      this.aggregate([
        {
          $group: {
            _id: '$notificationType',
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Get today's notifications count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.countDocuments({
      createdAt: { $gte: today }
    });

    return {
      totals: {
        all: totalCount,
        unread: unreadCount,
        today: todayCount
      },
      byType: byType.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          unread: item.unread
        };
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting notification statistics:', error);
    return {
      totals: { all: 0, unread: 0, today: 0 },
      byType: {}
    };
  }
};

// Create and export the model
// ✅ PERFORMANCE INDEXES
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ isBroadcast: 1, createdAt: -1 });
NotificationSchema.index({ targetAudience: 1 });
NotificationSchema.index({ targetProductId: 1 });
NotificationSchema.index({ subscriptionId: 1 }); // Important for deduplication check
NotificationSchema.index({ 'hiddenFor.userId': 1 });

const Notification = mongoose.models.Notification ||
  mongoose.model('Notification', NotificationSchema);

export default Notification;