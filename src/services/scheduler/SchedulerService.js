const cron = require('node-cron');
const config = require('../../../config');
const logger = require('../../utils/logger');
const QueueManager = require('../queue/QueueManager');
const EventEmitter = require('events');

/**
 * Scheduler Service
 * Mengelola cron-based scheduling dan dynamic scheduling untuk jobs
 */
class SchedulerService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      timezone: options.timezone || 'Asia/Jakarta',
      ...options,
    };

    this.queueManager = null;
    this.scheduledTasks = new Map();
    this.dynamicSchedules = new Map();
    this.isRunning = false;

    // Statistics
    this.stats = {
      totalSchedules: 0,
      activeSchedules: 0,
      executedJobs: 0,
      failedJobs: 0,
      startTime: new Date(),
    };

    // Default schedules
    this.defaultSchedules = [
      {
        name: 'daily-cleanup',
        schedule: '0 2 * * *', // 2 AM daily
        jobName: 'cleanup-old-data',
        queueName: config.queue.queues.cleanup,
        jobData: {
          collections: ['products'],
          olderThan: 30,
        },
        enabled: true,
      },
      {
        name: 'hourly-cache-cleanup',
        schedule: '0 * * * *', // Every hour
        jobName: 'cleanup-cache',
        queueName: config.queue.queues.cleanup,
        jobData: {
          patterns: ['cache:*', 'temp:*'],
          olderThan: 1,
        },
        enabled: true,
      },
      {
        name: 'weekly-database-maintenance',
        schedule: '0 3 * * 0', // 3 AM every Sunday
        jobName: 'database-maintenance',
        queueName: config.queue.queues.cleanup,
        jobData: {
          operations: ['reindex', 'compact'],
        },
        enabled: true,
      },
      {
        name: 'daily-elasticsearch-sync',
        schedule: '0 1 * * *', // 1 AM daily
        jobName: 'sync-database',
        queueName: config.queue.queues.dataProcessing,
        jobData: {
          syncType: 'elasticsearch',
        },
        enabled: true,
      },
    ];
  }

  /**
   * Initialize scheduler service
   */
  async initialize(queueManager) {
    try {
      logger.info('Initializing SchedulerService...');

      this.queueManager = queueManager;

      // Setup default schedules
      await this.setupDefaultSchedules();

      // Start monitoring
      this.startMonitoring();

      this.isRunning = true;
      logger.info('SchedulerService initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize SchedulerService:', error);
      throw error;
    }
  }

  /**
   * Setup default schedules
   */
  async setupDefaultSchedules() {
    for (const schedule of this.defaultSchedules) {
      if (schedule.enabled) {
        await this.addSchedule(schedule);
      }
    }

    logger.info(`Setup ${this.defaultSchedules.filter(s => s.enabled).length} default schedules`);
  }

  /**
   * Add a new schedule
   */
  async addSchedule(scheduleConfig) {
    try {
      const { name, schedule, jobName, queueName, jobData, options = {}, enabled = true } = scheduleConfig;

      if (!enabled) {
        logger.debug(`Schedule '${name}' is disabled, skipping`);
        return;
      }

      // Validate cron expression
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron expression: ${schedule}`);
      }

      // Create scheduled task
      const task = cron.schedule(
        schedule,
        async () => {
          await this.executeScheduledJob(name, jobName, queueName, jobData, options);
        },
        {
          scheduled: false,
          timezone: this.options.timezone,
        }
      );

      // Store task
      this.scheduledTasks.set(name, {
        task,
        config: scheduleConfig,
        lastExecution: null,
        nextExecution: this.getNextExecution(schedule),
        executionCount: 0,
        failureCount: 0,
      });

      // Start the task
      task.start();

      this.stats.totalSchedules++;
      this.stats.activeSchedules++;

      logger.info(`Added schedule '${name}': ${schedule}`);
      this.emit('schedule:added', { name, schedule });
    } catch (error) {
      logger.error(`Failed to add schedule '${scheduleConfig.name}':`, error);
      throw error;
    }
  }

  /**
   * Remove a schedule
   */
  async removeSchedule(name) {
    try {
      const scheduledTask = this.scheduledTasks.get(name);
      if (!scheduledTask) {
        throw new Error(`Schedule '${name}' not found`);
      }

      // Stop and destroy the task
      scheduledTask.task.stop();
      scheduledTask.task.destroy();

      // Remove from map
      this.scheduledTasks.delete(name);

      this.stats.activeSchedules--;

      logger.info(`Removed schedule '${name}'`);
      this.emit('schedule:removed', { name });
    } catch (error) {
      logger.error(`Failed to remove schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Update a schedule
   */
  async updateSchedule(name, newConfig) {
    try {
      // Remove existing schedule
      await this.removeSchedule(name);

      // Add updated schedule
      await this.addSchedule({ name, ...newConfig });

      logger.info(`Updated schedule '${name}'`);
      this.emit('schedule:updated', { name, config: newConfig });
    } catch (error) {
      logger.error(`Failed to update schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Enable a schedule
   */
  async enableSchedule(name) {
    try {
      const scheduledTask = this.scheduledTasks.get(name);
      if (!scheduledTask) {
        throw new Error(`Schedule '${name}' not found`);
      }

      scheduledTask.task.start();
      scheduledTask.config.enabled = true;

      logger.info(`Enabled schedule '${name}'`);
      this.emit('schedule:enabled', { name });
    } catch (error) {
      logger.error(`Failed to enable schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Disable a schedule
   */
  async disableSchedule(name) {
    try {
      const scheduledTask = this.scheduledTasks.get(name);
      if (!scheduledTask) {
        throw new Error(`Schedule '${name}' not found`);
      }

      scheduledTask.task.stop();
      scheduledTask.config.enabled = false;

      logger.info(`Disabled schedule '${name}'`);
      this.emit('schedule:disabled', { name });
    } catch (error) {
      logger.error(`Failed to disable schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Execute scheduled job
   */
  async executeScheduledJob(scheduleName, jobName, queueName, jobData, options) {
    try {
      logger.info(`Executing scheduled job '${scheduleName}': ${jobName}`);

      const scheduledTask = this.scheduledTasks.get(scheduleName);
      if (scheduledTask) {
        scheduledTask.lastExecution = new Date();
        scheduledTask.executionCount++;
        scheduledTask.nextExecution = this.getNextExecution(scheduledTask.config.schedule);
      }

      // Add job to queue
      const job = await this.queueManager.addJob(
        queueName,
        jobName,
        {
          ...jobData,
          scheduleName,
          scheduledAt: new Date().toISOString(),
        },
        {
          priority: config.queue.priorities.normal,
          ...options,
        }
      );

      this.stats.executedJobs++;

      logger.info(`Scheduled job '${scheduleName}' added to queue with ID: ${job.id}`);
      this.emit('job:scheduled', { scheduleName, jobName, jobId: job.id });
    } catch (error) {
      logger.error(`Failed to execute scheduled job '${scheduleName}':`, error);

      const scheduledTask = this.scheduledTasks.get(scheduleName);
      if (scheduledTask) {
        scheduledTask.failureCount++;
      }

      this.stats.failedJobs++;
      this.emit('job:failed', { scheduleName, jobName, error: error.message });
    }
  }

  /**
   * Add dynamic schedule based on conditions
   */
  async addDynamicSchedule(name, condition, jobConfig) {
    try {
      const dynamicSchedule = {
        name,
        condition,
        jobConfig,
        lastCheck: null,
        lastExecution: null,
        executionCount: 0,
        enabled: true,
      };

      this.dynamicSchedules.set(name, dynamicSchedule);

      logger.info(`Added dynamic schedule '${name}'`);
      this.emit('dynamic:added', { name, condition });
    } catch (error) {
      logger.error(`Failed to add dynamic schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Remove dynamic schedule
   */
  async removeDynamicSchedule(name) {
    try {
      this.dynamicSchedules.delete(name);

      logger.info(`Removed dynamic schedule '${name}'`);
      this.emit('dynamic:removed', { name });
    } catch (error) {
      logger.error(`Failed to remove dynamic schedule '${name}':`, error);
      throw error;
    }
  }

  /**
   * Check dynamic schedules
   */
  async checkDynamicSchedules() {
    for (const [name, schedule] of this.dynamicSchedules) {
      if (!schedule.enabled) continue;

      try {
        schedule.lastCheck = new Date();

        const shouldExecute = await this.evaluateCondition(schedule.condition);

        if (shouldExecute) {
          await this.executeDynamicJob(name, schedule);
        }
      } catch (error) {
        logger.error(`Failed to check dynamic schedule '${name}':`, error);
      }
    }
  }

  /**
   * Execute dynamic job
   */
  async executeDynamicJob(name, schedule) {
    try {
      const { jobConfig } = schedule;

      logger.info(`Executing dynamic job '${name}': ${jobConfig.jobName}`);

      const job = await this.queueManager.addJob(
        jobConfig.queueName,
        jobConfig.jobName,
        {
          ...jobConfig.jobData,
          dynamicScheduleName: name,
          triggeredAt: new Date().toISOString(),
        },
        jobConfig.options || {}
      );

      schedule.lastExecution = new Date();
      schedule.executionCount++;

      logger.info(`Dynamic job '${name}' added to queue with ID: ${job.id}`);
      this.emit('dynamic:executed', { name, jobId: job.id });
    } catch (error) {
      logger.error(`Failed to execute dynamic job '${name}':`, error);
      this.emit('dynamic:failed', { name, error: error.message });
    }
  }

  /**
   * Evaluate condition for dynamic scheduling
   */
  async evaluateCondition(condition) {
    try {
      switch (condition.type) {
        case 'queue_size':
          return await this.checkQueueSizeCondition(condition);

        case 'time_based':
          return this.checkTimeBasedCondition(condition);

        case 'data_threshold':
          return await this.checkDataThresholdCondition(condition);

        case 'custom':
          return await this.checkCustomCondition(condition);

        default:
          logger.warn(`Unknown condition type: ${condition.type}`);
          return false;
      }
    } catch (error) {
      logger.error('Failed to evaluate condition:', error);
      return false;
    }
  }

  /**
   * Check queue size condition
   */
  async checkQueueSizeCondition(condition) {
    const { queueName, operator, threshold } = condition;

    const queueStats = await this.queueManager.getQueueStats(queueName);
    const queueSize = queueStats.total;

    switch (operator) {
      case '>':
        return queueSize > threshold;
      case '<':
        return queueSize < threshold;
      case '>=':
        return queueSize >= threshold;
      case '<=':
        return queueSize <= threshold;
      case '==':
        return queueSize === threshold;
      default:
        return false;
    }
  }

  /**
   * Check time-based condition
   */
  checkTimeBasedCondition(condition) {
    const { timeRange, lastExecution } = condition;
    const now = new Date();
    const [startHour, endHour] = timeRange;

    const currentHour = now.getHours();
    const isInTimeRange = currentHour >= startHour && currentHour <= endHour;

    if (!isInTimeRange) return false;

    // Check if enough time has passed since last execution
    if (lastExecution) {
      const timeSinceLastExecution = now - new Date(lastExecution);
      const minInterval = condition.minInterval || 3600000; // 1 hour default

      return timeSinceLastExecution >= minInterval;
    }

    return true;
  }

  /**
   * Check data threshold condition
   */
  async checkDataThresholdCondition(condition) {
    // Implement data threshold checking logic
    // This is a placeholder - implement based on your specific needs
    return false;
  }

  /**
   * Check custom condition
   */
  async checkCustomCondition(condition) {
    // Implement custom condition evaluation
    // This is a placeholder - implement based on your specific needs
    return false;
  }

  /**
   * Get next execution time for cron expression
   */
  getNextExecution(cronExpression) {
    try {
      // This is a simplified implementation
      // In production, use a proper cron parser like 'cron-parser'
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day as placeholder
    } catch (error) {
      logger.error('Failed to calculate next execution:', error);
      return null;
    }
  }

  /**
   * Start monitoring
   */
  startMonitoring() {
    // Check dynamic schedules every minute
    setInterval(async () => {
      await this.checkDynamicSchedules();
    }, 60000);

    // Update statistics every 5 minutes
    setInterval(() => {
      this.updateStatistics();
    }, 300000);
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    this.stats.activeSchedules = this.scheduledTasks.size;

    // Emit statistics update
    this.emit('stats:updated', this.getStatistics());
  }

  /**
   * Get all schedules
   */
  getAllSchedules() {
    const schedules = {};

    for (const [name, scheduledTask] of this.scheduledTasks) {
      schedules[name] = {
        ...scheduledTask.config,
        lastExecution: scheduledTask.lastExecution,
        nextExecution: scheduledTask.nextExecution,
        executionCount: scheduledTask.executionCount,
        failureCount: scheduledTask.failureCount,
        isRunning: scheduledTask.task.running,
      };
    }

    return schedules;
  }

  /**
   * Get all dynamic schedules
   */
  getAllDynamicSchedules() {
    return Object.fromEntries(this.dynamicSchedules);
  }

  /**
   * Get scheduler statistics
   */
  getStatistics() {
    const uptime = Date.now() - this.stats.startTime.getTime();

    return {
      ...this.stats,
      uptime,
      dynamicSchedules: this.dynamicSchedules.size,
      isRunning: this.isRunning,
    };
  }

  /**
   * Stop scheduler service
   */
  async stop() {
    try {
      logger.info('Stopping SchedulerService...');

      // Stop all scheduled tasks
      for (const [name, scheduledTask] of this.scheduledTasks) {
        scheduledTask.task.stop();
        scheduledTask.task.destroy();
      }

      this.scheduledTasks.clear();
      this.dynamicSchedules.clear();

      this.isRunning = false;
      logger.info('SchedulerService stopped successfully');

      this.emit('stopped');
    } catch (error) {
      logger.error('Error stopping SchedulerService:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService;
