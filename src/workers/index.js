const config = require('../config');
const logger = require('../utils/logger');
const QueueManager = require('../services/queue/QueueManager');
const ScrapingWorker = require('./ScrapingWorker');
const DataProcessingWorker = require('./DataProcessingWorker');
const NotificationWorker = require('./NotificationWorker');
const CleanupWorker = require('./CleanupWorker');

/**
 * Worker Manager
 * Mengelola semua workers untuk queue system
 */
class WorkerManager {
  constructor(options = {}) {
    this.options = {
      autoStart: options.autoStart !== false,
      ...options,
    };
    
    this.queueManager = null;
    this.workers = new Map();
    this.isRunning = false;
    
    // Worker configurations
    this.workerConfigs = [
      {
        name: 'scraping',
        class: ScrapingWorker,
        queueName: config.queue.queues.scraping,
        concurrency: config.queue.concurrency,
        instances: parseInt(process.env.SCRAPING_WORKERS, 10) || 2,
      },
      {
        name: 'dataProcessing',
        class: DataProcessingWorker,
        queueName: config.queue.queues.dataProcessing,
        concurrency: config.queue.concurrency,
        instances: parseInt(process.env.DATA_PROCESSING_WORKERS, 10) || 1,
      },
      {
        name: 'notifications',
        class: NotificationWorker,
        queueName: config.queue.queues.notifications,
        concurrency: config.queue.concurrency,
        instances: parseInt(process.env.NOTIFICATION_WORKERS, 10) || 1,
      },
      {
        name: 'cleanup',
        class: CleanupWorker,
        queueName: config.queue.queues.cleanup,
        concurrency: 1, // Cleanup should be single-threaded
        instances: 1,
      },
    ];
  }

  /**
   * Initialize worker manager
   */
  async initialize() {
    try {
      logger.info('Initializing WorkerManager...');
      
      // Initialize queue manager
      this.queueManager = new QueueManager();
      await this.queueManager.initialize();
      
      if (this.options.autoStart) {
        await this.startAllWorkers();
      }
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      this.isRunning = true;
      logger.info('WorkerManager initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize WorkerManager:', error);
      throw error;
    }
  }

  /**
   * Start all workers
   */
  async startAllWorkers() {
    try {
      logger.info('Starting all workers...');
      
      for (const workerConfig of this.workerConfigs) {
        await this.startWorkerType(workerConfig);
      }
      
      logger.info(`Started ${this.workers.size} workers`);
      
    } catch (error) {
      logger.error('Failed to start workers:', error);
      throw error;
    }
  }

  /**
   * Start workers of specific type
   */
  async startWorkerType(workerConfig) {
    try {
      const { name, class: WorkerClass, queueName, concurrency, instances } = workerConfig;
      
      logger.info(`Starting ${instances} ${name} worker(s)...`);
      
      for (let i = 0; i < instances; i++) {
        const workerId = `${name}-${i + 1}`;
        
        const worker = new WorkerClass({
          queueName,
          concurrency,
          workerId,
        });
        
        await worker.start();
        
        this.workers.set(workerId, {
          worker,
          type: name,
          config: workerConfig,
          startTime: new Date(),
        });
        
        logger.info(`Started worker: ${workerId}`);
      }
      
    } catch (error) {
      logger.error(`Failed to start ${workerConfig.name} workers:`, error);
      throw error;
    }
  }

  /**
   * Stop all workers
   */
  async stopAllWorkers() {
    try {
      logger.info('Stopping all workers...');
      
      const stopPromises = [];
      
      for (const [workerId, workerInfo] of this.workers) {
        stopPromises.push(this.stopWorker(workerId));
      }
      
      await Promise.all(stopPromises);
      
      this.workers.clear();
      logger.info('All workers stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping workers:', error);
      throw error;
    }
  }

