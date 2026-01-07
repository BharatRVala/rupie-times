// src/app/lib/models/Subscription.js - UPDATED VERSION
import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    duration: {
      type: String,
      required: true
    },
    durationValue: {
      type: Number,
      required: true,
      min: 1
    },
    durationUnit: {
      type: String,
      required: true,
      enum: ['minutes', 'hours', 'days', 'weeks', 'months', 'years']
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    // New fields for financial accuracy
    discountApplied: {
      type: Number,
      default: 0
    },
    originalPrice: {
      type: Number
    },
    amountPaid: {
      type: Number
    }
  },
  // ✅ NEW: Track if this is a renewal of previous subscription
  isRenewal: {
    type: Boolean,
    default: false
  },
  renewedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  // ✅ NEW: Track original subscription start for contiguous access
  originalStartDate: {
    type: Date,
    default: function () {
      return this.startDate;
    }
  },
  // ✅ NEW: Track contiguous subscription chain
  contiguousChainId: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'expiresoon'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: {
    type: String
  },
  transactionId: {
    type: String
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  replacedSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  lastStatusCheck: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  },
  historicalArticleLimit: {
    type: Number,
    default: 5,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
SubscriptionSchema.index({ user: 1, status: 1, endDate: 1 });
SubscriptionSchema.index({ user: 1, paymentStatus: 1 });
SubscriptionSchema.index({ user: 1, isLatest: 1 });

// ========== VIRTUAL FIELDS ==========

// ✅ Virtual for checking if subscription is actually active
SubscriptionSchema.virtual('isActive').get(function () {
  if (this.status === 'expired') return false;
  const now = new Date();
  return (this.status === 'active' || this.status === 'expiresoon') && this.endDate > now;
});

// ✅ Virtual for checking if subscription is expiring soon (2 days or less)
SubscriptionSchema.virtual('isExpiringSoon').get(function () {
  if (this.status !== 'active') return false;

  const now = new Date();
  const endDate = new Date(this.endDate);
  const timeDiff = endDate - now;
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  return daysRemaining <= 10 && daysRemaining > 0;
});

// ✅ Virtual for getting days remaining
SubscriptionSchema.virtual('daysRemaining').get(function () {
  if (this.status !== 'active') return 0;

  const now = new Date();
  const endDate = new Date(this.endDate);
  if (endDate < now) return 0;

  const timeDiff = endDate - now;
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

// ✅ Virtual for subscription value
SubscriptionSchema.virtual('totalValue').get(function () {
  return this.variant?.price || 0;
});

// ========== METHODS ==========

// ✅ METHOD: Calculate end date
SubscriptionSchema.methods.calculateEndDate = function (durationValue, durationUnit) {
  const start = this.startDate || new Date();
  const end = new Date(start);

  switch (durationUnit) {
    case 'minutes':
      end.setMinutes(end.getMinutes() + durationValue);
      break;
    case 'hours':
      end.setHours(end.getHours() + durationValue);
      break;
    case 'days':
      end.setDate(end.getDate() + durationValue);
      break;
    case 'weeks':
      end.setDate(end.getDate() + (durationValue * 7));
      break;
    case 'months':
      end.setMonth(end.getMonth() + durationValue);
      break;
    case 'years':
      end.setFullYear(end.getFullYear() + durationValue);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }

  return end;
};

// ✅ METHOD: Get subscription details for notifications
SubscriptionSchema.methods.getSubscriptionDetails = function () {
  return {
    subscriptionId: this._id,
    userId: this.user,
    productId: this.product,
    productName: this.product?.heading || 'Subscription',
    duration: this.variant?.duration || '',
    durationValue: this.variant?.durationValue || 0,
    durationUnit: this.variant?.durationUnit || 'days',
    price: this.variant?.price || 0,
    status: this.status,
    startDate: this.startDate,
    endDate: this.endDate,
    daysRemaining: this.daysRemaining
  };
};

// ✅ NEW STATICS for Contiguous Logic
SubscriptionSchema.statics.canRenewContiguously = async function (userId, productId, newStartDate) {
  try {
    const now = new Date();

    // Find the most recent active or recently expired subscription
    const latestSubscription = await this.findOne({
      user: userId,
      product: productId,
      paymentStatus: 'completed'
    })
      .sort({ endDate: -1 })
      .lean();

    if (!latestSubscription) {
      return {
        canRenew: true,
        isContiguous: false,
        previousSubscription: null,
        gapInDays: 0,
        effectiveStartDate: newStartDate
      };
    }

    const latestEnd = new Date(latestSubscription.endDate);
    const newStart = new Date(newStartDate);

    // Calculate gap between subscriptions
    const gapInDays = Math.max(0, Math.ceil((newStart - latestEnd) / (1000 * 60 * 60 * 24)));

    // Contiguous if gap is 0 or negative (overlap) or small grace period (e.g., 7 days)
    const isContiguous = gapInDays <= 7; // Allow 7 days grace period for renewal

    // If contiguous, use original start date; otherwise use new start date
    const effectiveStartDate = isContiguous ?
      (latestSubscription.originalStartDate || latestSubscription.startDate) :
      newStartDate;

    return {
      canRenew: true,
      isContiguous,
      previousSubscription: latestSubscription,
      gapInDays,
      effectiveStartDate: new Date(effectiveStartDate),
      originalStartDate: new Date(latestSubscription.originalStartDate || latestSubscription.startDate)
    };
  } catch (error) {
    console.error('Error checking renewal continuity:', error);
    return {
      canRenew: true,
      isContiguous: false,
      previousSubscription: null,
      gapInDays: 0,
      effectiveStartDate: newStartDate
    };
  }
};

SubscriptionSchema.statics.generateContiguousChainId = function (userId, productId) {
  return `${userId}_${productId}_${Date.now()}`;
};

// ========== STATIC METHODS ==========

// ✅ STATIC: Create notification for subscription status change
SubscriptionSchema.statics.createStatusChangeNotification = async function (subscriptionId, oldStatus, newStatus) {
  try {
    const Notification = mongoose.models.Notification;
    const Subscription = mongoose.models.Subscription;

    const subscription = await Subscription.findById(subscriptionId)
      .populate('product', 'heading shortDescription')
      .populate('user', 'name email');

    if (!subscription) {
      console.error(`Subscription ${subscriptionId} not found`);
      return null;
    }

    return await Notification.createSubscriptionStatusNotification(
      subscription,
      oldStatus,
      newStatus
    );
  } catch (error) {
    console.error('Error creating status change notification:', error);
    return null;
  }
};

// ✅ STATIC: Check user access
SubscriptionSchema.statics.checkUserAccess = async function (userId, productId) {
  try {
    const activeSubscription = await this.findOne({
      user: userId,
      product: productId,
      status: { $in: ['active', 'expiresoon'] },
      endDate: { $gt: new Date() },
      paymentStatus: 'completed',
      isLatest: true
    }).populate('product', 'heading shortDescription');

    return {
      hasAccess: !!activeSubscription,
      subscription: activeSubscription
    };
  } catch (error) {
    return {
      hasAccess: false,
      subscription: null
    };
  }
};

// ✅ STATIC: Mark old subscriptions as not latest
SubscriptionSchema.statics.markOldSubscriptionsAsNotLatest = async function (userId, productId, keepSubscriptionId) {
  try {
    await this.updateMany(
      {
        user: userId,
        product: productId,
        _id: { $ne: keepSubscriptionId },
        isLatest: true
      },
      {
        $set: { isLatest: false }
      }
    );
  } catch (error) {
    console.error('Error marking old subscriptions:', error);
  }
};

// ✅ STATIC: Find active subscriptions for user
SubscriptionSchema.statics.findActiveSubscriptions = async function (userId) {
  try {
    return await this.find({
      user: userId,
      status: { $in: ['active', 'expiresoon'] },
      endDate: { $gt: new Date() },
      paymentStatus: 'completed',
      isLatest: true
    }).populate('product', 'heading category');
  } catch (error) {
    return [];
  }
};

// ========== MIDDLEWARE ==========

// ✅ PRE-SAVE: Set contiguous chain for renewals
SubscriptionSchema.pre('save', function (next) {
  // Set original start date on new non-renewal subscriptions
  if (!this.isRenewal && !this.originalStartDate) {
    this.originalStartDate = this.startDate;
  }

  // Store old status before save
  if (this.isModified('status')) {
    this._oldStatus = this._oldStatus || this.status;
  }


  // Validate end date is after start date (Skip for expired subscriptions to allow graceful cleanup of bad data)
  if (this.status !== 'expired' && this.startDate && this.endDate && this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }

  // Validate payment status consistency
  if (this.paymentStatus === 'completed' && !this.paymentId) {
    return next(new Error('Payment ID is required for completed payments'));
  }

  next();
});

// ✅ POST-SAVE: Create notification on status change
SubscriptionSchema.post('save', async function (doc) {
  try {
    // Create notification if status changed
    if (this._oldStatus && this._oldStatus !== doc.status) {
      console.log(`🔄 Subscription ${doc._id} status changed: ${this._oldStatus} → ${doc.status}`);

      await doc.constructor.createStatusChangeNotification(
        doc._id,
        this._oldStatus,
        doc.status
      );
    }

    // Update related subscriptions if this becomes latest
    if (doc.isLatest && this.isModified('isLatest')) {
      await doc.constructor.markOldSubscriptionsAsNotLatest(
        doc.user,
        doc.product,
        doc._id
      );
    }
  } catch (error) {
    console.error('Error in subscription post-save hook:', error);
  }
});

SubscriptionSchema.index({ user: 1, product: 1, paymentStatus: 1 });
SubscriptionSchema.index({ contiguousChainId: 1 }); // NEW: Speed up renewal chain lookups

const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
export default Subscription;