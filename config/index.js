const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const config = {
  // Server Configuration
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
  },

  // Database Configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shopee_scraper',
      dbName: process.env.MONGODB_DB_NAME || 'shopee_scraper',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB, 10) || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    },
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'shopee',
      maxRetries: 3,
      requestTimeout: 60000,
      sniffOnStart: true,
    },
  },

  // Authentication & Security
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    },
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },

  // Scraping Configuration
  scraper: {
    concurrent: parseInt(process.env.SCRAPER_CONCURRENT_LIMIT, 10) || 5,
    delay: {
      min: parseInt(process.env.SCRAPER_DELAY_MIN, 10) || 1000,
      max: parseInt(process.env.SCRAPER_DELAY_MAX, 10) || 3000,
    },
    timeout: parseInt(process.env.SCRAPER_TIMEOUT, 10) || 30000,
    retryAttempts: parseInt(process.env.SCRAPER_RETRY_ATTEMPTS, 10) || 3,
    userAgentsRotation: process.env.SCRAPER_USER_AGENTS_ROTATION === 'true',
  },

  // Puppeteer Configuration
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(',') : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES ?
      process.env.UPLOAD_ALLOWED_TYPES.split(',') :
      ['image/jpeg', 'image/png', 'image/gif', 'text/csv', 'application/json'],
    destination: path.join(__dirname, '../uploads'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || 'logs/',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
    },
  },

  // Queue Configuration
  queue: {
    // General queue settings
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY, 10) || 10,
    retryAttempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS, 10) || 3,
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY, 10) || 5000,
    removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE, 10) || 100,
    removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL, 10) || 50,

    // Queue names
    queues: {
      scraping: 'scraping-queue',
      dataProcessing: 'data-processing-queue',
      notifications: 'notifications-queue',
      cleanup: 'cleanup-queue',
      scheduler: 'scheduler-queue',
    },

    // Job priorities
    priorities: {
      critical: 10,
      high: 7,
      normal: 5,
      low: 3,
      background: 1,
    },

    // Retry strategies
    retryStrategies: {
      exponential: {
        type: 'exponential',
        settings: {
          delay: 2000,
          factor: 2,
          maxDelay: 30000,
        },
      },
      fixed: {
        type: 'fixed',
        settings: {
          delay: 5000,
        },
      },
      linear: {
        type: 'linear',
        settings: {
          delay: 1000,
          increment: 1000,
        },
      },
    },

    // Job timeouts (in milliseconds)
    timeouts: {
      productScraping: 60000,
      orderScraping: 120000,
      shopScraping: 90000,
      batchScraping: 300000,
      dataProcessing: 30000,
      notifications: 10000,
      cleanup: 60000,
    },

    // Rate limiting
    rateLimiting: {
      scraping: {
        max: 100,
        duration: 60000, // 1 minute
      },
      dataProcessing: {
        max: 200,
        duration: 60000,
      },
      notifications: {
        max: 50,
        duration: 60000,
      },
    },

    // Auto-scaling settings
    autoScaling: {
      enabled: process.env.QUEUE_AUTO_SCALING === 'true',
      minWorkers: parseInt(process.env.QUEUE_MIN_WORKERS, 10) || 2,
      maxWorkers: parseInt(process.env.QUEUE_MAX_WORKERS, 10) || 20,
      scaleUpThreshold: parseInt(process.env.QUEUE_SCALE_UP_THRESHOLD, 10) || 10,
      scaleDownThreshold: parseInt(process.env.QUEUE_SCALE_DOWN_THRESHOLD, 10) || 2,
      cooldownPeriod: parseInt(process.env.QUEUE_COOLDOWN_PERIOD, 10) || 300000, // 5 minutes
    },

    // Dashboard settings
    dashboard: {
      enabled: process.env.QUEUE_DASHBOARD_ENABLED !== 'false',
      port: parseInt(process.env.QUEUE_DASHBOARD_PORT, 10) || 3001,
      username: process.env.QUEUE_DASHBOARD_USERNAME || 'admin',
      password: process.env.QUEUE_DASHBOARD_PASSWORD || 'admin123',
    },
  },

  // Shopee Specific
  shopee: {
    baseUrl: process.env.SHOPEE_BASE_URL || 'https://shopee.co.id',
    apiBaseUrl: process.env.SHOPEE_API_BASE_URL || 'https://shopee.co.id/api/v4',
    searchDelay: parseInt(process.env.SHOPEE_SEARCH_DELAY, 10) || 2000,
    productDelay: parseInt(process.env.SHOPEE_PRODUCT_DELAY, 10) || 1500,
    maxPagesPerSearch: parseInt(process.env.SHOPEE_MAX_PAGES_PER_SEARCH, 10) || 50,
  },

  // Security
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN ?
        process.env.CORS_ORIGIN.split(',') :
        ['http://localhost:3000', 'http://localhost:3001'],
    },
    helmet: process.env.HELMET_ENABLED !== 'false',
    compression: process.env.COMPRESSION_ENABLED !== 'false',
  },

  // Development
  development: {
    debug: process.env.DEBUG_MODE === 'true',
    mockScraping: process.env.MOCK_SCRAPING === 'true',
    cacheTtl: parseInt(process.env.CACHE_TTL, 10) || 3600,
  },
};

module.exports = config;
