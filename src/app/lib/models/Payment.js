// src/app/lib/models/Payment.js - ADD MISSING METHOD
import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true
  },
  // amountInPaise removed as per request
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: [
      'created',
      'attempted',
      'authorized',
      'captured',
      'failed',
      'cancelled',
      'refunded',
      'expired',
      'pending'
    ],
    default: 'created'
  },
  paymentMethod: {
    type: String,
    default: 'razorpay'
  },
  description: {
    type: String
  },
  subscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  }],
  metadata: {
    razorpayResponse: Object,
    errorDetails: Object,
    cartItems: Array,
    subscriptionDetails: Array,
    taxAmount: mongoose.Schema.Types.Decimal128,
    subtotal: mongoose.Schema.Types.Decimal128,
    paymentVerifiedAt: Date,
    failedAt: Date,
    cancelledAt: Date,
    totalInRupees: mongoose.Schema.Types.Decimal128,
    totalInPaise: mongoose.Schema.Types.Decimal128,
    originalOrderAmount: Number,
    storageFormat: String,
    conversionApplied: Boolean,
    createdAt: Date,
    itemsCount: Number
  }
}, {
  timestamps: true
});

// Remove duplicate indexes
// Duplicate indexes removed (razorpayOrderId and razorpayPaymentId already defined in schema)
PaymentSchema.index({ user: 1, createdAt: -1 });

// ========== PRE-SAVE MIDDLEWARE ==========

PaymentSchema.pre('save', function (next) {
  if (this.isNew) {
    // Convert main amounts to Decimal128
    if (typeof this.amount === 'number') {
      this.amount = new mongoose.Types.Decimal128(this.amount.toFixed(2));
    }

    // Convert metadata amounts
    if (this.metadata) {
      if (typeof this.metadata.subtotal === 'number') {
        this.metadata.subtotal = new mongoose.Types.Decimal128(this.metadata.subtotal.toFixed(2));
      }
      if (typeof this.metadata.taxAmount === 'number') {
        this.metadata.taxAmount = new mongoose.Types.Decimal128(this.metadata.taxAmount.toFixed(2));
      }
      if (typeof this.metadata.totalInRupees === 'number') {
        this.metadata.totalInRupees = new mongoose.Types.Decimal128(this.metadata.totalInRupees.toFixed(2));
      }
      if (typeof this.metadata.totalInPaise === 'number') {
        this.metadata.totalInPaise = new mongoose.Types.Decimal128(this.metadata.totalInPaise.toString());
      }
    }
  }
  next();
});

// ========== STATIC METHODS ==========

// ADD THIS MISSING METHOD
PaymentSchema.statics.getUserPayments = async function (userId, limit = 10, page = 1) {
  try {
    const skip = (page - 1) * limit;

    // 1. Fetch lean payments (FAST)
    const payments = await this.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.countDocuments({ user: userId });

    // 2. Extract Subscriptions IDs
    const subscriptionIds = payments.flatMap(p => p.subscriptions || []);

    // 3. Batch Fetch Subscriptions
    let subscriptions = [];
    if (subscriptionIds.length > 0) {
      const Subscription = mongoose.models.Subscription || mongoose.model('Subscription');
      subscriptions = await Subscription.find({ _id: { $in: subscriptionIds } })
        .select('status startDate endDate product variant paymentStatus')
        .lean();
    }

    // 4. Extract Product IDs
    const productIds = subscriptions.map(s => s.product).filter(Boolean);

    // 5. Batch Fetch Products
    let products = [];
    if (productIds.length > 0) {
      const Product = mongoose.models.Product || mongoose.model('Product');
      products = await Product.find({ _id: { $in: productIds } })
        .select('heading title filename category')
        .lean();
    }

    // 6. Map Data in Memory
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    const subscriptionMap = new Map(subscriptions.map(s => {
      const sub = { ...s };
      if (sub.product) {
        const pId = sub.product.toString();
        sub.product = productMap.get(pId) || sub.product;
      }
      return [s._id.toString(), sub];
    }));

    // 7. Attach to Payments
    const populatedPayments = payments.map(payment => {
      if (payment.subscriptions && payment.subscriptions.length > 0) {
        payment.subscriptions = payment.subscriptions.map(id => subscriptionMap.get(id.toString())).filter(Boolean);
      }
      return payment;
    });

    // Convert Decimal128 to numbers for response
    const formattedPayments = populatedPayments.map(payment => {
      const formatted = { ...payment };

      // Convert amount fields
      if (formatted.amount && formatted.amount._bsontype === 'Decimal128') {
        formatted.amount = parseFloat(formatted.amount.toString());
      }
      if (formatted.amountInPaise && formatted.amountInPaise._bsontype === 'Decimal128') {
        formatted.amountInPaise = parseFloat(formatted.amountInPaise.toString());
      }

      // Convert metadata amounts
      if (formatted.metadata) {
        if (formatted.metadata.subtotal && formatted.metadata.subtotal._bsontype === 'Decimal128') {
          formatted.metadata.subtotal = parseFloat(formatted.metadata.subtotal.toString());
        }
        if (formatted.metadata.taxAmount && formatted.metadata.taxAmount._bsontype === 'Decimal128') {
          formatted.metadata.taxAmount = parseFloat(formatted.metadata.taxAmount.toString());
        }
        if (formatted.metadata.totalInRupees && formatted.metadata.totalInRupees._bsontype === 'Decimal128') {
          formatted.metadata.totalInRupees = parseFloat(formatted.metadata.totalInRupees.toString());
        }
        if (formatted.metadata.totalInPaise && formatted.metadata.totalInPaise._bsontype === 'Decimal128') {
          formatted.metadata.totalInPaise = parseFloat(formatted.metadata.totalInPaise.toString());
        }
      }

      return formatted;
    });

    return {
      payments: formattedPayments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPayments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Error getting user payments:', error);
    throw error;
  }
};

// Keep other methods the same...
PaymentSchema.statics.createPaymentRecord = async function (orderData, cartItems = []) {
  try {
    // Calculate amounts with precise decimal handling
    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.discountedPrice) || Number(item.price) || 0), 0);
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100; // 18% GST
    const totalInRupees = Math.round((subtotal + taxAmount) * 100) / 100;

    const paymentData = {
      razorpayOrderId: orderData.id,
      amount: totalInRupees,
      currency: orderData.currency || 'INR',
      status: 'created',
      description: `Order created for ${cartItems.length} item(s)`,
      metadata: {
        cartItems: cartItems,
        subtotal: subtotal,
        taxAmount: taxAmount,
        totalInRupees: totalInRupees,
        // totalInPaise kept in metadata if needed for reference but removed from top level schema
        totalInPaise: Math.round(totalInRupees * 100),
        originalOrderAmount: orderData.amount,
        storageFormat: 'rupees',
        conversionApplied: true,
        createdAt: new Date(),
        itemsCount: cartItems.length
      }
    };

    const payment = new this(paymentData);
    await payment.save();

    return payment;
  } catch (error) {
    console.error('❌ Error creating payment record:', error.message);
    return null;
  }
};

