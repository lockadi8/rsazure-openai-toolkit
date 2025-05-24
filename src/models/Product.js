const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text',
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviewCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  soldCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  subcategory: {
    type: String,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
    index: true,
  },
  shopName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  shopId: {
    type: String,
    required: true,
    index: true,
  },
  shopRating: {
    type: Number,
    min: 0,
    max: 5,
  },
  shopLocation: {
    type: String,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  specifications: [{
    name: String,
    value: String,
  }],
  variants: [{
    name: String,
    options: [String],
  }],
  url: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  stock: {
    type: Number,
    min: 0,
  },
  weight: {
    type: Number,
    min: 0,
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  shipping: {
    freeShipping: {
      type: Boolean,
      default: false,
    },
    estimatedDays: {
      min: Number,
      max: Number,
    },
  },
  tags: [{
    type: String,
    trim: true,
  }],
  metadata: {
    scrapedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    scrapeCount: {
      type: Number,
      default: 1,
    },
    source: {
      type: String,
      default: 'shopee',
    },
    quality: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
  },
  priceHistory: [{
    price: { type: Number, required: true },
    currency: { type: String, trim: true, default: 'IDR' }, // Assuming IDR as default
    date: { type: Date, required: true, default: Date.now },
  }],
  reviews: [{
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    author: { type: String, trim: true, default: 'Anonymous' },
    date: { type: Date, default: Date.now },
    verifiedPurchase: { type: Boolean, default: false },
    // Potentially add: helpfulVotes, imagesOrVideos, authorId (if users are linked)
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ shopId: 1, isActive: 1 });
productSchema.index({ 'metadata.scrapedAt': -1 });
productSchema.index({ rating: -1, reviewCount: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index({ 'priceHistory.date': -1 }); // Index for price history date

// Virtuals
productSchema.virtual('discountAmount').get(function() {
  if (this.originalPrice && this.price) {
    return this.originalPrice - this.price;
  }
  return 0;
});

productSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.price && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

productSchema.virtual('averageRating').get(function() {
  return Math.round(this.rating * 10) / 10;
});

// Methods
productSchema.methods.updateMetadata = function() {
  this.metadata.lastUpdated = new Date();
  this.metadata.scrapeCount += 1;
  return this.save();
};

productSchema.methods.markAsInactive = function() {
  this.isActive = false;
  this.metadata.lastUpdated = new Date();
  return this.save();
};

productSchema.methods.updatePrice = function(newPrice, newOriginalPrice = null) {
  this.price = newPrice;
  if (newOriginalPrice) {
    this.originalPrice = newOriginalPrice;
  }
  this.metadata.lastUpdated = new Date();
  return this.save();
};

// Statics
productSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, isActive: true };
  return this.find(query, null, options);
};

productSchema.statics.findByShop = function(shopId, options = {}) {
  const query = { shopId, isActive: true };
  return this.find(query, null, options);
};

productSchema.statics.findByPriceRange = function(minPrice, maxPrice, options = {}) {
  const query = {
    price: { $gte: minPrice, $lte: maxPrice },
    isActive: true,
  };
  return this.find(query, null, options);
};

productSchema.statics.findTopRated = function(limit = 10) {
  return this.find({ isActive: true, reviewCount: { $gte: 10 } })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(limit);
};

productSchema.statics.findBestSellers = function(limit = 10) {
  return this.find({ isActive: true, soldCount: { $gte: 1 } })
    .sort({ soldCount: -1 })
    .limit(limit);
};

productSchema.statics.searchProducts = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true,
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Pre-save middleware
productSchema.pre('save', function(next) {
  if (this.isModified('price') || this.isModified('originalPrice')) {
    if (this.originalPrice && this.price && this.originalPrice > this.price) {
      this.discount = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    } else {
      this.discount = 0;
    }
  }

  // Logic for updating priceHistory will be handled in ProductScraper or service layer,
  // as pre-save here might not have access to the "new" price being scraped easily
  // if only an update operation is performed without explicitly setting the price field.

  if (this.isModified()) {
    this.metadata.lastUpdated = new Date();
  }
  
  next();
});

// Post-save middleware
productSchema.post('save', function(doc) {
  // Emit event for real-time updates
  if (global.io) {
    global.io.emit('product:updated', {
      productId: doc.productId,
      name: doc.name,
      price: doc.price,
      isActive: doc.isActive,
    });
  }
});

module.exports = mongoose.model('Product', productSchema);
