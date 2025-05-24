const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const config = require('../config');
const logger = require('./utils/logger');
const database = require('./services/database');
const redisService = require('./services/redis');
const elasticsearchService = require('./services/elasticsearch');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const auth = require('./middleware/auth');
const security = require('./middleware/security');
const validation = require('./middleware/validation');
const prometheus = require('./middleware/prometheus');

// Import documentation
const { specs, swaggerUi, swaggerOptions } = require('./docs/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const scraperRoutes = require('./routes/scraper');
const productRoutes = require('./routes/products');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const accountRoutes = require('./routes/accountRoutes');
const orderRoutes = require('./routes/orderRoutes');

class Application {
  constructor() {
    this.app = express();
    this.server = null;
  }

  async initialize() {
    try {
      // Initialize services
      await this.initializeServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  async initializeServices() {
    logger.info('Initializing services...');

    // Initialize database connections
    await database.connect();
    await redisService.connect();
    await elasticsearchService.connect();

    logger.info('All services initialized successfully');
  }

  setupMiddleware() {
    // Security middleware
    if (config.security.helmet) {
      this.app.use(helmet());
    }

    // Compression
    if (config.security.compression) {
      this.app.use(compression());
    }

    // CORS
    this.app.use(
      cors({
        origin: config.security.cors.origin,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Prometheus monitoring
    this.app.use(prometheus.middleware());

    // Logging
    if (config.server.env !== 'test') {
      this.app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    }

    // Rate limiting
    this.app.use(rateLimiter);

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    this.app.use('/docs', express.static(path.join(__dirname, '../docs')));
  }

  setupRoutes() {
    // API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

    // Metrics endpoint
    this.app.get('/metrics', prometheus.metricsHandler());

    // Health check with enhanced metrics
    this.app.get('/health', prometheus.healthCheck());

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/scraper', auth.authenticate, scraperRoutes);
    this.app.use('/api/products', auth.authenticate, productRoutes);
    this.app.use('/api/analytics', auth.authenticate, analyticsRoutes);
    this.app.use('/api/admin', auth.authenticate, auth.requireRole('admin'), adminRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/accounts', auth.authenticate, accountRoutes);
    this.app.use('/api/orders', auth.authenticate, orderRoutes);

    // Serve frontend in production
    if (config.server.env === 'production') {
      this.app.use(express.static(path.join(__dirname, '../frontend/build')));
      this.app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
      });
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(config.server.port, config.server.host, () => {
        logger.info(`Server running on ${config.server.host}:${config.server.port}`);
        logger.info(`Environment: ${config.server.env}`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async signal => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close(async () => {
          logger.info('HTTP server closed');

          try {
            await database.disconnect();
            await redisService.disconnect();
            await elasticsearchService.disconnect();

            logger.info('All services disconnected');
            process.exit(0);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
          }
        });
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start application
if (require.main === module) {
  const app = new Application();
  app.start().catch(error => {
    logger.error('Application startup failed:', error);
    process.exit(1);
  });
}

module.exports = Application;
