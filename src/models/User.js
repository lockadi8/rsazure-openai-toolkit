const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    trim: true,
  },
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      priceAlerts: {
        type: Boolean,
        default: true,
      },
    },
    dashboard: {
      defaultView: {
        type: String,
        enum: ['grid', 'list'],
        default: 'grid',
      },
      itemsPerPage: {
        type: Number,
        default: 20,
        min: 10,
        max: 100,
      },
    },
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  apiQuota: {
    daily: {
      type: Number,
      default: 1000,
    },
    monthly: {
      type: Number,
      default: 30000,
    },
  },
  apiUsage: {
    today: {
      type: Number,
      default: 0,
    },
    thisMonth: {
      type: Number,
      default: 0,
    },
    lastReset: {
      type: Date,
      default: Date.now,
    },
  },
  lastLogin: {
    type: Date,
  },
  loginCount: {
    type: Number,
    default: 0,
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
  }],
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.passwordResetToken;
      delete ret.emailVerificationToken;
      return ret;
    },
  },
  toObject: { virtuals: true },
});

// Indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ username: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ apiKey: 1 }, { sparse: true });

// Virtuals
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

userSchema.virtual('isModerator').get(function() {
  return this.role === 'moderator' || this.role === 'admin';
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
  };
  
  return jwt.sign(payload, config.auth.jwt.secret, {
    expiresIn: config.auth.jwt.expiresIn,
  });
};

userSchema.methods.generateRefreshToken = function() {
  const payload = {
    userId: this._id,
    type: 'refresh',
  };
  
  const token = jwt.sign(payload, config.auth.jwt.refreshSecret, {
    expiresIn: config.auth.jwt.refreshExpiresIn,
  });
  
  // Store refresh token
  this.refreshTokens.push({
    token,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
  
  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return token;
};

userSchema.methods.revokeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

userSchema.methods.revokeAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

userSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.apiKey = crypto.randomBytes(32).toString('hex');
  return this.save();
};

userSchema.methods.resetApiUsage = function() {
  const now = new Date();
  const lastReset = this.apiUsage.lastReset;
  
  // Reset daily usage if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    this.apiUsage.today = 0;
  }
  
  // Reset monthly usage if it's a new month
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.apiUsage.thisMonth = 0;
  }
  
  this.apiUsage.lastReset = now;
  return this.save();
};

userSchema.methods.incrementApiUsage = function() {
  this.apiUsage.today += 1;
  this.apiUsage.thisMonth += 1;
  return this.save();
};

userSchema.methods.canMakeApiCall = function() {
  return this.apiUsage.today < this.apiQuota.daily && 
         this.apiUsage.thisMonth < this.apiQuota.monthly;
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return token;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

// Statics
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username, isActive: true });
};

userSchema.statics.findByApiKey = function(apiKey) {
  return this.findOne({ apiKey, isActive: true });
};

userSchema.statics.findByPasswordResetToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    isActive: true,
  });
};

userSchema.statics.findByEmailVerificationToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
    isActive: true,
  });
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, config.auth.bcrypt.rounds);
  }
  
  // Clean up expired refresh tokens
  if (this.isModified('refreshTokens')) {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  }
  
  next();
});

// Pre-remove middleware
userSchema.pre('remove', function(next) {
  // Clean up related data
  // This could include user's searches, favorites, etc.
  next();
});

module.exports = mongoose.model('User', userSchema);
