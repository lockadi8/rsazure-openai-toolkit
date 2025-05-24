const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');
const config = require('../../../config');
const logger = require('../../utils/logger');
const EventEmitter = require('events');

/**
 * Advanced Queue Manager dengan BullMQ
 * Mengelola multiple queues, job priorities, retry strategies, dan monitoring
 */
class QueueManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      ...config.queue,
      ...options,
    };

    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
    this.redisConnection = null;
    this.isInitialized = false;

    // Statistics
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
      waitingJobs: 0,
      delayedJobs: 0,
      startTime: new Date(),
    };

    // Auto-scaling state
    this.autoScaling = {
      lastScaleAction: null,
      currentWorkers: new Map(),
      metrics: {
        queueSizes: new Map(),
        processingTimes: new Map(),
        errorRates: new Map(),
      },
    };

    // Rate limiting
    this.rateLimiters = new Map();

    this.setupEventHandlers();
  }

  /**
   * Initialize queue manager
   */
  async initialize() {
    try {
      logger.info('Initializing QueueManager...');

      // Setup Redis connection
      await this.setupRedisConnection();

      // Initialize queues
      await this.initializeQueues();

      // Setup monitoring
      this.setupMonitoring();

      // Start auto-scaling if enabled
      if (this.options.autoScaling.enabled) {
        this.startAutoScaling();
      }

      this.isInitialized = true;
      logger.info('QueueManager initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize QueueManager:', error);
      throw error;
    }
  }

  /**
   * Setup Redis connection
   */
  async setupRedisConnection() {
    const redisConfig = {
      ...config.database.redis,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.redisConnection = new Redis(redisConfig);
    await this.redisConnection.connect();

    logger.info('Redis connection established for QueueManager');
  }

  /**
   * Initialize all queues
   */
  async initializeQueues() {
    const queueNames = Object.values(this.options.queues);

    for (const queueName of queueNames) {
      await this.createQueue(queueName);
    }

    logger.info(`Initialized ${queueNames.length} queues`);
  }

  /**
   * Create a new queue
   */
  async createQueue(queueName, options = {}) {
    try {
      const queueOptions = {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: this.options.removeOnComplete,
          removeOnFail: this.options.removeOnFail,
          attempts: this.options.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: this.options.retryDelay,
          },
        },
        ...options,
      };

      const queue = new Queue(queueName, queueOptions);
      const queueEvents = new QueueEvents(queueName, { connection: this.redisConnection });

      this.queues.set(queueName, queue);
      this.queueEvents.set(queueName, queueEvents);

      // Setup queue event listeners
      this.setupQueueEventListeners(queueName, queue, queueEvents);

      logger.info(`Queue '${queueName}' created successfully`);

      return queue;
    } catch (error) {
      logger.error(`Failed to create queue '${queueName}':`, error);
      throw error;
    }
  }

  /**
   * Setup queue event listeners
   */
  setupQueueEventListeners(queueName, queue, queueEvents) {
    // Job completion events
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      this.stats.completedJobs++;
      this.emit('job:completed', { queueName, jobId, returnvalue });
      logger.debug(`Job ${jobId} completed in queue ${queueName}`);
    });

    // Job failure events
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.stats.failedJobs++;
      this.emit('job:failed', { queueName, jobId, failedReason });
      logger.error(`Job ${jobId} failed in queue ${queueName}:`, failedReason);
    });

    // Job progress events
    queueEvents.on('progress', ({ jobId, data }) => {
      this.emit('job:progress', { queueName, jobId, data });
    });

    // Job stalled events
    queueEvents.on('stalled', ({ jobId }) => {
      this.emit('job:stalled', { queueName, jobId });
      logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
    });

    // Queue error events
    queue.on('error', error => {
      this.emit('queue:error', { queueName, error });
      logger.error(`Queue ${queueName} error:`, error);
    });
  }

  /**
   * Add job to queue with advanced options
   */
  async addJob(queueName, jobName, jobData, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      // Apply rate limiting
      await this.checkRateLimit(queueName);

      // Prepare job options
      const jobOptions = {
        priority: options.priority || this.options.priorities.normal,
        delay: options.delay || 0,
        attempts: options.attempts || this.options.retryAttempts,
        backoff: this.getRetryStrategy(options.retryStrategy || 'exponential'),
        removeOnComplete: options.removeOnComplete || this.options.removeOnComplete,
        removeOnFail: options.removeOnFail || this.options.removeOnFail,
        ...options,
      };

      // Add timeout based on job type
      if (this.options.timeouts[jobName]) {
        jobOptions.timeout = this.options.timeouts[jobName];
      }

      const job = await queue.add(jobName, jobData, jobOptions);

      this.stats.totalJobs++;
      this.emit('job:added', { queueName, jobName, jobId: job.id, jobData });

      logger.debug(`Job ${job.id} (${jobName}) added to queue ${queueName}`);

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Add multiple jobs in batch
   */
  async addBulkJobs(queueName, jobs, options = {}) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const bulkJobs = jobs.map(job => ({
        name: job.name,
        data: job.data,
        opts: {
          priority: job.priority || this.options.priorities.normal,
          delay: job.delay || 0,
          attempts: job.attempts || this.options.retryAttempts,
          backoff: this.getRetryStrategy(job.retryStrategy || 'exponential'),
          ...job.options,
        },
      }));

      const addedJobs = await queue.addBulk(bulkJobs);

      this.stats.totalJobs += addedJobs.length;
      this.emit('jobs:bulk_added', { queueName, count: addedJobs.length });

      logger.info(`Added ${addedJobs.length} jobs to queue ${queueName}`);

      return addedJobs;
    } catch (error) {
      logger.error(`Failed to add bulk jobs to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get retry strategy configuration
   */
  getRetryStrategy(strategyName) {
    const strategy = this.options.retryStrategies[strategyName];
    if (!strategy) {
      return { type: 'exponential', delay: this.options.retryDelay };
    }

    return strategy.settings;
  }

  /**
   * Check rate limiting
   */
  async checkRateLimit(queueName) {
    const rateLimitConfig = this.options.rateLimiting[queueName];
    if (!rateLimitConfig) return;

    const key = `rate_limit:${queueName}`;
    const current = await this.redisConnection.incr(key);

    if (current === 1) {
      await this.redisConnection.expire(key, Math.ceil(rateLimitConfig.duration / 1000));
    }

    if (current > rateLimitConfig.max) {
      throw new Error(`Rate limit exceeded for queue ${queueName}`);
    }
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.on('job:completed', this.updateMetrics.bind(this));
    this.on('job:failed', this.updateMetrics.bind(this));
    this.on('job:stalled', this.handleStalledJob.bind(this));
  }

  /**
   * Update metrics for monitoring
   */
  async updateMetrics(eventData) {
    const { queueName } = eventData;

    // Update queue size metrics
    const queue = this.queues.get(queueName);
    if (queue) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const delayed = await queue.getDelayed();

      this.autoScaling.metrics.queueSizes.set(queueName, {
        waiting: waiting.length,
        active: active.length,
        delayed: delayed.length,
        total: waiting.length + active.length + delayed.length,
      });
    }
  }

  /**
   * Handle stalled jobs
   */
  async handleStalledJob(eventData) {
    const { queueName, jobId } = eventData;

    logger.warn(`Handling stalled job ${jobId} in queue ${queueName}`);

    // Implement stalled job recovery logic
    const queue = this.queues.get(queueName);
    if (queue) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          // Retry the job with increased priority
          await job.retry();
          logger.info(`Retried stalled job ${jobId}`);
        }
      } catch (error) {
        logger.error(`Failed to retry stalled job ${jobId}:`, error);
      }
    }
  }

  /**
   * Setup monitoring
   */
  setupMonitoring() {
    // Update stats every 30 seconds
    setInterval(async () => {
      await this.updateAllStats();
    }, 30000);

    // Emit health check every minute
    setInterval(() => {
      this.emit('health:check', this.getHealthStatus());
    }, 60000);
  }

  /**
   * Update all queue statistics
   */
  async updateAllStats() {
    try {
      let totalActive = 0;
      let totalWaiting = 0;
      let totalDelayed = 0;

      for (const [queueName, queue] of this.queues) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const delayed = await queue.getDelayed();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        totalActive += active.length;
        totalWaiting += waiting.length;
        totalDelayed += delayed.length;

        // Update per-queue metrics
        this.autoScaling.metrics.queueSizes.set(queueName, {
          waiting: waiting.length,
          active: active.length,
          delayed: delayed.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + delayed.length,
        });
      }

      this.stats.activeJobs = totalActive;
      this.stats.waitingJobs = totalWaiting;
      this.stats.delayedJobs = totalDelayed;
    } catch (error) {
      logger.error('Failed to update queue stats:', error);
    }
  }

  /**
   * Start auto-scaling
   */
  startAutoScaling() {
    logger.info('Starting auto-scaling for queues');

    setInterval(async () => {
      await this.performAutoScaling();
    }, this.options.autoScaling.cooldownPeriod);
  }

  /**
   * Perform auto-scaling based on queue metrics
   */
  async performAutoScaling() {
    try {
      for (const [queueName, metrics] of this.autoScaling.metrics.queueSizes) {
        const currentWorkers = this.autoScaling.currentWorkers.get(queueName) || 0;
        const queueSize = metrics.total;

        // Scale up if queue size exceeds threshold
        if (
          queueSize > this.options.autoScaling.scaleUpThreshold &&
          currentWorkers < this.options.autoScaling.maxWorkers
        ) {
          await this.scaleUpWorkers(queueName);

          // Scale down if queue size is below threshold
        } else if (
          queueSize < this.options.autoScaling.scaleDownThreshold &&
          currentWorkers > this.options.autoScaling.minWorkers
        ) {
          await this.scaleDownWorkers(queueName);
        }
      }
    } catch (error) {
      logger.error('Auto-scaling failed:', error);
    }
  }

  /**
   * Scale up workers for a queue
   */
  async scaleUpWorkers(queueName) {
    const currentWorkers = this.autoScaling.currentWorkers.get(queueName) || 0;
    const newWorkerCount = Math.min(currentWorkers + 1, this.options.autoScaling.maxWorkers);

    if (newWorkerCount > currentWorkers) {
      this.autoScaling.currentWorkers.set(queueName, newWorkerCount);
      this.autoScaling.lastScaleAction = new Date();

      logger.info(`Scaled up workers for queue ${queueName}: ${currentWorkers} -> ${newWorkerCount}`);
      this.emit('scaling:up', { queueName, from: currentWorkers, to: newWorkerCount });
    }
  }

  /**
   * Scale down workers for a queue
   */
  async scaleDownWorkers(queueName) {
    const currentWorkers = this.autoScaling.currentWorkers.get(queueName) || 0;
    const newWorkerCount = Math.max(currentWorkers - 1, this.options.autoScaling.minWorkers);

    if (newWorkerCount < currentWorkers) {
      this.autoScaling.currentWorkers.set(queueName, newWorkerCount);
      this.autoScaling.lastScaleAction = new Date();

      logger.info(`Scaled down workers for queue ${queueName}: ${currentWorkers} -> ${newWorkerCount}`);
      this.emit('scaling:down', { queueName, from: currentWorkers, to: newWorkerCount });
    }
  }

  /**
   * Get queue by name
   */
  getQueue(queueName) {
    return this.queues.get(queueName);
  }

  /**
   * Get all queues
   */
  getAllQueues() {
    return Array.from(this.queues.entries()).map(([name, queue]) => ({
      name,
      queue,
    }));
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const delayed = await queue.getDelayed();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      name: queueName,
      waiting: waiting.length,
      active: active.length,
      delayed: delayed.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + delayed.length,
      jobs: {
        waiting: waiting.slice(0, 10), // First 10 jobs
        active: active.slice(0, 10),
        delayed: delayed.slice(0, 10),
        failed: failed.slice(0, 10),
      },
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = {};

    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return {
      queues: stats,
      global: this.stats,
      autoScaling: {
        enabled: this.options.autoScaling.enabled,
        currentWorkers: Object.fromEntries(this.autoScaling.currentWorkers),
        lastScaleAction: this.autoScaling.lastScaleAction,
      },
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const successRate = this.stats.totalJobs > 0 ? (this.stats.completedJobs / this.stats.totalJobs) * 100 : 100;

    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      uptime,
      queues: this.queues.size,
      workers: this.workers.size,
      stats: this.stats,
      successRate: Math.round(successRate * 100) / 100,
      redis: this.redisConnection?.status || 'disconnected',
    };
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    logger.info(`Queue '${queueName}' paused`);
    this.emit('queue:paused', { queueName });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    logger.info(`Queue '${queueName}' resumed`);
    this.emit('queue:resumed', { queueName });
  }

  /**
   * Clean queue (remove completed/failed jobs)
   */
  async cleanQueue(queueName, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const cleanOptions = {
      grace: options.grace || 5000,
      count: options.count || 100,
      ...options,
    };

    // Clean completed jobs
    if (options.completed !== false) {
      await queue.clean(cleanOptions.grace, cleanOptions.count, 'completed');
    }

    // Clean failed jobs
    if (options.failed !== false) {
      await queue.clean(cleanOptions.grace, cleanOptions.count, 'failed');
    }

    logger.info(`Cleaned queue '${queueName}'`);
    this.emit('queue:cleaned', { queueName, options: cleanOptions });
  }

  /**
   * Remove a specific job
   */
  async removeJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found in queue '${queueName}'`);
    }

    await job.remove();
    logger.info(`Removed job ${jobId} from queue ${queueName}`);
    this.emit('job:removed', { queueName, jobId });
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found in queue '${queueName}'`);
    }

    await job.retry();
    logger.info(`Retried job ${jobId} in queue ${queueName}`);
    this.emit('job:retried', { queueName, jobId });
  }

  /**
   * Get job details
   */
  async getJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      delay: job.delay,
    };
  }

  /**
   * Add worker to a queue
   */
  addWorker(queueName, processor, options = {}) {
    if (!this.queues.has(queueName)) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const workerOptions = {
      connection: this.redisConnection,
      concurrency: options.concurrency || this.options.concurrency,
      ...options,
    };

    const worker = new Worker(queueName, processor, workerOptions);

    // Setup worker event listeners
    this.setupWorkerEventListeners(queueName, worker);

    this.workers.set(`${queueName}-${Date.now()}`, worker);

    logger.info(`Worker added to queue '${queueName}'`);
    this.emit('worker:added', { queueName });

    return worker;
  }

  /**
   * Setup worker event listeners
   */
  setupWorkerEventListeners(queueName, worker) {
    worker.on('completed', job => {
      this.emit('worker:job:completed', { queueName, jobId: job.id });
    });

    worker.on('failed', (job, err) => {
      this.emit('worker:job:failed', { queueName, jobId: job.id, error: err });
    });

    worker.on('error', err => {
      this.emit('worker:error', { queueName, error: err });
      logger.error(`Worker error in queue ${queueName}:`, err);
    });

    worker.on('stalled', jobId => {
      this.emit('worker:job:stalled', { queueName, jobId });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down QueueManager...');

      // Close all workers
      for (const [workerId, worker] of this.workers) {
        await worker.close();
        logger.debug(`Worker ${workerId} closed`);
      }

      // Close all queue events
      for (const [queueName, queueEvents] of this.queueEvents) {
        await queueEvents.close();
        logger.debug(`Queue events for ${queueName} closed`);
      }

      // Close all queues
      for (const [queueName, queue] of this.queues) {
        await queue.close();
        logger.debug(`Queue ${queueName} closed`);
      }

      // Close Redis connection
      if (this.redisConnection) {
        await this.redisConnection.quit();
        logger.debug('Redis connection closed');
      }

      this.isInitialized = false;
      logger.info('QueueManager shutdown completed');

      this.emit('shutdown');
    } catch (error) {
      logger.error('Error during QueueManager shutdown:', error);
      throw error;
    }
  }

  /**
   * Emergency stop (force shutdown)
   */
  async emergencyStop() {
    try {
      logger.warn('Emergency stop initiated for QueueManager');

      // Force close all workers
      for (const [workerId, worker] of this.workers) {
        try {
          await worker.close(true); // Force close
        } catch (error) {
          logger.error(`Error force closing worker ${workerId}:`, error);
        }
      }

      // Force close Redis connection
      if (this.redisConnection) {
        try {
          this.redisConnection.disconnect();
        } catch (error) {
          logger.error('Error disconnecting Redis:', error);
        }
      }

      this.isInitialized = false;
      logger.warn('Emergency stop completed');

      this.emit('emergency:stop');
    } catch (error) {
      logger.error('Error during emergency stop:', error);
      throw error;
    }
  }
}

module.exports = QueueManager;
