#!/usr/bin/env node

const dataSyncService = require('../src/services/dataSyncService');
const elasticsearchService = require('../src/services/elasticsearch');
const database = require('../src/services/database');
const redisService = require('../src/services/redis');
const logger = require('../src/utils/logger');

class AutoSyncManager {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
  }

  async initialize() {
    try {
      logger.info('Initializing Auto Sync Manager...');
      
      // Initialize services
      await database.connect();
      await redisService.connect();
      await elasticsearchService.connect();
      
      logger.info('All services connected successfully');
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to initialize Auto Sync Manager:', error);
      throw error;
    }
  }

  async start(options = {}) {
    try {
      const {
        intervalMinutes = 30,
        fullSyncHour = 2, // 2 AM daily full sync
        enableFullSync = true,
        enableIncrementalSync = true
      } = options;

      if (this.isRunning) {
        logger.warn('Auto sync is already running');
        return;
      }

      this.isRunning = true;
      logger.info(`Starting auto sync with ${intervalMinutes} minute interval`);

      // Start incremental sync
      if (enableIncrementalSync) {
        this.startIncrementalSync(intervalMinutes);
      }

      // Schedule daily full sync
      if (enableFullSync) {
        this.scheduleDailyFullSync(fullSyncHour);
      }

      // Initial sync
      await this.performInitialSync();

      logger.info('Auto sync started successfully');

    } catch (error) {
      logger.error('Failed to start auto sync:', error);
      throw error;
    }
  }

  startIncrementalSync(intervalMinutes) {
    this.syncInterval = setInterval(async () => {
      try {
        if (!dataSyncService.getSyncStatus().syncInProgress) {
          logger.info('Starting scheduled incremental sync...');
          
          const result = await dataSyncService.incrementalSync();
          
          logger.info(`Incremental sync completed: ${result.synced} products synced, ${result.errors} errors`);
          
          // Validate sync integrity periodically
          if (Math.random() < 0.1) { // 10% chance
            const validation = await dataSyncService.validateSync();
            logger.info(`Sync validation: ${validation.syncAccuracy} accuracy`);
            
            if (!validation.isValid) {
              logger.warn('Sync validation failed, scheduling full sync');
              setTimeout(() => this.performFullSync(), 5000);
            }
          }
        }
      } catch (error) {
        logger.error('Incremental sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    logger.info(`Incremental sync scheduled every ${intervalMinutes} minutes`);
  }

  scheduleDailyFullSync(hour) {
    const scheduleNextFullSync = () => {
      const now = new Date();
      const nextSync = new Date();
      nextSync.setHours(hour, 0, 0, 0);
      
      // If the time has passed today, schedule for tomorrow
      if (nextSync <= now) {
        nextSync.setDate(nextSync.getDate() + 1);
      }
      
      const timeUntilSync = nextSync.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          logger.info('Starting scheduled daily full sync...');
          await this.performFullSync();
          
          // Schedule next full sync
          scheduleNextFullSync();
        } catch (error) {
          logger.error('Daily full sync failed:', error);
          
          // Retry in 1 hour
          setTimeout(() => scheduleNextFullSync(), 60 * 60 * 1000);
        }
      }, timeUntilSync);
      
      logger.info(`Next full sync scheduled for ${nextSync.toISOString()}`);
    };

    scheduleNextFullSync();
  }

  async performInitialSync() {
    try {
      logger.info('Performing initial sync check...');
      
      const validation = await dataSyncService.validateSync();
      logger.info(`Current sync status: ${validation.syncAccuracy} accuracy`);
      
      if (!validation.isValid || validation.esCount === 0) {
        logger.info('Initial full sync required');
        await this.performFullSync();
      } else {
        logger.info('Performing initial incremental sync');
        await dataSyncService.incrementalSync();
      }
      
    } catch (error) {
      logger.error('Initial sync failed:', error);
      throw error;
    }
  }

  async performFullSync() {
    try {
      logger.info('Starting full sync...');
      
      const startTime = Date.now();
      const result = await dataSyncService.fullSync();
      const duration = Date.now() - startTime;
      
      logger.info(`Full sync completed in ${duration}ms: ${result.totalSynced} products synced, ${result.errors} errors`);
      
      // Cleanup old data after full sync
      await this.performCleanup();
      
      return result;
    } catch (error) {
      logger.error('Full sync failed:', error);
      throw error;
    }
  }

  async performCleanup() {
    try {
      logger.info('Starting cleanup...');
      
      const result = await dataSyncService.cleanup(30); // Keep 30 days
      
      logger.info(`Cleanup completed: ${result.deleted} old records removed`);
      
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  async stop() {
    try {
      if (!this.isRunning) {
        logger.warn('Auto sync is not running');
        return;
      }

      this.isRunning = false;
      
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      dataSyncService.stopAutoSync();
      
      logger.info('Auto sync stopped');
      
    } catch (error) {
      logger.error('Failed to stop auto sync:', error);
    }
  }

  async getStatus() {
    try {
      const syncStatus = dataSyncService.getSyncStatus();
      const validation = await dataSyncService.validateSync();
      const esHealth = await elasticsearchService.ping();
      
      return {
        isRunning: this.isRunning,
        syncStatus,
        validation,
        elasticsearchHealthy: esHealth,
        uptime: process.uptime()
      };
    } catch (error) {
      logger.error('Failed to get status:', error);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Stopping auto sync...`);
      
      try {
        await this.stop();
        
        // Disconnect services
        await database.disconnect();
        await redisService.disconnect();
        await elasticsearchService.disconnect();
        
        logger.info('Auto sync manager shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new AutoSyncManager();

  const parseArgs = () => {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--interval':
          options.intervalMinutes = parseInt(args[++i]) || 30;
          break;
        case '--full-sync-hour':
          options.fullSyncHour = parseInt(args[++i]) || 2;
          break;
        case '--no-full-sync':
          options.enableFullSync = false;
          break;
        case '--no-incremental':
          options.enableIncrementalSync = false;
          break;
        case '--help':
          console.log(`
Auto Sync Manager for Elasticsearch

Usage: node start-auto-sync.js [options]

Options:
  --interval <minutes>      Incremental sync interval (default: 30)
  --full-sync-hour <hour>   Daily full sync hour (default: 2)
  --no-full-sync           Disable daily full sync
  --no-incremental         Disable incremental sync
  --help                   Show this help message

Examples:
  node start-auto-sync.js --interval 15 --full-sync-hour 3
  node start-auto-sync.js --no-full-sync
          `);
          process.exit(0);
          break;
      }
    }
    
    return options;
  };

  const main = async () => {
    try {
      const options = parseArgs();
      
      await manager.initialize();
      await manager.start(options);
      
      // Keep the process running
      process.on('SIGTERM', () => {});
      process.on('SIGINT', () => {});
      
    } catch (error) {
      logger.error('Auto sync manager failed:', error);
      process.exit(1);
    }
  };

  main();
}

module.exports = AutoSyncManager;
