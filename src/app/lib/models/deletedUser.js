import mongoose from 'mongoose';

const deletedUserSchema = new mongoose.Schema(
    {
        originalUserId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
        },
        mobile: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'user',
        },
        userData: {
            type: Object, // Store any other user data (favorites, settings, etc.) as a generic object
        },
        reason: {
            type: String, // Optional reason for deletion
        },
        deletedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// We do NOT want unique constraints on email/mobile here, 
// because a user might delete and re-register and delete again multiple times.
// We just want a log.

export default mongoose.models.DeletedUser || mongoose.model('DeletedUser', deletedUserSchema);
