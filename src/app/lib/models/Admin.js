// src/app/lib/models/Admin.js
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    mobile: {
      type: String,
      required: [true, 'Please provide a mobile number'],
      unique: true,
      match: [/^[0-9]{10,15}$/, 'Please enter a valid 10-15 digit mobile number'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false, // Hide password in queries
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'super_admin'],
        message: 'Role must be either admin or super_admin'
      },
      default: 'admin',
      required: true,
    },
    permissions: {
      // Super admins have all permissions automatically
      userManagement: { type: Boolean, default: false },
      contentManagement: { type: Boolean, default: false },
      systemSettings: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      billing: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance

adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ createdAt: -1 });

// Auto-update last login timestamp and handle permissions based on role
adminSchema.pre('save', function (next) {
  // Update last login if modified
  if (this.isModified('lastLogin')) {
    this.lastLogin = new Date();
  }

  // Auto-set permissions for super_admin
  if (this.role === 'super_admin' && this.isModified('role')) {
    this.permissions = {
      userManagement: true,
      contentManagement: true,
      systemSettings: true,
      analytics: true,
      billing: true,
    };
  }

  next();
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance method to check permission
adminSchema.methods.hasPermission = function (permission) {
  if (this.role === 'super_admin') {
    return true; // Super admins have all permissions
  }
  return this.permissions[permission] || false;
};

// Static method to find by email (including password for auth)
adminSchema.statics.findByEmail = function (email) {
  return this.findOne({ email }).select('+password');
};

// Static method to find active admins only
adminSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

// Method to increment login attempts
adminSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Otherwise we're incrementing
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock the account if we've reached max attempts and it's not already locked
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + (2 * 60 * 60 * 1000) }; // 2 hours
  }

  return this.updateOne(updates);
};

// JSON transformation to hide sensitive fields
adminSchema.methods.toJSON = function () {
  const admin = this.toObject();
  delete admin.password;
  delete admin.loginAttempts;
  delete admin.lockUntil;
  return admin;
};

export default mongoose.models.Admin || mongoose.model('Admin', adminSchema);