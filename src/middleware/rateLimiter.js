const rateLimit = require('express-rate-limit');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const config = require('../../config');
const logger = require('../utils/logger');
const redisService = require('../services/redis');

class RateLimiterMiddleware {
  constructor() {
    this.initializeRateLimiters();
  }

  initializeRateLimiters() {
    try {
      const redisClient = redisService.getClient();

      // Check if Redis client is available
      if (!redisClient) {
        logger.warn('Redis client not available, using in-memory rate limiting');
        this.useInMemoryLimiting = true;
        return;
      }

      // General API rate limiter
      this.generalLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'general_api',
        points: config.rateLimit.max,
        duration: config.rateLimit.windowMs / 1000,
        blockDuration: config.rateLimit.windowMs / 1000,
      });

      // Scraper API rate limiter (more restrictive)
      this.scraperLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'scraper_api',
        points: 10, // 10 requests
        duration: 60, // per minute
        blockDuration: 300, // block for 5 minutes
      });

      // Search API rate limiter
      this.searchLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'search_api',
        points: 30, // 30 searches
        duration: 60, // per minute
        blockDuration: 60, // block for 1 minute
      });

      // Autocomplete rate limiter (more permissive)
      this.autocompleteLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'autocomplete_api',
        points: 60, // 60 requests
        duration: 60, // per minute
        blockDuration: 30, // block for 30 seconds
      });

      // Analytics rate limiter (more restrictive)
      this.analyticsLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'analytics_api',
        points: 10, // 10 requests
        duration: 60, // per minute
        blockDuration: 120, // block for 2 minutes
      });

      // Auth endpoints rate limiter
      this.authLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'auth_api',
        points: 5, // 5 attempts
        duration: 900, // per 15 minutes
        blockDuration: 900, // block for 15 minutes
      });

      // File upload rate limiter
      this.uploadLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'upload_api',
        points: 5, // 5 uploads
        duration: 300, // per 5 minutes
        blockDuration: 300, // block for 5 minutes
      });

      // Admin API rate limiter (less restrictive for admins)
      this.adminLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'admin_api',
        points: 200, // 200 requests
        duration: 60, // per minute
        blockDuration: 60, // block for 1 minute
      });

      logger.info('Redis rate limiters initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis rate limiters:', error);
      this.useInMemoryLimiting = true;
    }
  }

  // General rate limiter middleware
  general = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.generalLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'General API');
    }
  };

  // Scraper endpoints rate limiter
  scraper = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.scraperLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Scraper API');
    }
  };

  // Search endpoints rate limiter
  search = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.searchLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Search API');
    }
  };

  // Autocomplete endpoints rate limiter
  autocomplete = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.autocompleteLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Autocomplete API');
    }
  };

  // Analytics endpoints rate limiter
  analytics = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.analyticsLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Analytics API');
    }
  };

  // Auth endpoints rate limiter
  auth = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = req.ip; // Use IP for auth endpoints
      await this.authLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Auth API');
    }
  };

  // File upload rate limiter
  upload = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.uploadLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Upload API');
    }
  };

  // Admin endpoints rate limiter
  admin = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      const key = this.getKey(req);
      await this.adminLimiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, 'Admin API');
    }
  };

  // Dynamic rate limiter based on user role
  dynamic = async (req, res, next) => {
    if (this.useInMemoryLimiting) {
      return this.expressRateLimit(req, res, next);
    }

    try {
      let limiter = this.generalLimiter;
      let limiterName = 'General API';

      // Use different limiters based on user role
      if (req.user) {
        if (req.user.isAdmin) {
          limiter = this.adminLimiter;
          limiterName = 'Admin API';
        } else if (req.user.isModerator) {
          // Moderators get slightly higher limits
          limiter = new RateLimiterRedis({
            storeClient: redisService.getClient(),
            keyPrefix: 'moderator_api',
            points: 150,
            duration: 60,
            blockDuration: 60,
          });
          limiterName = 'Moderator API';
        }
      }

      const key = this.getKey(req);
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes) {
      this.handleRateLimit(res, rateLimiterRes, limiterName);
    }
  };

  // Express rate limit for simple cases
  expressRateLimit = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
    message: {
      error: 'Too many requests from this IP',
      retryAfter: config.rateLimit.windowMs,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded (Express)', {
        ip: req.ip,
        endpoint: req.originalUrl,
        userAgent: req.get('User-Agent'),
      });

      res.status(429).json({
        error: 'Too many requests from this IP',
        retryAfter: config.rateLimit.windowMs,
      });
    },
  });

  // Get rate limit key (IP or user ID)
  getKey(req) {
    if (req.user && req.user.userId) {
      return req.user.userId.toString();
    }
    return req.ip;
  }

  // Handle rate limit exceeded
  handleRateLimit(res, rateLimiterRes, limiterName) {
    const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000);

    logger.warn(`Rate limit exceeded (${limiterName})`, {
      remainingPoints: rateLimiterRes.remainingPoints,
      msBeforeNext: rateLimiterRes.msBeforeNext,
      totalHits: rateLimiterRes.totalHits,
    });

    res.set({
      'Retry-After': retryAfter,
      'X-RateLimit-Limit': rateLimiterRes.totalHits,
      'X-RateLimit-Remaining': rateLimiterRes.remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
    });

    res.status(429).json({
      error: `Too many requests to ${limiterName}`,
      retryAfter: retryAfter,
      limit: rateLimiterRes.totalHits,
      remaining: rateLimiterRes.remainingPoints,
      resetTime: new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
    });
  }

  // Create custom rate limiter
  createCustomLimiter(options) {
    const limiter = new RateLimiterRedis({
      storeClient: redisService.getClient(),
      keyPrefix: options.keyPrefix || 'custom',
      points: options.points || 100,
      duration: options.duration || 60,
      blockDuration: options.blockDuration || 60,
    });

    return async (req, res, next) => {
      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : this.getKey(req);
        await limiter.consume(key);
        next();
      } catch (rateLimiterRes) {
        this.handleRateLimit(res, rateLimiterRes, options.name || 'Custom API');
      }
    };
  }

  // Reset rate limit for a key
  async resetRateLimit(keyPrefix, key) {
    try {
      const limiter = new RateLimiterRedis({
        storeClient: redisService.getClient(),
        keyPrefix,
        points: 1,
        duration: 1,
      });

      await limiter.delete(key);
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
      return false;
    }
  }

  // Get rate limit status
  async getRateLimitStatus(keyPrefix, key) {
    try {
      const limiter = new RateLimiterRedis({
        storeClient: redisService.getClient(),
        keyPrefix,
        points: 1,
        duration: 1,
      });

      const status = await limiter.get(key);
      return status;
    } catch (error) {
      logger.error('Failed to get rate limit status:', error);
      return null;
    }
  }
}

module.exports = new RateLimiterMiddleware();
