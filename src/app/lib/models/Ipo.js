import mongoose from 'mongoose';

const ipoSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters']
    },
    openingDate: {
      type: Date,
      required: [true, 'Opening date is required']
    },
    closingDate: {
      type: Date,
      required: [true, 'Closing date is required']
    },
    issuePrice: {
      type: String,
      required: [true, 'Issue price is required'],
      trim: true
    },
    link: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for formatted dates
ipoSchema.virtual('formattedOpeningDate').get(function () {
  return this.openingDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

ipoSchema.virtual('formattedClosingDate').get(function () {
  return this.closingDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

// Indexes
ipoSchema.index({ company: 1 });
ipoSchema.index({ openingDate: -1 });
ipoSchema.index({ isActive: 1 });
ipoSchema.index({ createdAt: -1 });

export default mongoose.models.Ipo || mongoose.model('Ipo', ipoSchema);