import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '10m' }, // Auto delete after 10 minutes
    },
    used: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
passwordResetSchema.index({ email: 1, used: 1 });


// Generate OTP
passwordResetSchema.statics.generateOTP = function () {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate token
passwordResetSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

export default mongoose.models.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);