  /**
   * Stop specific worker
   */
  async stopWorker(workerId) {
    try {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) {
        throw new Error(`Worker ${workerId} not found`);
      }
      
      await workerInfo.worker.stop();
      this.workers.delete(workerId);
      
      logger.info(`Stopped worker: ${workerId}`);
      
    } catch (error) {
      logger.error(`Failed to stop worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Restart worker
   */
  async restartWorker(workerId) {
    try {
      const workerInfo = this.workers.get(workerId);
      if (!workerInfo) {
        throw new Error(`Worker ${workerId} not found`);
      }
      
      const { config } = workerInfo;
      
      // Stop existing worker
      await this.stopWorker(workerId);
      
      // Start new worker
      const { class: WorkerClass, queueName, concurrency } = config;
      const worker = new WorkerClass({
        queueName,
        concurrency,
        workerId,
      });
      
      await worker.start();
      
      this.workers.set(workerId, {
        worker,
        type: config.name,
        config,
        startTime: new Date(),
      });
      
      logger.info(`Restarted worker: ${workerId}`);
      
    } catch (error) {
      logger.error(`Failed to restart worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Scale workers for specific type
   */
  async scaleWorkers(workerType, targetInstances) {
    try {
      const currentWorkers = Array.from(this.workers.entries())
        .filter(([_, info]) => info.type === workerType);
      
      const currentInstances = currentWorkers.length;
      
      if (targetInstances > currentInstances) {
        // Scale up
        const workerConfig = this.workerConfigs.find(c => c.name === workerType);
        if (!workerConfig) {
          throw new Error(`Unknown worker type: ${workerType}`);
        }
        
        const instancesToAdd = targetInstances - currentInstances;
        
        for (let i = 0; i < instancesToAdd; i++) {
          const workerId = `${workerType}-${currentInstances + i + 1}`;
          
          const { class: WorkerClass, queueName, concurrency } = workerConfig;
          const worker = new WorkerClass({
            queueName,
            concurrency,
            workerId,
          });
          
          await worker.start();
          
          this.workers.set(workerId, {
            worker,
            type: workerType,
            config: workerConfig,
            startTime: new Date(),
          });
          
          logger.info(`Scaled up worker: ${workerId}`);
        }
        
      } else if (targetInstances < currentInstances) {
        // Scale down
        const workersToRemove = currentWorkers.slice(targetInstances);
        
        for (const [workerId] of workersToRemove) {
          await this.stopWorker(workerId);
          logger.info(`Scaled down worker: ${workerId}`);
        }
      }
      
      logger.info(`Scaled ${workerType} workers: ${currentInstances} -> ${targetInstances}`);
      
    } catch (error) {
      logger.error(`Failed to scale ${workerType} workers:`, error);
      throw error;
    }
  }

  /**
   * Get worker statistics
   */
  getWorkerStats() {
    const stats = {
      total: this.workers.size,
      byType: {},
      workers: {},
    };
    
    for (const [workerId, workerInfo] of this.workers) {
      const { type, startTime } = workerInfo;
      
      // Count by type
      if (!stats.byType[type]) {
        stats.byType[type] = 0;
      }
      stats.byType[type]++;
      
      // Individual worker stats
      stats.workers[workerId] = {
        type,
        startTime,
        uptime: Date.now() - startTime.getTime(),
        stats: workerInfo.worker.getStats ? workerInfo.worker.getStats() : null,
      };
    }
    
    return stats;
  }

  /**
   * Get queue manager
   */
  getQueueManager() {
    return this.queueManager;
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');
      
      // Stop all workers
      await this.stopAllWorkers();
      
      // Stop queue manager
      if (this.queueManager) {
        await this.queueManager.shutdown();
      }
      
      this.isRunning = false;
      logger.info('Graceful shutdown completed');
      
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Emergency stop
   */
  async emergencyStop() {
    try {
      logger.warn('Emergency stop initiated...');
      
      // Force stop all workers
      const forceStopPromises = [];
      
      for (const [workerId, workerInfo] of this.workers) {
        if (workerInfo.worker.forceStop) {
          forceStopPromises.push(workerInfo.worker.forceStop());
        }
      }
      
      await Promise.allSettled(forceStopPromises);
      
      // Emergency stop queue manager
      if (this.queueManager) {
        await this.queueManager.emergencyStop();
      }
      
      this.isRunning = false;
      logger.warn('Emergency stop completed');
      
    } catch (error) {
      logger.error('Error during emergency stop:', error);
      throw error;
    }
  }
}

// If this file is run directly, start the worker manager
if (require.main === module) {
  const workerManager = new WorkerManager();
  
  workerManager.initialize().catch((error) => {
    logger.error('Failed to start worker manager:', error);
    process.exit(1);
  });
}

module.exports = WorkerManager;
