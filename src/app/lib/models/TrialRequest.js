import mongoose from 'mongoose';

const TrialRequestSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    contactNumber: {
        type: String,
        required: [true, 'Please provide a contact number'],
        unique: true,
    },
    homeAddress: {
        type: String,
        required: [true, 'Please provide a home address'],
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Please specify a product'],
    },
    productName: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.TrialRequest || mongoose.model('TrialRequest', TrialRequestSchema);
