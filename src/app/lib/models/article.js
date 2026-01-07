import mongoose from 'mongoose';

const FreeContentBlockSchema = new mongoose.Schema({
  blockType: {
    type: String,
    required: true,
    enum: ['heading', 'paragraph', 'image', 'quote', 'list', 'table', 'link', 'rich_text', 'editor', 'footer'],
    default: 'paragraph'
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  image: {
    filename: String,
    contentType: String,
    size: Number,
    gridfsId: String
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  style: {
    type: Object,
    default: {}
  },
  listConfig: {
    type: {
      type: String,
      enum: ['bullet', 'number', 'custom', 'disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman'],
      default: 'bullet'
    },
    customSymbol: String,
    customImage: {
      filename: String,
      contentType: String,
      size: Number,
      gridfsId: String
    }
  },
  linkConfig: {
    url: {
      type: String,
      trim: true
    },
    target: {
      type: String,
      enum: ['_self', '_blank'],
      default: '_self'
    },
    title: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

const FreeArticleSectionSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: false,
    trim: true
  },
  contentBlocks: [FreeContentBlockSchema]
}, {
  timestamps: true
});

const FreeArticleSchema = new mongoose.Schema({
  mainHeading: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    default: 'Brew Readers',
    trim: true
  },
  createdBy: {
    type: String,
    default: 'Admin'
  },
  sections: [FreeArticleSectionSchema],
  accessType: {
    type: String,
    required: true,
    enum: ['withoutlogin', 'login'],
    default: 'withoutlogin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featuredImage: {
    filename: String,
    contentType: String,
    size: Number,
    gridfsId: String
  }
}, {
  timestamps: true, // This will automatically add createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Reading Progress Schema
const ReadingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'FreeArticle'
  },
  readSections: [{
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    },
    timeSpent: {
      type: Number, // in seconds
      default: 0
    }
  }],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  totalReadingTime: {
    type: Number, // in seconds
    default: 0
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
FreeArticleSchema.index({ category: 1, isActive: 1 });
FreeArticleSchema.index({ accessType: 1, isActive: 1 });
FreeArticleSchema.index({ createdAt: -1 }); // Changed from publishDate to createdAt
FreeArticleSchema.index({ 'sections.contentBlocks.order': 1 });
FreeArticleSchema.index({ accessType: 1, category: 1, isActive: 1 });

// Indexes for ReadingProgress
ReadingProgressSchema.index({ userId: 1, articleId: 1 }, { unique: true });
ReadingProgressSchema.index({ userId: 1, lastReadAt: -1 });
ReadingProgressSchema.index({ articleId: 1, completed: 1 });

// Virtual for formatted date using createdAt
FreeArticleSchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
});

// Virtual for total sections count
FreeArticleSchema.virtual('totalSections').get(function () {
  return this.sections ? this.sections.length : 0;
});

// Static method to get articles by access type
FreeArticleSchema.statics.getByAccessType = function (accessType = 'withoutlogin') {
  return this.find({
    accessType,
    isActive: true
  }).sort({ createdAt: -1 }); // Sort by createdAt instead of publishDate
};

// Static method to get articles for public (without login required)
FreeArticleSchema.statics.getPublicArticles = function () {
  return this.find({
    accessType: 'withoutlogin',
    isActive: true
  }).sort({ createdAt: -1 }); // Sort by createdAt instead of publishDate
};

// Static method to get articles for logged-in users
FreeArticleSchema.statics.getForLoggedInUsers = function () {
  return this.find({
    accessType: { $in: ['withoutlogin', 'login'] },
    isActive: true
  }).sort({ createdAt: -1 }); // Sort by createdAt instead of publishDate
};

// Static method to get articles by category
FreeArticleSchema.statics.getByCategory = function (category, accessType = null) {
  const query = {
    category,
    isActive: true
  };

  if (accessType) {
    query.accessType = accessType;
  }

  return this.find(query).sort({ createdAt: -1 }); // Sort by createdAt instead of publishDate
};

