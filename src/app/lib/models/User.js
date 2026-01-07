import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      immutable: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    favorites: {
      articles: [{
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        articleId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }],
      // ✅ NEW: Free articles favorites
      freeArticles: [{
        articleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FreeArticle',
          required: true
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },
    // ✅ NEW: Trial Tracking
    trial: {
      isUsed: { type: Boolean, default: false },
      startDate: { type: Date },
      endDate: { type: Date }, // We can set this to startDate + 7 days for easier querying
      expirationNotified: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

// Method to add article to favorites
userSchema.methods.addArticleToFavorites = function (productId, articleId) {
  const exists = this.favorites.articles.some(fav =>
    fav.productId.toString() === productId.toString() &&
    fav.articleId.toString() === articleId.toString()
  );

  if (!exists) {
    this.favorites.articles.push({ productId, articleId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove article to favorites
userSchema.methods.removeArticleFromFavorites = function (productId, articleId) {
  this.favorites.articles = this.favorites.articles.filter(fav =>
    !(fav.productId.toString() === productId.toString() &&
      fav.articleId.toString() === articleId.toString())
  );
  return this.save();
};

// Method to check if article is in favorites
userSchema.methods.isArticleInFavorites = function (productId, articleId) {
  return this.favorites.articles.some(fav =>
    fav.productId.toString() === productId.toString() &&
    fav.articleId.toString() === articleId.toString()
  );
};

// Method to add free article to favorites
userSchema.methods.addFreeArticleToFavorites = function (articleId) {
  const exists = this.favorites.freeArticles.some(fav =>
    fav.articleId.toString() === articleId.toString()
  );

  if (!exists) {
    this.favorites.freeArticles.push({ articleId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove free article from favorites
userSchema.methods.removeFreeArticleFromFavorites = function (articleId) {
  this.favorites.freeArticles = this.favorites.freeArticles.filter(fav =>
    fav.articleId.toString() !== articleId.toString()
  );
  return this.save();
};

// Method to check if free article is in favorites
userSchema.methods.isFreeArticleInFavorites = function (articleId) {
  return this.favorites.freeArticles.some(fav =>
    fav.articleId.toString() === articleId.toString()
  );
};

export default mongoose.models.User || mongoose.model('User', userSchema);