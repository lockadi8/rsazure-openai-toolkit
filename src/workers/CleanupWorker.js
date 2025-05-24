const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const Product = require('../models/Product');
const fs = require('fs').promises;
const path = require('path');

/**
 * Cleanup Worker
 * Worker untuk membersihkan data lama, file temporary, dan maintenance
 */
class CleanupWorker {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || config.queue.concurrency,
      queueName: options.queueName || config.queue.queues.cleanup,
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
      logger.info(`Starting CleanupWorker for queue: ${this.options.queueName}`);
      
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
      logger.info(`CleanupWorker started successfully with concurrency: ${this.options.concurrency}`);
      
    } catch (error) {
      logger.error('Failed to start CleanupWorker:', error);
      throw error;
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing cleanup job ${job.id} (${job.name})`);
      
      this.stats.processed++;
      
      let result;
      
      // Route job to appropriate processor based on job name
      switch (job.name) {
        case 'cleanup-old-data':
          result = await this.cleanupOldData(job);
          break;
          
        case 'cleanup-temp-files':
          result = await this.cleanupTempFiles(job);
          break;
          
        case 'cleanup-logs':
          result = await this.cleanupLogs(job);
          break;
          
        case 'cleanup-cache':
          result = await this.cleanupCache(job);
          break;
          
        case 'cleanup-failed-jobs':
          result = await this.cleanupFailedJobs(job);
          break;
          
        case 'database-maintenance':
          result = await this.databaseMaintenance(job);
          break;
          
        case 'elasticsearch-maintenance':
          result = await this.elasticsearchMaintenance(job);
          break;
          
        default:
          throw new Error(`Unknown cleanup type: ${job.name}`);
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.completed++;
      
      logger.info(`Cleanup job ${job.id} completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime,
        workerId: this.getWorkerId(),
      };
      
    } catch (error) {
      this.stats.failed++;
      logger.error(`Cleanup job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Cleanup old data from database
   */
  async cleanupOldData(job) {
    const { 
      collections = ['products'], 
      olderThan = 30, // days
      dryRun = false 
    } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);
      
      const results = {};
      
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        
        try {
          let deletedCount = 0;
          
          switch (collection) {
            case 'products':
              if (dryRun) {
                deletedCount = await Product.countDocuments({
                  lastUpdated: { $lt: cutoffDate }
                });
              } else {
                const result = await Product.deleteMany({
                  lastUpdated: { $lt: cutoffDate }
                });
                deletedCount = result.deletedCount;
              }
              break;
              
            // Add more collections as needed
            default:
              logger.warn(`Unknown collection for cleanup: ${collection}`);
          }
          
          results[collection] = {
            success: true,
            deletedCount,
            dryRun,
          };
          
        } catch (error) {
          logger.error(`Failed to cleanup collection ${collection}:`, error);
          results[collection] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / collections.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      const totalDeleted = Object.values(results)
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.deletedCount, 0);
      
      return {
        success: true,
        type: 'old-data-cleanup',
        cutoffDate: cutoffDate.toISOString(),
        totalDeleted,
        results,
        dryRun,
      };
      
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * Cleanup temporary files
   */
  async cleanupTempFiles(job) {
    const { 
      directories = ['./temp', './uploads/temp'], 
      olderThan = 1, // days
      extensions = ['.tmp', '.temp', '.log']
    } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const cutoffTime = Date.now() - (olderThan * 24 * 60 * 60 * 1000);
      const results = {};
      
      for (let i = 0; i < directories.length; i++) {
        const directory = directories[i];
        
        try {
          const cleanupResult = await this.cleanupDirectory(directory, cutoffTime, extensions);
          results[directory] = cleanupResult;
          
        } catch (error) {
          logger.error(`Failed to cleanup directory ${directory}:`, error);
          results[directory] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / directories.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      const totalDeleted = Object.values(results)
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.deletedCount, 0);
      
      return {
        success: true,
        type: 'temp-files-cleanup',
        totalDeleted,
        results,
      };
      
    } catch (error) {
      logger.error('Failed to cleanup temp files:', error);
      throw error;
    }
  }

  /**
   * Cleanup log files
   */
  async cleanupLogs(job) {
    const { 
      logDirectory = './logs', 
      olderThan = 7, // days
      keepCount = 10 // keep last N files
    } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const files = await fs.readdir(logDirectory);
      const logFiles = files.filter(file => file.endsWith('.log'));
      
      // Sort by modification time
      const fileStats = await Promise.all(
        logFiles.map(async file => {
          const filePath = path.join(logDirectory, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      const cutoffTime = Date.now() - (olderThan * 24 * 60 * 60 * 1000);
      const filesToDelete = fileStats
        .slice(keepCount) // Keep last N files
        .filter(file => file.mtime.getTime() < cutoffTime);
      
      let deletedCount = 0;
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          deletedCount++;
          logger.debug(`Deleted log file: ${file.file}`);
        } catch (error) {
          logger.error(`Failed to delete log file ${file.file}:`, error);
        }
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'logs-cleanup',
        totalFiles: logFiles.length,
        deletedCount,
        keptCount: logFiles.length - deletedCount,
      };
      
    } catch (error) {
      logger.error('Failed to cleanup logs:', error);
      throw error;
    }
  }

  /**
   * Cleanup Redis cache
   */
  async cleanupCache(job) {
    const { 
      patterns = ['cache:*', 'temp:*'], 
      olderThan = 1 // hours
    } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const cutoffTime = Date.now() - (olderThan * 60 * 60 * 1000);
      const results = {};
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        
        try {
          const keys = await this.redisConnection.keys(pattern);
          let deletedCount = 0;
          
          for (const key of keys) {
            const ttl = await this.redisConnection.ttl(key);
            
            // If key has no TTL or is expired, delete it
            if (ttl === -1 || ttl === -2) {
              await this.redisConnection.del(key);
              deletedCount++;
            }
          }
          
          results[pattern] = {
            success: true,
            totalKeys: keys.length,
            deletedCount,
          };
          
        } catch (error) {
          logger.error(`Failed to cleanup cache pattern ${pattern}:`, error);
          results[pattern] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / patterns.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      const totalDeleted = Object.values(results)
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.deletedCount, 0);
      
      return {
        success: true,
        type: 'cache-cleanup',
        totalDeleted,
        results,
      };
      
    } catch (error) {
      logger.error('Failed to cleanup cache:', error);
      throw error;
    }
  }

  /**
   * Cleanup failed jobs from queues
   */
  async cleanupFailedJobs(job) {
    const { 
      queueNames = Object.values(config.queue.queues),
      olderThan = 7 // days
    } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const { Queue } = require('bullmq');
      const cutoffTime = Date.now() - (olderThan * 24 * 60 * 60 * 1000);
      const results = {};
      
      for (let i = 0; i < queueNames.length; i++) {
        const queueName = queueNames[i];
        
        try {
          const queue = new Queue(queueName, { connection: this.redisConnection });
          
          // Clean failed jobs older than cutoff time
          const cleanedCount = await queue.clean(cutoffTime, 0, 'failed');
          
          results[queueName] = {
            success: true,
            cleanedCount,
          };
          
        } catch (error) {
          logger.error(`Failed to cleanup failed jobs in queue ${queueName}:`, error);
          results[queueName] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / queueNames.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      const totalCleaned = Object.values(results)
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.cleanedCount, 0);
      
      return {
        success: true,
        type: 'failed-jobs-cleanup',
        totalCleaned,
        results,
      };
      
    } catch (error) {
      logger.error('Failed to cleanup failed jobs:', error);
      throw error;
    }
  }

  /**
   * Database maintenance
   */
  async databaseMaintenance(job) {
    const { operations = ['reindex', 'compact'] } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const mongoose = require('mongoose');
      const results = {};
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        try {
          switch (operation) {
            case 'reindex':
              await mongoose.connection.db.admin().command({ reIndex: 'products' });
              results[operation] = { success: true };
              break;
              
            case 'compact':
              await mongoose.connection.db.admin().command({ compact: 'products' });
              results[operation] = { success: true };
              break;
              
            default:
              results[operation] = { 
                success: false, 
                error: `Unknown operation: ${operation}` 
              };
          }
          
        } catch (error) {
          logger.error(`Database maintenance operation ${operation} failed:`, error);
          results[operation] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / operations.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'database-maintenance',
        results,
      };
      
    } catch (error) {
      logger.error('Failed to perform database maintenance:', error);
      throw error;
    }
  }

  /**
   * Elasticsearch maintenance
   */
  async elasticsearchMaintenance(job) {
    const { operations = ['optimize', 'cleanup'] } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const { searchService } = require('../services/searchService');
      const results = {};
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        try {
          switch (operation) {
            case 'optimize':
              await searchService.optimizeIndices();
              results[operation] = { success: true };
              break;
              
            case 'cleanup':
              await searchService.cleanupOldIndices();
              results[operation] = { success: true };
              break;
              
            default:
              results[operation] = { 
                success: false, 
                error: `Unknown operation: ${operation}` 
              };
          }
          
        } catch (error) {
          logger.error(`Elasticsearch maintenance operation ${operation} failed:`, error);
          results[operation] = {
            success: false,
            error: error.message,
          };
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / operations.length) * 80) + 10;
        await job.updateProgress(progress);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'elasticsearch-maintenance',
        results,
      };
      
    } catch (error) {
      logger.error('Failed to perform Elasticsearch maintenance:', error);
      throw error;
    }
  }

  /**
   * Cleanup directory
   */
  async cleanupDirectory(directory, cutoffTime, extensions) {
    try {
      const files = await fs.readdir(directory);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const fileExtension = path.extname(file);
          const isOldFile = stats.mtime.getTime() < cutoffTime;
          const hasTargetExtension = extensions.length === 0 || extensions.includes(fileExtension);
          
          if (isOldFile && hasTargetExtension) {
            try {
              await fs.unlink(filePath);
              deletedCount++;
              logger.debug(`Deleted temp file: ${file}`);
            } catch (error) {
              logger.error(`Failed to delete file ${file}:`, error);
            }
          }
        }
      }
      
      return {
        success: true,
        deletedCount,
      };
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          success: true,
          deletedCount: 0,
          message: 'Directory does not exist',
        };
      }
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.worker.on('completed', (job, result) => {
      logger.debug(`Cleanup job ${job.id} completed with result:`, result);
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error(`Cleanup job ${job.id} failed:`, err);
    });
    
    this.worker.on('error', (err) => {
      logger.error('Cleanup worker error:', err);
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn(`Cleanup job ${jobId} stalled`);
    });
    
    this.worker.on('progress', (job, progress) => {
      logger.debug(`Cleanup job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Get worker ID
   */
  getWorkerId() {
    return `cleanup-worker-${process.pid}-${Date.now()}`;
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
      logger.info('Stopping CleanupWorker...');
      
      if (this.worker) {
        await this.worker.close();
      }
      
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
      
      this.isRunning = false;
      logger.info('CleanupWorker stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping CleanupWorker:', error);
      throw error;
    }
  }

  /**
   * Force stop the worker
   */
  async forceStop() {
    try {
      logger.warn('Force stopping CleanupWorker...');
      
      if (this.worker) {
        await this.worker.close(true);
      }
      
      if (this.redisConnection) {
        this.redisConnection.disconnect();
      }
      
      this.isRunning = false;
      logger.warn('CleanupWorker force stopped');
      
    } catch (error) {
      logger.error('Error force stopping CleanupWorker:', error);
      throw error;
    }
  }
}

module.exports = CleanupWorker;