// Static method to get featured articles
FreeArticleSchema.statics.getFeatured = function (limit = 5) {
  return this.find({
    isActive: true,
    accessType: 'withoutlogin'
  })
    .sort({ createdAt: -1 }) // Sort by createdAt instead of publishDate
    .limit(limit);
};

// Method to get content summary (first few paragraphs)
FreeArticleSchema.methods.getSummary = function (maxLength = 200) {
  let summary = '';

  // Get content from first few content blocks
  for (const section of this.sections) {
    for (const block of section.contentBlocks) {
      if (block.blockType === 'paragraph' && block.content) {
        summary += block.content + ' ';
        if (summary.length > maxLength) {
          return summary.substring(0, maxLength) + '...';
        }
      }
    }
  }

  return summary || this.description;
};

// ✅ UPDATED: Reading Progress Methods with Dynamic Section Counting
ReadingProgressSchema.methods.calculateProgress = function (article) {
  const totalSections = article.sections ? article.sections.length : 0;

  if (totalSections === 0) {
    return {
      readPercentage: 0,
      readSectionsCount: 0,
      totalSections: 0,
      completed: false,
      progressText: '0/0'
    };
  }

  // Filter read sections that actually exist in current article
  const validReadSections = this.readSections.filter(readSection =>
    article.sections.some(currentSection =>
      currentSection._id.toString() === readSection.sectionId.toString()
    )
  );

  const readSectionsCount = validReadSections.length;

  // Calculate percentage (cap at 100%)
  let readPercentage = Math.round((readSectionsCount / totalSections) * 100);
  readPercentage = Math.min(100, readPercentage);

  // Determine completion status
  const completed = (readSectionsCount === totalSections) && (totalSections > 0);

  // Update completion status if needed
  if (completed && !this.completed) {
    this.completed = true;
    this.completedAt = new Date();
  } else if (!completed && this.completed) {
    this.completed = false;
    this.completedAt = null;
  }

  return {
    readPercentage,
    readSectionsCount,
    totalSections,
    completed,
    progressText: `${readSectionsCount}/${totalSections}`
  };
};

ReadingProgressSchema.methods.markSectionAsRead = function (sectionId, timeSpent = 0) {
  const existingSectionIndex = this.readSections.findIndex(
    section => section.sectionId.toString() === sectionId.toString()
  );

  if (existingSectionIndex === -1) {
    // Add new section
    this.readSections.push({
      sectionId,
      timeSpent,
      readAt: new Date()
    });
  } else {
    // Update existing section
    this.readSections[existingSectionIndex].timeSpent += timeSpent;
    this.readSections[existingSectionIndex].readAt = new Date();
  }

  this.totalReadingTime += timeSpent;
  this.lastReadAt = new Date();
};

ReadingProgressSchema.statics.getUserProgress = function (userId, articleId) {
  return this.findOne({ userId, articleId });
};

ReadingProgressSchema.statics.getUserReadingStats = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalArticlesRead: { $sum: { $cond: ['$completed', 1, 0] } },
        totalReadingTime: { $sum: '$totalReadingTime' },
        articlesInProgress: { $sum: { $cond: [{ $and: ['$readSections.0', { $not: ['$completed'] }] }, 1, 0] } }
      }
    }
  ]);
};

// Pre-save middleware to sort content blocks
FreeArticleSchema.pre('save', function (next) {
  // Sort content blocks within each section by order (ascending)
  if (this.sections && this.sections.length > 0) {
    this.sections.forEach(section => {
      if (section.contentBlocks && section.contentBlocks.length > 0) {
        section.contentBlocks.sort((a, b) => a.order - b.order);
      }
    });
  }

  next();
});

// Create models - IMPORTANT: Export as FreeArticle from article.js
const FreeArticle = mongoose.models.FreeArticle || mongoose.model('FreeArticle', FreeArticleSchema);
const ReadingProgress = mongoose.models.ReadingProgress || mongoose.model('ReadingProgress', ReadingProgressSchema);

export { ReadingProgress };
export default FreeArticle;