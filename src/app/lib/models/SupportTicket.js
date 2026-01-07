// src/app/lib/models/SupportTicket.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminName: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    contentType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

const SupportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  initialMessage: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['general', 'technical', 'billing', 'subscription', 'feature_request', 'bug_report', 'other'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['waiting', 'open', 'closed'],
    default: 'waiting'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAdmin: {
    name: String,
    email: String
  },
  messages: [MessageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  firstResponseAt: Date,
  closedAt: Date,
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Generate ticket number before saving
SupportTicketSchema.pre('save', async function (next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      const count = await mongoose.model('SupportTicket').countDocuments();
      this.ticketNumber = `TKT-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // Fallback if count fails
      this.ticketNumber = `TKT-${Date.now()}`;
    }
  }
  next();
});

// Indexes
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ user: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1 });
SupportTicketSchema.index({ 'messages.createdAt': 1 });

// Virtual for unread messages count
SupportTicketSchema.virtual('unreadMessagesCount').get(function () {
  return this.messages.filter(msg =>
    msg.isAdmin && !msg.readBy.some(read => read.user.toString() === this.user.toString())
  ).length;
});

// Virtual for last message
SupportTicketSchema.virtual('lastMessage').get(function () {
  if (this.messages.length === 0) return this.initialMessage;
  return this.messages[this.messages.length - 1].message;
});

// Method to add message
SupportTicketSchema.methods.addMessage = function (messageData) {
  // Only allow messages if ticket is open
  if (this.status !== 'open') {
    throw new Error('Cannot add message to a closed or waiting ticket');
  }

  this.messages.push(messageData);
  this.lastMessageAt = new Date();

  return this.save();
};

// Method to assign ticket and open it
SupportTicketSchema.methods.assignToAdmin = function (adminId, adminName, adminEmail) {
  this.assignedTo = adminId;
  this.assignedAdmin = { name: adminName, email: adminEmail };
  this.status = 'open';

  if (!this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }

  return this.save();
};

// Method to update status
SupportTicketSchema.methods.updateStatus = function (newStatus) {
  this.status = newStatus;

  if (newStatus === 'closed') {
    this.closedAt = new Date();
  } else if (newStatus === 'open' && !this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }

  return this.save();
};

// Add initial message when ticket is created
SupportTicketSchema.post('save', async function (doc, next) {
  if (doc.isNew) {
    // Add the initial message as the first message in the conversation
    const initialMessage = {
      user: doc.user,
      message: doc.initialMessage,
      isAdmin: false,
      adminName: null
    };
    doc.messages.push(initialMessage);
    await doc.save();
  }
  next();
});

// Export with proper model registration
export default mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);