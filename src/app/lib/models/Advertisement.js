import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Advertisement name is required'],
      trim: true,
      maxlength: [200, 'Advertisement name cannot exceed 200 characters']
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      enum: {
        values: ['top', 'left', 'right', 'center', 'bottom'],
        message: 'Position must be one of: top, left, right, center, bottom'
      }
    },
    imageFilename: {
      type: String,
      required: [true, 'Image filename is required'],
      trim: true
    },
    imageGridfsId: {
      type: String,
      required: [true, 'Image GridFS ID is required']
    },
    imageContentType: {
      type: String,
      required: [true, 'Image content type is required']
    },
    imageSize: {
      type: Number,
      required: [true, 'Image size is required']
    },
    link: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    width: {
      type: Number,
      default: 300
    },
    height: {
      type: Number,
      default: 250
    },
    isActive: {
      type: Boolean,
      default: true
    },
    clicks: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    clickedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for image URL
advertisementSchema.virtual('imageUrl').get(function () {
  return `/api/advertisements/image/${this.imageFilename}`;
});

// Virtual for thumbnail URL (smaller version)
advertisementSchema.virtual('thumbnailUrl').get(function () {
  return `/api/advertisements/image/${this.imageFilename}?thumbnail=true`;
});

// Virtual for checking overall active status
advertisementSchema.virtual('isOverallActive').get(function () {
  return this.isActive;
});

// Virtual for CTR (Click Through Rate)
advertisementSchema.virtual('ctr').get(function () {
  if (!this.impressions || this.impressions === 0) return 0;
  return Math.round((this.clicks / this.impressions) * 100);
});

// Virtual for Unique Clicks (Count of unique users who clicked)
advertisementSchema.virtual('uniqueClicks').get(function () {
  return this.clickedBy ? this.clickedBy.length : 0;
});

// Indexes
advertisementSchema.index({ position: 1 });
advertisementSchema.index({ isActive: 1 });
advertisementSchema.index({ createdBy: 1 });
advertisementSchema.index({ createdAt: -1 });

// Pre-save middleware to auto-set default dimensions based on position
advertisementSchema.pre('save', function (next) {
  // Set default dimensions based on position if not provided
  if (!this.width || !this.height) {
    switch (this.position) {
      case 'top':
        this.width = 1600;
        this.height = 300;
        break;
      case 'left':
      case 'right':
        this.width = 200;
        this.height = 800;
        break;
      case 'center':
        this.width = 1200;
        this.height = 600;
        break;
      case 'bottom':
        this.width = 400;
        this.height = 300;
        break;
      default:
        this.width = 300;
        this.height = 250;
    }
  }

  next();
});

export default mongoose.models.Advertisement || mongoose.model('Advertisement', advertisementSchema);