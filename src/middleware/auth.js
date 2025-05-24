const jwt = require('jsonwebtoken');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const config = require('../../config');
const logger = require('../utils/logger');
const User = require('../models/User');
const redisService = require('../services/redis');

class AuthMiddleware {
  constructor() {
    this.initializeRateLimiters();
  }

  initializeRateLimiters() {
    try {
      const redisClient = redisService.getClient();

      // Check if Redis client is available
      if (!redisClient) {
        logger.warn('Redis client not available for auth middleware, using in-memory rate limiting');
        this.useInMemoryLimiting = true;
        return;
      }

      // Rate limiter for login attempts
      this.loginLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'login_fail',
        points: 5, // Number of attempts
        duration: 900, // Per 15 minutes
        blockDuration: 900, // Block for 15 minutes
      });

      // Rate limiter for API calls per user
      this.apiLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'api_call',
        points: 100, // Number of requests
        duration: 3600, // Per hour
        blockDuration: 3600, // Block for 1 hour
      });

      logger.info('Auth rate limiters initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize auth rate limiters:', error);
      this.useInMemoryLimiting = true;
    }
  }

  // Authenticate JWT token
  authenticate = async (req, res, next) => {
    try {
      const token = this.extractToken(req);

      if (!token) {
        return res.status(401).json({
          error: 'Access denied. No token provided.',
        });
      }

      // Verify token
      const decoded = jwt.verify(token, config.auth.jwt.secret);

      // Get user from database
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Invalid token. User not found or inactive.',
        });
      }

      // Check API rate limit (skip if using in-memory limiting)
      if (!this.useInMemoryLimiting) {
        try {
          await this.apiLimiter.consume(user._id.toString());
        } catch (rateLimiterRes) {
          return res.status(429).json({
            error: 'Too many API requests',
            retryAfter: rateLimiterRes.msBeforeNext,
          });
        }
      }

      // Reset API usage counters if needed
      await user.resetApiUsage();

      // Check API quota
      if (!user.canMakeApiCall()) {
        return res.status(429).json({
          error: 'API quota exceeded',
          quota: user.apiQuota,
          usage: user.apiUsage,
        });
      }

      // Increment API usage
      await user.incrementApiUsage();

      // Attach user to request
      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
      };

      logger.auth('User authenticated', {
        userId: user._id,
        username: user.username,
        endpoint: req.originalUrl,
      });

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token.',
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired.',
        });
      }

      logger.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Internal server error during authentication.',
      });
    }
  };

  // Optional authentication (doesn't fail if no token)
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);

      if (token) {
        const decoded = jwt.verify(token, config.auth.jwt.secret);
        const user = await User.findById(decoded.userId).select('-password -refreshTokens');

        if (user && user.isActive) {
          req.user = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin,
            isModerator: user.isModerator,
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };

  // Require specific role
  requireRole = requiredRole => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required.',
        });
      }

      const roleHierarchy = {
        user: 0,
        moderator: 1,
        admin: 2,
      };

      const userRoleLevel = roleHierarchy[req.user.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        logger.auth('Access denied - insufficient role', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRole,
          endpoint: req.originalUrl,
        });

        return res.status(403).json({
          error: `Access denied. ${requiredRole} role required.`,
        });
      }

      next();
    };
  };

  // API Key authentication
  authenticateApiKey = async (req, res, next) => {
    try {
      const apiKey = req.header('X-API-Key');

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required.',
        });
      }

      const user = await User.findByApiKey(apiKey);

      if (!user) {
        return res.status(401).json({
          error: 'Invalid API key.',
        });
      }

      // Check API rate limit (skip if using in-memory limiting)
      if (!this.useInMemoryLimiting) {
        try {
          await this.apiLimiter.consume(user._id.toString());
        } catch (rateLimiterRes) {
          return res.status(429).json({
            error: 'Too many API requests',
            retryAfter: rateLimiterRes.msBeforeNext,
          });
        }
      }

      // Reset API usage counters if needed
      await user.resetApiUsage();

      // Check API quota
      if (!user.canMakeApiCall()) {
        return res.status(429).json({
          error: 'API quota exceeded',
          quota: user.apiQuota,
          usage: user.apiUsage,
        });
      }

      // Increment API usage
      await user.incrementApiUsage();

      req.user = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        isModerator: user.isModerator,
      };

      logger.auth('API key authenticated', {
        userId: user._id,
        username: user.username,
        endpoint: req.originalUrl,
      });

      next();
    } catch (error) {
      logger.error('API key authentication error:', error);
      return res.status(500).json({
        error: 'Internal server error during API key authentication.',
      });
    }
  };

  // Rate limit login attempts
  limitLoginAttempts = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return next(); // Skip rate limiting if Redis not available
    }

    try {
      const key = req.ip;
      await this.loginLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      logger.auth('Login rate limit exceeded', {
        ip: req.ip,
        retryAfter: rateLimiterRes.msBeforeNext,
      });

      return res.status(429).json({
        error: 'Too many login attempts',
        retryAfter: rateLimiterRes.msBeforeNext,
      });
    }
  };

  // Reset login attempts on successful login
  resetLoginAttempts = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return next(); // Skip if Redis not available
    }

    try {
      const key = req.ip;
      await this.loginLimiter.delete(key);
      next();
    } catch (error) {
      // Continue even if reset fails
      next();
    }
  };

  // Extract token from request
  extractToken(req) {
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Also check query parameter for WebSocket connections
    if (req.query && req.query.token) {
      return req.query.token;
    }

    return null;
  }

  // Validate refresh token
  validateRefreshToken = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required.',
        });
      }

      const decoded = jwt.verify(refreshToken, config.auth.jwt.refreshSecret);

      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Invalid refresh token.',
        });
      }

      // Check if refresh token exists in user's tokens
      const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);

      if (!tokenExists) {
        return res.status(401).json({
          error: 'Refresh token not found.',
        });
      }

      req.user = user;
      req.refreshToken = refreshToken;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Invalid or expired refresh token.',
        });
      }

      logger.error('Refresh token validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during refresh token validation.',
      });
    }
  };
}

module.exports = new AuthMiddleware();
