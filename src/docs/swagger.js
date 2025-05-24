const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('../../config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shopee Scraper API',
      version: '1.0.0',
      description: 'Comprehensive REST API for Shopee scraping system with advanced features',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.shopee-scraper.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier'
            },
            username: {
              type: 'string',
              description: 'User username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'User active status'
            },
            isEmailVerified: {
              type: 'boolean',
              description: 'Email verification status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Product unique identifier'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            price: {
              type: 'number',
              description: 'Product price'
            },
            originalPrice: {
              type: 'number',
              description: 'Product original price'
            },
            discount: {
              type: 'number',
              description: 'Discount percentage'
            },
            rating: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Product rating'
            },
            reviewCount: {
              type: 'integer',
              description: 'Number of reviews'
            },
            soldCount: {
              type: 'integer',
              description: 'Number of items sold'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            brand: {
              type: 'string',
              description: 'Product brand'
            },
            shopId: {
              type: 'string',
              description: 'Shop identifier'
            },
            shopName: {
              type: 'string',
              description: 'Shop name'
            },
            images: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri'
              },
              description: 'Product images'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'Product URL'
            },
            isActive: {
              type: 'boolean',
              description: 'Product active status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product last update timestamp'
            }
          }
        },
        ShopeeAccount: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Account unique identifier'
            },
            userId: {
              type: 'string',
              description: 'Owner user ID'
            },
            username: {
              type: 'string',
              description: 'Shopee username'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Shopee email'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'pending_verification', 'error'],
              description: 'Account status'
            },
            isVerified: {
              type: 'boolean',
              description: 'Account verification status'
            },
            lastSync: {
              type: 'string',
              format: 'date-time',
              description: 'Last sync timestamp'
            },
            settings: {
              type: 'object',
              properties: {
                autoSync: {
                  type: 'boolean',
                  description: 'Auto sync enabled'
                },
                syncInterval: {
                  type: 'integer',
                  description: 'Sync interval in seconds'
                },
                notifications: {
                  type: 'boolean',
                  description: 'Notifications enabled'
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Order unique identifier'
            },
            orderId: {
              type: 'string',
              description: 'Shopee order ID'
            },
            userId: {
              type: 'string',
              description: 'User ID'
            },
            accountId: {
              type: 'string',
              description: 'Shopee account ID'
            },
            orderDate: {
              type: 'string',
              format: 'date-time',
              description: 'Order date'
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'],
              description: 'Order status'
            },
            totalAmount: {
              type: 'number',
              description: 'Total order amount'
            },
            shippingFee: {
              type: 'number',
              description: 'Shipping fee'
            },
            discount: {
              type: 'number',
              description: 'Discount amount'
            },
            finalAmount: {
              type: 'number',
              description: 'Final amount paid'
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method used'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: {
                    type: 'string',
                    description: 'Product ID'
                  },
                  name: {
                    type: 'string',
                    description: 'Product name'
                  },
                  price: {
                    type: 'number',
                    description: 'Product price'
                  },
                  quantity: {
                    type: 'integer',
                    description: 'Quantity ordered'
                  },
                  variant: {
                    type: 'string',
                    description: 'Product variant'
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field name'
                  },
                  message: {
                    type: 'string',
                    description: 'Field error message'
                  },
                  value: {
                    description: 'Field value that caused error'
                  }
                }
              },
              description: 'Detailed error information'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              description: 'Items per page'
            },
            total: {
              type: 'integer',
              description: 'Total number of items'
            },
            pages: {
              type: 'integer',
              description: 'Total number of pages'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management'
      },
      {
        name: 'Products',
        description: 'Product data and search'
      },
      {
        name: 'Accounts',
        description: 'Shopee account management'
      },
      {
        name: 'Orders',
        description: 'Order data and analytics'
      },
      {
        name: 'Scraper',
        description: 'Web scraping operations'
      },
      {
        name: 'Analytics',
        description: 'Data analytics and reporting'
      },
      {
        name: 'Admin',
        description: 'Administrative functions'
      },
      {
        name: 'Search',
        description: 'Search and filtering'
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { background: #fafafa; padding: 10px; border-radius: 4px; }
  `,
  customSiteTitle: 'Shopee Scraper API Documentation'
};

module.exports = {
  specs,
  swaggerUi,
  swaggerOptions
};
