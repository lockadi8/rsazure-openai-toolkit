const Joi = require('joi');
const logger = require('../utils/logger');

class ValidationMiddleware {
  // Generic validation middleware
  validate = (schema, property = 'body') => {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.validation('Validation failed', {
          property,
          errors,
          originalData: req[property]
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'The provided data is invalid',
          details: errors
        });
      }

      // Replace the original data with validated and sanitized data
      req[property] = value;
      next();
    };
  };

  // Auth validation schemas
  authSchemas = {
    register: Joi.object({
      username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
          'string.alphanum': 'Username must contain only alphanumeric characters',
          'string.min': 'Username must be at least 3 characters long',
          'string.max': 'Username cannot exceed 30 characters'
        }),
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address'
        }),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      firstName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
          'string.min': 'First name must be at least 2 characters long',
          'string.max': 'First name cannot exceed 50 characters'
        }),
      lastName: Joi.string()
        .min(2)
        .max(50)
        .required()
        .messages({
          'string.min': 'Last name must be at least 2 characters long',
          'string.max': 'Last name cannot exceed 50 characters'
        })
    }),

    login: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address'
        }),
      password: Joi.string()
        .required()
        .messages({
          'any.required': 'Password is required'
        })
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string()
        .required()
        .messages({
          'any.required': 'Current password is required'
        }),
      newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': 'New password must be at least 8 characters long',
          'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        })
    }),

    forgotPassword: Joi.object({
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address'
        })
    }),

    resetPassword: Joi.object({
      token: Joi.string()
        .required()
        .messages({
          'any.required': 'Reset token is required'
        }),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        })
    })
  };

  // Account validation schemas
  accountSchemas = {
    create: Joi.object({
      username: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
          'string.min': 'Username must be at least 3 characters long',
          'string.max': 'Username cannot exceed 50 characters'
        }),
      email: Joi.string()
        .email()
        .required()
        .messages({
          'string.email': 'Please provide a valid email address'
        }),
      password: Joi.string()
        .min(6)
        .required()
        .messages({
          'string.min': 'Password must be at least 6 characters long'
        })
    }),

    update: Joi.object({
      settings: Joi.object({
        autoSync: Joi.boolean(),
        syncInterval: Joi.number()
          .integer()
          .min(300)
          .max(86400)
          .messages({
            'number.min': 'Sync interval must be at least 300 seconds (5 minutes)',
            'number.max': 'Sync interval cannot exceed 86400 seconds (24 hours)'
          }),
        notifications: Joi.boolean(),
        categories: Joi.array().items(Joi.string()),
        priceRange: Joi.object({
          min: Joi.number().min(0),
          max: Joi.number().min(0)
        }).custom((value, helpers) => {
          if (value.min && value.max && value.min >= value.max) {
            return helpers.error('priceRange.invalid');
          }
          return value;
        }).messages({
          'priceRange.invalid': 'Minimum price must be less than maximum price'
        })
      })
    }),

    sync: Joi.object({
      force: Joi.boolean().default(false)
    })
  };

  // Product validation schemas
  productSchemas = {
    search: Joi.object({
      q: Joi.string().min(2).max(100),
      category: Joi.string().max(50),
      brand: Joi.string().max(50),
      priceMin: Joi.number().min(0),
      priceMax: Joi.number().min(0),
      rating: Joi.number().min(0).max(5),
      sort: Joi.string().valid('price', 'rating', 'soldCount', 'reviewCount', 'popularityScore', 'createdAt'),
      order: Joi.string().valid('asc', 'desc'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    }).custom((value, helpers) => {
      if (value.priceMin && value.priceMax && value.priceMin >= value.priceMax) {
        return helpers.error('price.invalid');
      }
      return value;
    }).messages({
      'price.invalid': 'Minimum price must be less than maximum price'
    })
  };

  // Scraper validation schemas
  scraperSchemas = {
    search: Joi.object({
      query: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
          'string.min': 'Search query must be at least 2 characters long',
          'string.max': 'Search query cannot exceed 100 characters'
        }),
      maxPages: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(5)
        .messages({
          'number.min': 'Maximum pages must be at least 1',
          'number.max': 'Maximum pages cannot exceed 20'
        }),
      filters: Joi.object({
        category: Joi.string().max(50),
        priceMin: Joi.number().min(0),
        priceMax: Joi.number().min(0),
        rating: Joi.number().min(0).max(5),
        location: Joi.string().max(50)
      }).default({})
    }),

    product: Joi.object({
      url: Joi.string()
        .uri()
        .required()
        .messages({
          'string.uri': 'Please provide a valid product URL'
        }),
      options: Joi.object({
        includeReviews: Joi.boolean().default(false),
        includeVariants: Joi.boolean().default(true),
        includeShopInfo: Joi.boolean().default(true)
      }).default({})
    }),

    bulkProducts: Joi.object({
      urls: Joi.array()
        .items(Joi.string().uri())
        .min(1)
        .max(50)
        .required()
        .messages({
          'array.min': 'At least one URL is required',
          'array.max': 'Cannot process more than 50 URLs at once'
        }),
      options: Joi.object({
        includeReviews: Joi.boolean().default(false),
        includeVariants: Joi.boolean().default(true),
        includeShopInfo: Joi.boolean().default(true),
        concurrent: Joi.number().integer().min(1).max(5).default(3)
      }).default({})
    })
  };

  // Analytics validation schemas
  analyticsSchemas = {
    dateRange: Joi.object({
      startDate: Joi.date()
        .iso()
        .required()
        .messages({
          'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
        }),
      endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .required()
        .messages({
          'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
          'date.min': 'End date must be after start date'
        }),
      groupBy: Joi.string()
        .valid('hour', 'day', 'week', 'month', 'year')
        .default('day'),
      category: Joi.string().max(50)
    })
  };

  // Common query validation schemas
  querySchemas = {
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    }),

    timeRange: Joi.object({
      timeRange: Joi.string()
        .valid('7d', '30d', '90d', '180d', '365d')
        .default('30d')
    })
  };

  // Sanitization helpers
  sanitizeHtml = (value) => {
    if (typeof value !== 'string') return value;
    
    // Remove HTML tags and potentially dangerous characters
    return value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim();
  };

  sanitizeInput = (schema) => {
    return schema.custom((value, helpers) => {
      if (typeof value === 'string') {
        return this.sanitizeHtml(value);
      }
      if (typeof value === 'object' && value !== null) {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = typeof val === 'string' ? this.sanitizeHtml(val) : val;
        }
        return sanitized;
      }
      return value;
    });
  };
}

module.exports = new ValidationMiddleware();
