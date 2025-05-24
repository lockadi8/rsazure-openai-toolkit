const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const logger = require('../utils/logger');
const config = require('../../config');

class SecurityMiddleware {
  constructor() {
    this.setupHelmet();
    this.setupRateLimiting();
  }

  // Enhanced Helmet configuration
  setupHelmet() {
    this.helmetConfig = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.shopee.co.id"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'same-origin' }
    });
  }

  // Enhanced rate limiting
  setupRateLimiting() {
    // General API rate limiting
    this.generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.security('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: '15 minutes'
        });
      }
    });

    // Auth endpoints rate limiting (stricter)
    this.authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // limit each IP to 10 auth requests per windowMs
      message: {
        error: 'Too many authentication attempts',
        retryAfter: '15 minutes'
      },
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        logger.security('Auth rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl
        });
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please wait before trying again.',
          retryAfter: '15 minutes'
        });
      }
    });

    // Scraper endpoints rate limiting (very strict)
    this.scraperLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50, // limit each IP to 50 scraper requests per hour
      message: {
        error: 'Scraper rate limit exceeded',
        retryAfter: '1 hour'
      },
      handler: (req, res) => {
        logger.security('Scraper rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          userId: req.user?.userId
        });
        
        res.status(429).json({
          error: 'Scraper rate limit exceeded',
          message: 'Too many scraping requests. Please wait before trying again.',
          retryAfter: '1 hour'
        });
      }
    });

    // Admin endpoints rate limiting
    this.adminLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 admin requests per windowMs
      message: {
        error: 'Admin rate limit exceeded',
        retryAfter: '15 minutes'
      },
      handler: (req, res) => {
        logger.security('Admin rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          userId: req.user?.userId
        });
        
        res.status(429).json({
          error: 'Admin rate limit exceeded',
          message: 'Too many admin requests. Please wait before trying again.',
          retryAfter: '15 minutes'
        });
      }
    });
  }

  // XSS Protection middleware
  xssProtection = (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = this.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      logger.error('XSS protection error:', error);
      res.status(500).json({
        error: 'Security processing error'
      });
    }
  };

  // Sanitize object recursively
  sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  };

  // NoSQL Injection Protection
  noSqlInjectionProtection = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.security('NoSQL injection attempt detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        sanitizedKey: key
      });
    }
  });

  // HTTP Parameter Pollution Protection
  hppProtection = hpp({
    whitelist: ['sort', 'category', 'tags'] // Allow arrays for these parameters
  });

  // Security headers middleware
  securityHeaders = (req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Add API-specific headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('X-Response-Time', Date.now());

    next();
  };

  // Request logging for security monitoring
  securityLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log suspicious patterns
    const suspiciousPatterns = [
      /(\<script\>|\<\/script\>)/i,
      /(union|select|insert|delete|update|drop|create|alter)/i,
      /(\$ne|\$gt|\$lt|\$in|\$nin)/i,
      /(javascript:|data:|vbscript:)/i
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    });

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(requestData) || pattern.test(req.originalUrl)
    );

    if (isSuspicious) {
      logger.security('Suspicious request detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        query: req.query,
        params: req.params
      });
    }

    // Log response time
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 5000) { // Log slow requests
        logger.performance('Slow request detected', {
          method: req.method,
          url: req.originalUrl,
          responseTime,
          statusCode: res.statusCode
        });
      }
    });

    next();
  };

  // CORS configuration
  corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = config.security.cors.origin;
      
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.security('CORS violation', {
          origin,
          allowedOrigins
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
    maxAge: 86400 // 24 hours
  };

  // Input size limiting
  inputSizeLimiter = (req, res, next) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
      logger.security('Request size limit exceeded', {
        ip: req.ip,
        contentLength: req.headers['content-length'],
        maxSize
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        message: 'Request size exceeds the maximum allowed limit'
      });
    }
    
    next();
  };

  // Get all security middleware
  getAllMiddleware() {
    return {
      helmet: this.helmetConfig,
      generalLimiter: this.generalLimiter,
      authLimiter: this.authLimiter,
      scraperLimiter: this.scraperLimiter,
      adminLimiter: this.adminLimiter,
      xssProtection: this.xssProtection,
      noSqlInjectionProtection: this.noSqlInjectionProtection,
      hppProtection: this.hppProtection,
      securityHeaders: this.securityHeaders,
      securityLogger: this.securityLogger,
      corsOptions: this.corsOptions,
      inputSizeLimiter: this.inputSizeLimiter
    };
  }
}

module.exports = new SecurityMiddleware();
