import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema(
    {
        jobPosition: {
            type: String,
            required: [true, 'Job Position is required'],
            trim: true,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
            trim: true,
        },
        experience: {
            type: String,
            required: [true, 'Experience is required'],
            trim: true,
        },
        responsibilities: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.models.Career || mongoose.model('Career', careerSchema);
