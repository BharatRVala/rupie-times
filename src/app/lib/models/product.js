// src/app/lib/models/product.js
import mongoose from 'mongoose';

const ContentBlockSchema = new mongoose.Schema({
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

const ArticleSectionSchema = new mongoose.Schema({
  heading: {
    type: String,
    trim: true
  },
  contentBlocks: [ContentBlockSchema]
}, {
  timestamps: true
});

const ProductArticleSchema = new mongoose.Schema({
  mainHeading: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    filename: String,
    contentType: String,
    size: Number,
    gridfsId: String
  },
  category: {
    type: String,
    trim: true
  },
  author: {
    type: String,
    trim: true
  },
  sections: [ArticleSectionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  issueDate: {
    type: Date
  },
  issueEndDate: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ProductSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  heading: {
    type: String,
    required: true,
    trim: true
  },
  publicationType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  frequency: {
    type: String,
    required: true,
    trim: true
  },
  fullDescription: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  variants: {
    type: [{
      duration: {
        type: String,
        required: true,
        trim: true
      },
      durationValue: {
        type: Number,
        required: true,
        min: 1
      },
      durationUnit: {
        type: String,
        required: true,
        enum: ['minutes', 'hours', 'days', 'weeks', 'months', 'years'],
        default: 'months'
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      description: {
        type: String,
        trim: true,
        default: ''
      }
    }],
    default: [],
    validate: {
      validator: function (v) {
        return v.length > 0;
      },
      message: 'At least one variant is required'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  articles: [ProductArticleSchema],
  metadata: {
    type: Object,
    default: {}
  },
  promoCodes: [{
    code: {
      type: String,
      required: true,
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
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Product Reading Progress Schema
const ProductReadingProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product'
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
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
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ 'variants.duration': 1 });
ProductSchema.index({ 'articles.isActive': 1 });
ProductSchema.index({ 'articles.createdAt': -1 });
ProductSchema.index({ 'articles.category': 1 });

// Indexes for ProductReadingProgress
ProductReadingProgressSchema.index({ userId: 1, productId: 1, articleId: 1 }, { unique: true });
ProductReadingProgressSchema.index({ userId: 1, lastReadAt: -1 });
ProductReadingProgressSchema.index({ productId: 1, articleId: 1, completed: 1 });

// Virtual for getting the base price (lowest variant price)
ProductSchema.virtual('basePrice').get(function () {
  if (!this.variants || this.variants.length === 0) return 0;
  const validVariants = this.variants.filter(v => v && typeof v.price === 'number' && !isNaN(v.price));
  if (validVariants.length === 0) return 0;
  return Math.min(...validVariants.map(v => v.price));
});


// In product.js - UPDATE the getAccessibleArticles method
ProductSchema.methods.getAccessibleArticles = function (subscriptionStartDate, lookBackCount = 5) {
  if (!this.articles || this.articles.length === 0) return [];

  const subscriptionDate = new Date(subscriptionStartDate);

  // Filter active articles only
  const activeArticles = this.articles.filter(article =>
    article.isActive && article.createdAt
  );

  // Separate articles into two groups
  const futureArticles = activeArticles.filter(article => {
    const articleDate = new Date(article.createdAt);
    return articleDate > subscriptionDate;
  });

  const historicalArticles = activeArticles.filter(article => {
    const articleDate = new Date(article.createdAt);
    return articleDate <= subscriptionDate;
  });

  // Get only the latest N historical articles
  const accessibleHistoricalArticles = historicalArticles
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, lookBackCount);

  // Combine both groups - sort by date (newest first)
  const allAccessibleArticles = [...accessibleHistoricalArticles, ...futureArticles]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return allAccessibleArticles;
};

// Method to check article accessibility
ProductSchema.methods.canAccessArticle = function (articleId, subscriptionStartDate, lookBackCount = 5) {
  if (!this.articles || this.articles.length === 0) return false;

  const subscriptionDate = new Date(subscriptionStartDate);
  const article = this.articles.id(articleId);

  if (!article || !article.isActive) return false;

  const articleDate = new Date(article.createdAt);

  // Rule 1: Future articles are always accessible
  if (articleDate > subscriptionDate) return true;

  // Rule 2: For articles before or at subscription time, check if it's in the latest N
  const preSubscriptionArticles = this.articles.filter(a => {
    if (!a.isActive) return false;
    const aDate = new Date(a.createdAt);
    return aDate <= subscriptionDate;
  });

  const latestPreSubscription = preSubscriptionArticles
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, lookBackCount);

  return latestPreSubscription.some(preArticle =>
    preArticle._id.toString() === articleId.toString()
  );
};

// Method to sort articles by creation date (newest first)
ProductSchema.methods.sortArticlesByDate = function () {
  if (this.articles && this.articles.length > 0) {
    this.articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return this;
};

// Product Reading Progress Methods
ProductReadingProgressSchema.methods.calculateProgress = function (article) {
  // Helper to check if section is pure footer
  const isPureFooterSection = (section) => {
    if (!section.contentBlocks || section.contentBlocks.length === 0) return false;
    return section.contentBlocks.every(b => b.blockType === 'footer' || b.type === 'footer');
  };

  // Calculate total sections excluding pure footers
  const totalSections = article.sections
    ? article.sections.filter(s => !isPureFooterSection(s)).length
    : 0;

  if (totalSections === 0) {
    return {
      readPercentage: 0,
      readSectionsCount: 0,
      totalSections: 0,
      completed: false,
      progressText: '0/0'
    };
  }

  // Filter read sections that actually exist in current article AND are not pure footers
  const validReadSections = this.readSections.filter(readSection => {
    const section = article.sections.find(s => s._id.toString() === readSection.sectionId.toString());
    // Must exist AND not be a pure footer
    return section && !isPureFooterSection(section);
  });

  const readSectionsCount = validReadSections.length;

  // Calculate percentage (cap at 100%)
  let readPercentage = Math.round((readSectionsCount / totalSections) * 100);
  readPercentage = Math.min(100, readPercentage);

  // Determine completion status
  const completed = (readSectionsCount >= totalSections) && (totalSections > 0);

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

ProductReadingProgressSchema.methods.markSectionAsRead = function (sectionId, timeSpent = 0) {
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

ProductReadingProgressSchema.methods.unmarkSectionAsRead = function (sectionId) {
  const existingSectionIndex = this.readSections.findIndex(
    section => section.sectionId.toString() === sectionId.toString()
  );

  if (existingSectionIndex !== -1) {
    const timeSpentToRemove = this.readSections[existingSectionIndex].timeSpent || 0;
    this.readSections.splice(existingSectionIndex, 1);
    this.totalReadingTime = Math.max(0, this.totalReadingTime - timeSpentToRemove);
    this.lastReadAt = new Date();
  }
};

ProductReadingProgressSchema.statics.getUserProgress = function (userId, productId, articleId) {
  return this.findOne({ userId, productId, articleId });
};

ProductReadingProgressSchema.statics.getUserProductReadingStats = function (userId, productId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        productId: new mongoose.Types.ObjectId(productId)
      }
    },
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

// Pre-save middleware to ensure proper sorting
ProductSchema.pre('save', function (next) {
  // Sort variants
  if (this.variants && this.variants.length > 0) {
    this.variants.sort((a, b) => {
      const aMinutes = convertToMinutes(a.durationValue, a.durationUnit);
      const bMinutes = convertToMinutes(b.durationValue, b.durationUnit);
      return aMinutes - bMinutes;
    });
  }

  // Sort articles by creation date (newest first)
  if (this.articles && this.articles.length > 0) {
    this.articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  next();
});

// Helper function to convert to minutes for sorting
function convertToMinutes(value, unit) {
  switch (unit) {
    case 'minutes': return value;
    case 'hours': return value * 60;
    case 'days': return value * 60 * 24;
    case 'weeks': return value * 60 * 24 * 7;
    case 'months': return value * 60 * 24 * 30;
    case 'years': return value * 60 * 24 * 365;
    default: return value;
  }
}

// Virtual for getting active articles count
ProductSchema.virtual('activeArticlesCount').get(function () {
  if (!this.articles) return 0;
  return this.articles.filter(article => article.isActive).length;
});

// Method to get article by ID
ProductSchema.methods.getArticleById = function (articleId) {
  return this.articles.id(articleId);
};

// Create models
// Force model rebuild in development to pick up schema changes
if (process.env.NODE_ENV !== 'production') {
  if (mongoose.models.Product) delete mongoose.models.Product;
  if (mongoose.models.ProductReadingProgress) delete mongoose.models.ProductReadingProgress;
}

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
const ProductReadingProgress = mongoose.models.ProductReadingProgress || mongoose.model('ProductReadingProgress', ProductReadingProgressSchema);

export { ProductReadingProgress };
export default Product;