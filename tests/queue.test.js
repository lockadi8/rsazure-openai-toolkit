const QueueManager = require('../src/services/queue/QueueManager');
const SchedulerService = require('../src/services/scheduler/SchedulerService');
const config = require('../config');

describe('Queue System Tests', () => {
  let queueManager;
  let scheduler;

  beforeAll(async () => {
    // Initialize queue manager for testing
    queueManager = new QueueManager({
      // Use test-specific configuration
      removeOnComplete: 5,
      removeOnFail: 5,
    });
    await queueManager.initialize();
  });

  afterAll(async () => {
    // Cleanup
    if (scheduler) {
      await scheduler.stop();
    }
    if (queueManager) {
      await queueManager.shutdown();
    }
  });

  describe('QueueManager', () => {
    test('should initialize successfully', () => {
      expect(queueManager.isInitialized).toBe(true);
    });

    test('should create queues', () => {
      const queueNames = Object.values(config.queue.queues);
      for (const queueName of queueNames) {
        const queue = queueManager.getQueue(queueName);
        expect(queue).toBeDefined();
      }
    });

    test('should add job to queue', async () => {
      const job = await queueManager.addJob(
        config.queue.queues.scraping,
        'product-scraping',
        {
          url: 'https://shopee.co.id/test-product/123',
          accountId: 'test-user',
        },
        {
          priority: config.queue.priorities.normal,
        }
      );

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.name).toBe('product-scraping');
    });

    test('should add bulk jobs', async () => {
      const bulkJobs = [
        {
          name: 'product-scraping',
          data: { url: 'https://shopee.co.id/product/1' },
          priority: config.queue.priorities.normal,
        },
        {
          name: 'product-scraping',
          data: { url: 'https://shopee.co.id/product/2' },
          priority: config.queue.priorities.normal,
        },
      ];

      const addedJobs = await queueManager.addBulkJobs(config.queue.queues.scraping, bulkJobs);

      expect(addedJobs).toHaveLength(2);
      expect(addedJobs[0].id).toBeDefined();
    });

    test('should get queue statistics', async () => {
      const stats = await queueManager.getQueueStats(config.queue.queues.scraping);

      expect(stats).toBeDefined();
      expect(stats.name).toBe(config.queue.queues.scraping);
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    test('should get all queue statistics', async () => {
      const allStats = await queueManager.getAllQueueStats();

      expect(allStats).toBeDefined();
      expect(allStats.queues).toBeDefined();
      expect(allStats.global).toBeDefined();
      expect(allStats.autoScaling).toBeDefined();
    });

    test('should pause and resume queue', async () => {
      const queueName = config.queue.queues.scraping;

      // Pause queue
      await queueManager.pauseQueue(queueName);

      // Resume queue
      await queueManager.resumeQueue(queueName);

      // Should not throw errors
      expect(true).toBe(true);
    });

    test('should clean queue', async () => {
      const queueName = config.queue.queues.scraping;

      await queueManager.cleanQueue(queueName, {
        completed: true,
        failed: true,
        count: 10,
      });

      // Should not throw errors
      expect(true).toBe(true);
    });

    test('should get health status', () => {
      const health = queueManager.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.uptime).toBeDefined();
      expect(health.queues).toBeDefined();
      expect(health.stats).toBeDefined();
    });

    test('should handle job with custom retry strategy', async () => {
      const job = await queueManager.addJob(
        config.queue.queues.scraping,
        'product-scraping',
        {
          url: 'https://shopee.co.id/retry-test/123',
          accountId: 'test-user',
        },
        {
          attempts: 5,
          retryStrategy: 'exponential',
          backoff: {
            type: 'exponential',
            delay: 1000,
            factor: 2,
            maxDelay: 10000,
          },
        }
      );

      expect(job).toBeDefined();
      expect(job.opts.attempts).toBe(5);
    });

    test('should handle delayed job', async () => {
      const job = await queueManager.addJob(
        config.queue.queues.scraping,
        'product-scraping',
        {
          url: 'https://shopee.co.id/delayed-test/123',
          accountId: 'test-user',
        },
        {
          delay: 5000, // 5 seconds delay
          priority: config.queue.priorities.high,
        }
      );

      expect(job).toBeDefined();
      expect(job.opts.delay).toBe(5000);
    });
  });

  describe('SchedulerService', () => {
    beforeAll(async () => {
      scheduler = new SchedulerService();
      await scheduler.initialize(queueManager);
    });

    test('should initialize successfully', () => {
      expect(scheduler.isRunning).toBe(true);
    });

    test('should add schedule', async () => {
      await scheduler.addSchedule({
        name: 'test-schedule',
        schedule: '0 * * * *', // Every hour
        jobName: 'cleanup-temp-files',
        queueName: config.queue.queues.cleanup,
        jobData: {
          directories: ['./temp'],
          olderThan: 1,
        },
        enabled: true,
      });

      const schedules = scheduler.getAllSchedules();
      expect(schedules['test-schedule']).toBeDefined();
    });

    test('should add dynamic schedule', async () => {
      await scheduler.addDynamicSchedule(
        'test-dynamic-schedule',
        {
          type: 'queue_size',
          queueName: config.queue.queues.scraping,
          operator: '>',
          threshold: 100,
        },
        {
          jobName: 'send-email',
          queueName: config.queue.queues.notifications,
          jobData: {
            to: 'test@example.com',
            subject: 'Test Alert',
          },
        }
      );

      const dynamicSchedules = scheduler.getAllDynamicSchedules();
      expect(dynamicSchedules['test-dynamic-schedule']).toBeDefined();
    });

    test('should disable and enable schedule', async () => {
      await scheduler.disableSchedule('test-schedule');
      await scheduler.enableSchedule('test-schedule');

      // Should not throw errors
      expect(true).toBe(true);
    });

    test('should get scheduler statistics', () => {
      const stats = scheduler.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalSchedules).toBe('number');
      expect(typeof stats.activeSchedules).toBe('number');
      expect(typeof stats.executedJobs).toBe('number');
      expect(stats.isRunning).toBe(true);
    });

    test('should remove schedule', async () => {
      await scheduler.removeSchedule('test-schedule');

      const schedules = scheduler.getAllSchedules();
      expect(schedules['test-schedule']).toBeUndefined();
    });

    test('should remove dynamic schedule', async () => {
      await scheduler.removeDynamicSchedule('test-dynamic-schedule');

      const dynamicSchedules = scheduler.getAllDynamicSchedules();
      expect(dynamicSchedules['test-dynamic-schedule']).toBeUndefined();
    });
  });

  describe('Job Processing', () => {
    test('should handle different job types', async () => {
      const jobTypes = [
        {
          queueName: config.queue.queues.scraping,
          jobName: 'product-scraping',
          jobData: { url: 'https://shopee.co.id/test/123' },
        },
        {
          queueName: config.queue.queues.dataProcessing,
          jobName: 'save-product-data',
          jobData: { productData: [{ id: 'test', name: 'Test Product' }] },
        },
        {
          queueName: config.queue.queues.notifications,
          jobName: 'send-email',
          jobData: { to: 'test@example.com', subject: 'Test' },
        },
        {
          queueName: config.queue.queues.cleanup,
          jobName: 'cleanup-temp-files',
          jobData: { directories: ['./temp'] },
        },
      ];

      for (const jobType of jobTypes) {
        const job = await queueManager.addJob(jobType.queueName, jobType.jobName, jobType.jobData);

        expect(job).toBeDefined();
        expect(job.name).toBe(jobType.jobName);
      }
    });

    test('should handle job priorities correctly', async () => {
      const priorities = [
        config.queue.priorities.critical,
        config.queue.priorities.high,
        config.queue.priorities.normal,
        config.queue.priorities.low,
        config.queue.priorities.background,
      ];

      for (const priority of priorities) {
        const job = await queueManager.addJob(
          config.queue.queues.scraping,
          'product-scraping',
          { url: `https://shopee.co.id/priority-test/${priority}` },
          { priority }
        );

        expect(job.opts.priority).toBe(priority);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid queue name', async () => {
      await expect(queueManager.addJob('invalid-queue', 'test-job', {})).rejects.toThrow(
        "Queue 'invalid-queue' not found"
      );
    });

    test('should handle invalid schedule', async () => {
      await expect(
        scheduler.addSchedule({
          name: 'invalid-schedule',
          schedule: 'invalid-cron',
          jobName: 'test-job',
          queueName: config.queue.queues.scraping,
          jobData: {},
        })
      ).rejects.toThrow('Invalid cron expression');
    });

    test('should handle non-existent job operations', async () => {
      await expect(queueManager.retryJob(config.queue.queues.scraping, 'non-existent-job')).rejects.toThrow();
    });

    test('should handle non-existent schedule operations', async () => {
      await expect(scheduler.removeSchedule('non-existent-schedule')).rejects.toThrow(
        "Schedule 'non-existent-schedule' not found"
      );
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent job additions', async () => {
      const jobPromises = [];

      for (let i = 0; i < 50; i++) {
        jobPromises.push(
          queueManager.addJob(config.queue.queues.scraping, 'product-scraping', {
            url: `https://shopee.co.id/concurrent-test/${i}`,
          })
        );
      }

      const jobs = await Promise.all(jobPromises);
      expect(jobs).toHaveLength(50);

      // All jobs should have unique IDs
      const jobIds = jobs.map(job => job.id);
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(50);
    });

    test('should handle bulk job addition efficiently', async () => {
      const bulkJobs = Array.from({ length: 100 }, (_, i) => ({
        name: 'product-scraping',
        data: { url: `https://shopee.co.id/bulk-test/${i}` },
        priority: config.queue.priorities.normal,
      }));

      const startTime = Date.now();
      const addedJobs = await queueManager.addBulkJobs(config.queue.queues.scraping, bulkJobs);
      const endTime = Date.now();

      expect(addedJobs).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
