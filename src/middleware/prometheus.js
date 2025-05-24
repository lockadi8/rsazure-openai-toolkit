const promClient = require('prom-client');
const logger = require('../utils/logger');

class PrometheusMiddleware {
  constructor() {
    // Create a Registry which registers the metrics
    this.register = new promClient.Registry();
    
    // Add a default label which is added to all metrics
    this.register.setDefaultLabels({
      app: 'shopee-scraper-api'
    });

    // Enable the collection of default metrics
    promClient.collectDefaultMetrics({ 
      register: this.register,
      timeout: 5000,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });

    this.setupCustomMetrics();
  }

  setupCustomMetrics() {
    // HTTP request duration histogram
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    // HTTP request total counter
    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });

    // HTTP request size histogram
    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });

    // HTTP response size histogram
    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
    });

    // Active connections gauge
    this.activeConnections = new promClient.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections'
    });

    // Scraping job metrics
    this.scrapingJobsTotal = new promClient.Counter({
      name: 'scraping_jobs_total',
      help: 'Total number of scraping jobs',
      labelNames: ['status', 'type']
    });

    this.scrapingJobDuration = new promClient.Histogram({
      name: 'scraping_job_duration_seconds',
      help: 'Duration of scraping jobs in seconds',
      labelNames: ['type', 'status'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200]
    });

    // Database operation metrics
    this.dbOperationsTotal = new promClient.Counter({
      name: 'database_operations_total',
      help: 'Total number of database operations',
      labelNames: ['operation', 'collection', 'status']
    });

    this.dbOperationDuration = new promClient.Histogram({
      name: 'database_operation_duration_seconds',
      help: 'Duration of database operations in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // Redis operation metrics
    this.redisOperationsTotal = new promClient.Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status']
    });

    this.redisOperationDuration = new promClient.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Duration of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // API rate limiting metrics
    this.rateLimitHits = new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'ip']
    });

    // Authentication metrics
    this.authAttempts = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status']
    });

    // Register all metrics
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.httpRequestSize);
    this.register.registerMetric(this.httpResponseSize);
    this.register.registerMetric(this.activeConnections);
    this.register.registerMetric(this.scrapingJobsTotal);
    this.register.registerMetric(this.scrapingJobDuration);
    this.register.registerMetric(this.dbOperationsTotal);
    this.register.registerMetric(this.dbOperationDuration);
    this.register.registerMetric(this.redisOperationsTotal);
    this.register.registerMetric(this.redisOperationDuration);
    this.register.registerMetric(this.rateLimitHits);
    this.register.registerMetric(this.authAttempts);

    logger.info('Prometheus metrics initialized');
  }

  // Middleware function for Express
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Increment active connections
      this.activeConnections.inc();

      // Get request size
      const requestSize = parseInt(req.get('content-length')) || 0;
      
      // Normalize route for metrics (remove IDs and dynamic parts)
      const route = this.normalizeRoute(req.route?.path || req.path);
      
      // Record request size
      this.httpRequestSize
        .labels(req.method, route)
        .observe(requestSize);

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = (Date.now() - startTime) / 1000;
        const responseSize = parseInt(res.get('content-length')) || 0;

        // Record metrics
        this.httpRequestDuration
          .labels(req.method, route, res.statusCode)
          .observe(duration);

        this.httpRequestTotal
          .labels(req.method, route, res.statusCode)
          .inc();

        this.httpResponseSize
          .labels(req.method, route, res.statusCode)
          .observe(responseSize);

        // Decrement active connections
        this.activeConnections.dec();

        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Normalize route paths for consistent metrics
  normalizeRoute(path) {
    if (!path) return 'unknown';
    
    // Replace common ID patterns
    return path
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectId
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[0-9a-fA-F-]{36}/g, '/:uuid') // UUIDs
      .replace(/\/[a-zA-Z0-9_-]+_\d+/g, '/:dynamic_id'); // Dynamic IDs
  }

  // Method to record scraping job metrics
  recordScrapingJob(type, status, duration) {
    this.scrapingJobsTotal.labels(status, type).inc();
    if (duration) {
      this.scrapingJobDuration.labels(type, status).observe(duration);
    }
  }

  // Method to record database operation metrics
  recordDatabaseOperation(operation, collection, status, duration) {
    this.dbOperationsTotal.labels(operation, collection, status).inc();
    if (duration) {
      this.dbOperationDuration.labels(operation, collection).observe(duration);
    }
  }

  // Method to record Redis operation metrics
  recordRedisOperation(operation, status, duration) {
    this.redisOperationsTotal.labels(operation, status).inc();
    if (duration) {
      this.redisOperationDuration.labels(operation).observe(duration);
    }
  }

  // Method to record rate limit hits
  recordRateLimitHit(endpoint, ip) {
    this.rateLimitHits.labels(endpoint, ip).inc();
  }

  // Method to record authentication attempts
  recordAuthAttempt(method, status) {
    this.authAttempts.labels(method, status).inc();
  }

  // Metrics endpoint handler
  metricsHandler() {
    return async (req, res) => {
      try {
        res.set('Content-Type', this.register.contentType);
        const metrics = await this.register.metrics();
        res.end(metrics);
      } catch (error) {
        logger.error('Error generating metrics:', error);
        res.status(500).end('Error generating metrics');
      }
    };
  }

  // Health check with metrics
  healthCheck() {
    return async (req, res) => {
      try {
        const metrics = await this.register.getSingleMetricAsString('process_cpu_user_seconds_total');
        const memoryUsage = process.memoryUsage();
        
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          },
          metrics: {
            available: true,
            endpoint: '/metrics'
          }
        });
      } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    };
  }

  // Get registry for custom usage
  getRegistry() {
    return this.register;
  }

  // Reset all metrics (useful for testing)
  reset() {
    this.register.resetMetrics();
  }
}

module.exports = new PrometheusMiddleware();
