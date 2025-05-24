// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

// Switch to the shopee_scraper database
db = db.getSiblingDB('shopee_scraper');

// Create application user
db.createUser({
  user: 'scraper_user',
  pwd: 'scraper_password',
  roles: [
    {
      role: 'readWrite',
      db: 'shopee_scraper'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password', 'firstName', 'lastName'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30,
          description: 'Username must be a string between 3-30 characters'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address'
        },
        password: {
          bsonType: 'string',
          minLength: 6,
          description: 'Password must be at least 6 characters'
        },
        firstName: {
          bsonType: 'string',
          maxLength: 50,
          description: 'First name must be a string'
        },
        lastName: {
          bsonType: 'string',
          maxLength: 50,
          description: 'Last name must be a string'
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin', 'moderator'],
          description: 'Role must be one of: user, admin, moderator'
        },
        isActive: {
          bsonType: 'bool',
          description: 'isActive must be a boolean'
        }
      }
    }
  }
});

db.createCollection('products', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['productId', 'name', 'price', 'category', 'shopName', 'shopId', 'url'],
      properties: {
        productId: {
          bsonType: 'string',
          description: 'Product ID must be a string'
        },
        name: {
          bsonType: 'string',
          minLength: 1,
          description: 'Product name is required'
        },
        price: {
          bsonType: 'number',
          minimum: 0,
          description: 'Price must be a positive number'
        },
        category: {
          bsonType: 'string',
          description: 'Category is required'
        },
        shopName: {
          bsonType: 'string',
          description: 'Shop name is required'
        },
        shopId: {
          bsonType: 'string',
          description: 'Shop ID is required'
        },
        url: {
          bsonType: 'string',
          description: 'Product URL is required'
        },
        rating: {
          bsonType: 'number',
          minimum: 0,
          maximum: 5,
          description: 'Rating must be between 0 and 5'
        },
        isActive: {
          bsonType: 'bool',
          description: 'isActive must be a boolean'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ apiKey: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1, isActive: 1 });

db.products.createIndex({ productId: 1 }, { unique: true });
db.products.createIndex({ name: 'text', description: 'text', brand: 'text' });
db.products.createIndex({ category: 1, price: 1 });
db.products.createIndex({ shopId: 1, isActive: 1 });
db.products.createIndex({ 'metadata.scrapedAt': -1 });
db.products.createIndex({ rating: -1, reviewCount: -1 });
db.products.createIndex({ soldCount: -1 });
db.products.createIndex({ isActive: 1, price: 1 });

// Create admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@shopee-scraper.com',
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6ukx.LFvO.', // password: admin123
  firstName: 'System',
  lastName: 'Administrator',
  role: 'admin',
  isActive: true,
  isEmailVerified: true,
  preferences: {
    notifications: {
      email: true,
      push: true,
      priceAlerts: true
    },
    dashboard: {
      defaultView: 'grid',
      itemsPerPage: 20
    }
  },
  apiQuota: {
    daily: 10000,
    monthly: 300000
  },
  apiUsage: {
    today: 0,
    thisMonth: 0,
    lastReset: new Date()
  },
  loginCount: 0,
  refreshTokens: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB initialization completed successfully!');
print('Created database: shopee_scraper');
print('Created user: scraper_user');
print('Created collections: users, products');
print('Created indexes for performance optimization');
print('Created admin user: admin@shopee-scraper.com (password: admin123)');
