#!/usr/bin/env node

const { Command } = require('commander');
const config = require('../config');
const logger = require('../utils/logger');
const QueueManager = require('../services/queue/QueueManager');
const QueueDashboard = require('../services/queue/QueueDashboard');
const SchedulerService = require('../services/scheduler/SchedulerService');
const WorkerManager = require('../workers');

/**
 * Queue System Starter
 * Script untuk menjalankan sistem queue lengkap
 */
class QueueSystemStarter {
  constructor() {
    this.queueManager = null;
    this.dashboard = null;
    this.scheduler = null;
    this.workerManager = null;
    this.isRunning = false;
  }

  /**
   * Start complete queue system
   */
  async startComplete() {
    try {
      logger.info('🚀 Starting complete queue system...');
      
      // 1. Initialize Queue Manager
      logger.info('📋 Initializing Queue Manager...');
      this.queueManager = new QueueManager();
      await this.queueManager.initialize();
      
      // 2. Start Workers
      logger.info('👷 Starting Workers...');
      this.workerManager = new WorkerManager();
      await this.workerManager.initialize();
      
      // 3. Start Scheduler
      logger.info('⏰ Starting Scheduler Service...');
      this.scheduler = new SchedulerService();
      await this.scheduler.initialize(this.queueManager);
      
      // 4. Start Dashboard
      if (config.queue.dashboard.enabled) {
        logger.info('📊 Starting Queue Dashboard...');
        this.dashboard = new QueueDashboard();
        await this.dashboard.start(this.queueManager);
      }
      
      this.isRunning = true;
      
      // Setup monitoring
      this.setupMonitoring();
      
      logger.info('✅ Queue system started successfully!');
      this.printSystemInfo();
      
    } catch (error) {
      logger.error('❌ Failed to start queue system:', error);
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Start only queue manager
   */
  async startQueueOnly() {
    try {
      logger.info('📋 Starting Queue Manager only...');
      
      this.queueManager = new QueueManager();
      await this.queueManager.initialize();
      
      this.isRunning = true;
      logger.info('✅ Queue Manager started successfully!');
      
    } catch (error) {
      logger.error('❌ Failed to start Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Start only workers
   */
  async startWorkersOnly() {
    try {
      logger.info('👷 Starting Workers only...');
      
      this.workerManager = new WorkerManager();
      await this.workerManager.initialize();
      
      this.isRunning = true;
      logger.info('✅ Workers started successfully!');
      
    } catch (error) {
      logger.error('❌ Failed to start Workers:', error);
      throw error;
    }
  }

  /**
   * Start only dashboard
   */
  async startDashboardOnly() {
    try {
      logger.info('📊 Starting Dashboard only...');
      
      // Initialize queue manager for dashboard
      this.queueManager = new QueueManager();
      await this.queueManager.initialize();
      
      this.dashboard = new QueueDashboard();
      await this.dashboard.start(this.queueManager);
      
      this.isRunning = true;
      logger.info('✅ Dashboard started successfully!');
      
    } catch (error) {
      logger.error('❌ Failed to start Dashboard:', error);
      throw error;
    }
  }

  /**
   * Start only scheduler
   */
  async startSchedulerOnly() {
    try {
      logger.info('⏰ Starting Scheduler only...');
      
      // Initialize queue manager for scheduler
      this.queueManager = new QueueManager();
      await this.queueManager.initialize();
      
      this.scheduler = new SchedulerService();
      await this.scheduler.initialize(this.queueManager);
      
      this.isRunning = true;
      logger.info('✅ Scheduler started successfully!');
      
    } catch (error) {
      logger.error('❌ Failed to start Scheduler:', error);
      throw error;
    }
  }

  /**
   * Setup monitoring
   */
  setupMonitoring() {
    // Monitor queue manager health
    if (this.queueManager) {
      this.queueManager.on('health:check', (health) => {
        if (health.status !== 'healthy') {
          logger.warn('Queue Manager health check failed:', health);
        }
      });
    }
    
    // Monitor scheduler
    if (this.scheduler) {
      this.scheduler.on('job:failed', (data) => {
        logger.error(`Scheduled job failed: ${data.scheduleName} - ${data.error}`);
      });
    }
    
    // Log system stats every 5 minutes
    setInterval(() => {
      this.logSystemStats();
    }, 5 * 60 * 1000);
  }

  /**
   * Log system statistics
   */
  async logSystemStats() {
    try {
      const stats = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
      
      if (this.queueManager) {
        stats.queues = await this.queueManager.getAllQueueStats();
      }
      
      if (this.workerManager) {
        stats.workers = this.workerManager.getWorkerStats();
      }
      
      if (this.scheduler) {
        stats.scheduler = this.scheduler.getStatistics();
      }
      
      logger.info('📊 System Stats:', JSON.stringify(stats, null, 2));
      
    } catch (error) {
      logger.error('Failed to log system stats:', error);
    }
  }

  /**
   * Print system information
   */
  printSystemInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 QUEUE SYSTEM STARTED SUCCESSFULLY');
    console.log('='.repeat(60));
    
    if (this.queueManager) {
      console.log('📋 Queue Manager: ✅ Running');
      console.log(`   Queues: ${Object.keys(config.queue.queues).join(', ')}`);
    }
    
    if (this.workerManager) {
      console.log('👷 Workers: ✅ Running');
      const stats = this.workerManager.getWorkerStats();
      console.log(`   Total Workers: ${stats.total}`);
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} workers`);
      });
    }
    
    if (this.scheduler) {
      console.log('⏰ Scheduler: ✅ Running');
      const stats = this.scheduler.getStatistics();
      console.log(`   Active Schedules: ${stats.activeSchedules}`);
      console.log(`   Dynamic Schedules: ${stats.dynamicSchedules}`);
    }
    
    if (this.dashboard) {
      console.log('📊 Dashboard: ✅ Running');
      console.log(`   URL: http://localhost:${config.queue.dashboard.port}`);
      console.log(`   Username: ${config.queue.dashboard.username}`);
      console.log(`   Password: ${config.queue.dashboard.password}`);
    }
    
    console.log('\n💡 Useful Commands:');
    console.log('   View logs: tail -f logs/combined.log');
    console.log('   Stop system: Ctrl+C');
    console.log('   Health check: curl http://localhost:3000/health');
    
    if (this.dashboard) {
      console.log(`   Dashboard: http://localhost:${config.queue.dashboard.port}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Shutdown system
   */
  async shutdown() {
    try {
      logger.info('🛑 Shutting down queue system...');
      
      // Stop dashboard
      if (this.dashboard) {
        await this.dashboard.stop();
        logger.info('📊 Dashboard stopped');
      }
      
      // Stop scheduler
      if (this.scheduler) {
        await this.scheduler.stop();
        logger.info('⏰ Scheduler stopped');
      }
      
      // Stop workers
      if (this.workerManager) {
        await this.workerManager.shutdown();
        logger.info('👷 Workers stopped');
      }
      
      // Stop queue manager
      if (this.queueManager) {
        await this.queueManager.shutdown();
        logger.info('📋 Queue Manager stopped');
      }
      
      this.isRunning = false;
      logger.info('✅ Queue system shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
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
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// CLI Setup
const program = new Command();

program
  .name('queue-system')
  .description('Shopee Scraper Queue System')
  .version('1.0.0');

program
  .command('start')
  .description('Start complete queue system')
  .action(async () => {
    const starter = new QueueSystemStarter();
    starter.setupGracefulShutdown();
    await starter.startComplete();
  });

program
  .command('queue')
  .description('Start only queue manager')
  .action(async () => {
    const starter = new QueueSystemStarter();
    starter.setupGracefulShutdown();
    await starter.startQueueOnly();
  });

program
  .command('workers')
  .description('Start only workers')
  .action(async () => {
    const starter = new QueueSystemStarter();
    starter.setupGracefulShutdown();
    await starter.startWorkersOnly();
  });

program
  .command('dashboard')
  .description('Start only dashboard')
  .action(async () => {
    const starter = new QueueSystemStarter();
    starter.setupGracefulShutdown();
    await starter.startDashboardOnly();
  });

program
  .command('scheduler')
  .description('Start only scheduler')
  .action(async () => {
    const starter = new QueueSystemStarter();
    starter.setupGracefulShutdown();
    await starter.startSchedulerOnly();
  });

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help();
}

// Parse command line arguments
program.parse();

module.exports = QueueSystemStarter;
