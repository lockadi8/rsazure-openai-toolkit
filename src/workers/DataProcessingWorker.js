const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const Product = require('../models/Product');
const { searchService } = require('../services/searchService');
const { dataSyncService } = require('../services/dataSyncService');

/**
 * Data Processing Worker
 * Worker untuk memproses data hasil scraping
 */
class DataProcessingWorker {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || config.queue.concurrency,
      queueName: options.queueName || config.queue.queues.dataProcessing,
      ...options,
    };
    
    this.worker = null;
    this.isRunning = false;
    this.stats = {
      processed: 0,
      completed: 0,
      failed: 0,
      startTime: new Date(),
    };
    
    // Setup Redis connection
    this.redisConnection = new Redis({
      ...config.database.redis,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  /**
   * Start the worker
   */
  async start() {
    try {
      logger.info(`Starting DataProcessingWorker for queue: ${this.options.queueName}`);
      
      // Connect to Redis
      await this.redisConnection.connect();
      
      // Create worker
      this.worker = new Worker(
        this.options.queueName,
        this.processJob.bind(this),
        {
          connection: this.redisConnection,
          concurrency: this.options.concurrency,
          removeOnComplete: config.queue.removeOnComplete,
          removeOnFail: config.queue.removeOnFail,
        }
      );
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isRunning = true;
      logger.info(`DataProcessingWorker started successfully with concurrency: ${this.options.concurrency}`);
      
    } catch (error) {
      logger.error('Failed to start DataProcessingWorker:', error);
      throw error;
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing data job ${job.id} (${job.name})`);
      
      this.stats.processed++;
      
      let result;
      
      // Route job to appropriate processor based on job name
      switch (job.name) {
        case 'save-product-data':
          result = await this.saveProductData(job);
          break;
          
        case 'update-elasticsearch':
          result = await this.updateElasticsearch(job);
          break;
          
        case 'sync-database':
          result = await this.syncDatabase(job);
          break;
          
        case 'validate-data':
          result = await this.validateData(job);
          break;
          
        case 'transform-data':
          result = await this.transformData(job);
          break;
          
        case 'aggregate-data':
          result = await this.aggregateData(job);
          break;
          
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.completed++;
      
      logger.info(`Data processing job ${job.id} completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime,
        workerId: this.getWorkerId(),
      };
      
    } catch (error) {
      this.stats.failed++;
      logger.error(`Data processing job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Save product data to database
   */
  async saveProductData(job) {
    const { productData, options = {} } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const savedProducts = [];
      const errors = [];
      
      // Process each product
      for (let i = 0; i < productData.length; i++) {
        const product = productData[i];
        
        try {
          // Validate product data
          if (!product.productId || !product.name) {
            throw new Error('Missing required product fields');
          }
          
          // Save or update product
          const savedProduct = await Product.findOneAndUpdate(
            { productId: product.productId },
            {
              ...product,
              lastUpdated: new Date(),
              source: 'scraper',
            },
            { upsert: true, new: true }
          );
          
          savedProducts.push(savedProduct);
          
        } catch (error) {
          logger.error(`Failed to save product ${product.productId}:`, error);
          errors.push({
            productId: product.productId,
            error: error.message,
          });
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / productData.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        savedCount: savedProducts.length,
        errorCount: errors.length,
        savedProducts: savedProducts.slice(0, 10), // First 10 for logging
        errors,
      };
      
    } catch (error) {
      logger.error('Failed to save product data:', error);
      throw error;
    }
  }

  /**
   * Update Elasticsearch index
   */
  async updateElasticsearch(job) {
    const { data, indexName, operation = 'index' } = job.data;
    
    try {
      await job.updateProgress(10);
      
      let result;
      
      switch (operation) {
        case 'index':
          result = await searchService.indexDocuments(indexName, data);
          break;
          
        case 'update':
          result = await searchService.updateDocuments(indexName, data);
          break;
          
        case 'delete':
          result = await searchService.deleteDocuments(indexName, data);
          break;
          
        default:
          throw new Error(`Unknown Elasticsearch operation: ${operation}`);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        operation,
        indexName,
        processedCount: Array.isArray(data) ? data.length : 1,
        result,
      };
      
    } catch (error) {
      logger.error('Failed to update Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Sync database
   */
  async syncDatabase(job) {
    const { syncType, options = {} } = job.data;
    
    try {
      await job.updateProgress(10);
      
      let result;
      
      switch (syncType) {
        case 'full':
          result = await dataSyncService.performFullSync(options);
          break;
          
        case 'incremental':
          result = await dataSyncService.performIncrementalSync(options);
          break;
          
        case 'elasticsearch':
          result = await dataSyncService.syncToElasticsearch(options);
          break;
          
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        syncType,
        result,
      };
      
    } catch (error) {
      logger.error('Failed to sync database:', error);
      throw error;
    }
  }

  /**
   * Validate data
   */
  async validateData(job) {
    const { data, validationRules } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const validData = [];
      const invalidData = [];
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const validation = this.validateItem(item, validationRules);
        
        if (validation.isValid) {
          validData.push(item);
        } else {
          invalidData.push({
            item,
            errors: validation.errors,
          });
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / data.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        totalCount: data.length,
        validCount: validData.length,
        invalidCount: invalidData.length,
        validData: validData.slice(0, 10),
        invalidData: invalidData.slice(0, 10),
      };
      
    } catch (error) {
      logger.error('Failed to validate data:', error);
      throw error;
    }
  }

  /**
   * Transform data
   */
  async transformData(job) {
    const { data, transformRules } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const transformedData = [];
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const transformed = this.transformItem(item, transformRules);
        transformedData.push(transformed);
        
        // Update progress
        const progress = Math.round(((i + 1) / data.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        originalCount: data.length,
        transformedCount: transformedData.length,
        transformedData: transformedData.slice(0, 10),
      };
      
    } catch (error) {
      logger.error('Failed to transform data:', error);
      throw error;
    }
  }

  /**
   * Aggregate data
   */
  async aggregateData(job) {
    const { data, aggregationRules } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const aggregatedData = this.performAggregation(data, aggregationRules);
      
      await job.updateProgress(100);
      
      return {
        success: true,
        originalCount: data.length,
        aggregatedData,
      };
      
    } catch (error) {
      logger.error('Failed to aggregate data:', error);
      throw error;
    }
  }

  /**
   * Validate individual item
   */
  validateItem(item, rules) {
    const errors = [];
    
    for (const rule of rules) {
      const { field, type, required, min, max } = rule;
      const value = item[field];
      
      if (required && (value === undefined || value === null)) {
        errors.push(`Field ${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (type === 'string' && typeof value !== 'string') {
          errors.push(`Field ${field} must be a string`);
        } else if (type === 'number' && typeof value !== 'number') {
          errors.push(`Field ${field} must be a number`);
        } else if (type === 'array' && !Array.isArray(value)) {
          errors.push(`Field ${field} must be an array`);
        }
        
        if (min !== undefined && value < min) {
          errors.push(`Field ${field} must be at least ${min}`);
        }
        
        if (max !== undefined && value > max) {
          errors.push(`Field ${field} must be at most ${max}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Transform individual item
   */
  transformItem(item, rules) {
    const transformed = { ...item };
    
    for (const rule of rules) {
      const { field, operation, value } = rule;
      
      switch (operation) {
        case 'rename':
          if (transformed[field] !== undefined) {
            transformed[value] = transformed[field];
            delete transformed[field];
          }
          break;
          
        case 'default':
          if (transformed[field] === undefined || transformed[field] === null) {
            transformed[field] = value;
          }
          break;
          
        case 'format':
          if (transformed[field] !== undefined) {
            transformed[field] = this.formatValue(transformed[field], value);
          }
          break;
          
        case 'calculate':
          transformed[field] = this.calculateValue(transformed, value);
          break;
      }
    }
    
    return transformed;
  }

  /**
   * Format value based on format type
   */
  formatValue(value, format) {
    switch (format) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }

  /**
   * Calculate value based on expression
   */
  calculateValue(item, expression) {
    // Simple expression evaluator
    // In production, use a proper expression parser
    try {
      return eval(expression.replace(/\{(\w+)\}/g, (match, field) => {
        return item[field] || 0;
      }));
    } catch (error) {
      logger.error('Failed to calculate value:', error);
      return null;
    }
  }

  /**
   * Perform data aggregation
   */
  performAggregation(data, rules) {
    const result = {};
    
    for (const rule of rules) {
      const { field, operation, groupBy } = rule;
      
      if (groupBy) {
        result[`${field}_by_${groupBy}`] = this.groupAndAggregate(data, field, operation, groupBy);
      } else {
        result[`${field}_${operation}`] = this.aggregate(data, field, operation);
      }
    }
    
    return result;
  }

  /**
   * Aggregate values
   */
  aggregate(data, field, operation) {
    const values = data.map(item => item[field]).filter(v => v !== undefined && v !== null);
    
    switch (operation) {
      case 'sum':
        return values.reduce((sum, val) => sum + Number(val), 0);
      case 'avg':
        return values.length > 0 ? values.reduce((sum, val) => sum + Number(val), 0) / values.length : 0;
      case 'min':
        return Math.min(...values.map(Number));
      case 'max':
        return Math.max(...values.map(Number));
      case 'count':
        return values.length;
      default:
        return null;
    }
  }

  /**
   * Group and aggregate values
   */
  groupAndAggregate(data, field, operation, groupBy) {
    const groups = {};
    
    for (const item of data) {
      const groupValue = item[groupBy];
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(item);
    }
    
    const result = {};
    for (const [groupValue, groupData] of Object.entries(groups)) {
      result[groupValue] = this.aggregate(groupData, field, operation);
    }
    
    return result;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.worker.on('completed', (job, result) => {
      logger.debug(`Data processing job ${job.id} completed with result:`, result);
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error(`Data processing job ${job.id} failed:`, err);
    });
    
    this.worker.on('error', (err) => {
      logger.error('Data processing worker error:', err);
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn(`Data processing job ${jobId} stalled`);
    });
    
    this.worker.on('progress', (job, progress) => {
      logger.debug(`Data processing job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Get worker ID
   */
  getWorkerId() {
    return `data-processing-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const avgProcessingTime = this.stats.processed > 0 ? 
      uptime / this.stats.processed : 0;
    
    return {
      ...this.stats,
      uptime,
      avgProcessingTime: Math.round(avgProcessingTime),
      successRate: this.stats.processed > 0 ? 
        (this.stats.completed / this.stats.processed) * 100 : 100,
      isRunning: this.isRunning,
      workerId: this.getWorkerId(),
    };
  }

  /**
   * Stop the worker
   */
  async stop() {
    try {
      logger.info('Stopping DataProcessingWorker...');
      
      if (this.worker) {
        await this.worker.close();
      }
      
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
      
      this.isRunning = false;
      logger.info('DataProcessingWorker stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping DataProcessingWorker:', error);
      throw error;
    }
  }

  /**
   * Force stop the worker
   */
  async forceStop() {
    try {
      logger.warn('Force stopping DataProcessingWorker...');
      
      if (this.worker) {
        await this.worker.close(true);
      }
      
      if (this.redisConnection) {
        this.redisConnection.disconnect();
      }
      
      this.isRunning = false;
      logger.warn('DataProcessingWorker force stopped');
      
    } catch (error) {
      logger.error('Error force stopping DataProcessingWorker:', error);
      throw error;
    }
  }
}

module.exports = DataProcessingWorker;
