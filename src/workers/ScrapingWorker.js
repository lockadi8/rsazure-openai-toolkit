const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const {
  ProductScrapingJob,
  OrderScrapingJob,
  ShopScrapingJob,
  BatchScrapingJob,
  ScheduledScrapingJob,
} = require('../jobs/scrapingJobs');

/**
 * Scraping Worker
 * Worker untuk memproses semua jenis scraping jobs
 */
class ScrapingWorker {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || config.queue.concurrency,
      queueName: options.queueName || config.queue.queues.scraping,
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
      logger.info(`Starting ScrapingWorker for queue: ${this.options.queueName}`);
      
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
      logger.info(`ScrapingWorker started successfully with concurrency: ${this.options.concurrency}`);
      
    } catch (error) {
      logger.error('Failed to start ScrapingWorker:', error);
      throw error;
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing scraping job ${job.id} (${job.name})`);
      
      this.stats.processed++;
      
      let result;
      
      // Route job to appropriate processor based on job name
      switch (job.name) {
        case 'product-scraping':
          result = await ProductScrapingJob.process(job);
          break;
          
        case 'order-scraping':
          result = await OrderScrapingJob.process(job);
          break;
          
        case 'shop-scraping':
          result = await ShopScrapingJob.process(job);
          break;
          
        case 'batch-scraping':
          result = await BatchScrapingJob.process(job);
          break;
          
        case 'scheduled-scraping':
          result = await ScheduledScrapingJob.process(job);
          break;
          
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.completed++;
      
      logger.info(`Scraping job ${job.id} completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime,
        workerId: this.getWorkerId(),
      };
      
    } catch (error) {
      this.stats.failed++;
      logger.error(`Scraping job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.worker.on('completed', (job, result) => {
      logger.debug(`Job ${job.id} completed with result:`, result);
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
    });
    
    this.worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn(`Job ${jobId} stalled`);
    });
    
    this.worker.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Get worker ID
   */
  getWorkerId() {
    return `scraping-worker-${process.pid}-${Date.now()}`;
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
      logger.info('Stopping ScrapingWorker...');
      
      if (this.worker) {
        await this.worker.close();
      }
      
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
      
      this.isRunning = false;
      logger.info('ScrapingWorker stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping ScrapingWorker:', error);
      throw error;
    }
  }

  /**
   * Force stop the worker
   */
  async forceStop() {
    try {
      logger.warn('Force stopping ScrapingWorker...');
      
      if (this.worker) {
        await this.worker.close(true);
      }
      
      if (this.redisConnection) {
        this.redisConnection.disconnect();
      }
      
      this.isRunning = false;
      logger.warn('ScrapingWorker force stopped');
      
    } catch (error) {
      logger.error('Error force stopping ScrapingWorker:', error);
      throw error;
    }
  }
}

module.exports = ScrapingWorker;
