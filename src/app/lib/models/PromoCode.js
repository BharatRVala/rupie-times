import mongoose from 'mongoose';

const PromoCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ['flat', 'percentage'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date
    },
    usageLimit: {
        type: Number,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster lookups
// PromoCodeSchema.index({ code: 1 }, { unique: true }); // Removed: duplicate of schema definition
PromoCodeSchema.index({ isActive: 1 });

const PromoCode = mongoose.models.PromoCode || mongoose.model('PromoCode', PromoCodeSchema);

export default PromoCode;