PaymentSchema.statics.logPaymentCaptured = async function (orderId, paymentResponse, subscriptionIds = [], userId = null) {
  try {
    const updateData = {
      $set: {
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        status: 'captured',
        subscriptions: subscriptionIds,
        'metadata.razorpayResponse': paymentResponse,
        'metadata.paymentVerifiedAt': new Date()
      }
    };

    if (userId) {
      updateData.$set.user = userId;
    }

    const payment = await this.findOneAndUpdate(
      { razorpayOrderId: orderId },
      updateData,
      { new: true }
    );

    return payment;
  } catch (error) {
    console.error('❌ Error updating payment to captured:', error);
    return null;
  }
};

PaymentSchema.statics.logPaymentFailure = async function (orderId, errorData, cartItems = []) {
  try {
    const payment = await this.findOneAndUpdate(
      { razorpayOrderId: orderId },
      {
        $set: {
          status: 'failed',
          'metadata.errorDetails': errorData,
          'metadata.cartItems': cartItems,
          'metadata.failedAt': new Date()
        }
      },
      { new: true, upsert: true }
    );

    return payment;
  } catch (error) {
    console.error('❌ Error logging payment failure:', error);
    return null;
  }
};

// ========== INSTANCE METHODS ==========

PaymentSchema.methods.getAmountInRupees = function () {
  try {
    if (this.amount instanceof mongoose.Types.Decimal128) {
      return parseFloat(this.amount.toString());
    }
    return this.amount;
  } catch (error) {
    console.error('❌ Error getting amount in rupees:', error);
    return 0;
  }
};

PaymentSchema.methods.getAmountInPaise = function () {
  try {
    if (this.amountInPaise instanceof mongoose.Types.Decimal128) {
      return parseFloat(this.amountInPaise.toString());
    }
    return this.amountInPaise || (this.amount * 100);
  } catch (error) {
    console.error('❌ Error getting amount in paise:', error);
    return 0;
  }
};

// ========== VIRTUAL FIELDS ==========

PaymentSchema.virtual('displayAmount').get(function () {
  return this.getAmountInRupees();
});

PaymentSchema.virtual('safeDisplay').get(function () {
  const amount = this.getAmountInRupees();
  return `₹${amount.toFixed(2)}`;
});

// ========== TOJSON TRANSFORMATION ==========

PaymentSchema.set('toJSON', {
  transform: function (doc, ret) {
    // Convert Decimal128 to numbers for JSON output
    if (ret.amount && ret.amount._bsontype === 'Decimal128') {
      ret.amount = parseFloat(ret.amount.toString());
    }
    if (ret.metadata?.subtotal && ret.metadata.subtotal._bsontype === 'Decimal128') {
      ret.metadata.subtotal = parseFloat(ret.metadata.subtotal.toString());
    }
    if (ret.metadata?.taxAmount && ret.metadata.taxAmount._bsontype === 'Decimal128') {
      ret.metadata.taxAmount = parseFloat(ret.metadata.taxAmount.toString());
    }
    if (ret.metadata?.totalInRupees && ret.metadata.totalInRupees._bsontype === 'Decimal128') {
      ret.metadata.totalInRupees = parseFloat(ret.metadata.totalInRupees.toString());
    }
    if (ret.metadata?.totalInPaise && ret.metadata.totalInPaise._bsontype === 'Decimal128') {
      ret.metadata.totalInPaise = parseFloat(ret.metadata.totalInPaise.toString());
    }
    return ret;
  }
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);