const QueueManager = require('../src/services/queue/QueueManager');
const SchedulerService = require('../src/services/scheduler/SchedulerService');
const config = require('../src/config');
const logger = require('../src/utils/logger');

/**
 * Contoh penggunaan Queue System dan Job Management
 */

async function demonstrateQueueSystem() {
  console.log('🚀 Queue System Demo Started\n');
  
  // 1. Initialize Queue Manager
  console.log('1️⃣ Initializing Queue Manager...');
  const queueManager = new QueueManager();
  await queueManager.initialize();
  console.log('✅ Queue Manager initialized\n');
  
  // 2. Add various types of jobs
  console.log('2️⃣ Adding jobs to queues...');
  
  // Product scraping job
  const productJob = await queueManager.addJob(
    config.queue.queues.scraping,
    'product-scraping',
    {
      url: 'https://shopee.co.id/product/123/456',
      accountId: 'user123',
      options: {
        useProxy: true,
        retryAttempts: 3,
      },
    },
    {
      priority: config.queue.priorities.high,
      delay: 0,
    }
  );
  console.log(`✅ Product scraping job added: ${productJob.id}`);
  
  // Batch scraping job
  const batchJob = await queueManager.addJob(
    config.queue.queues.scraping,
    'batch-scraping',
    {
      urls: [
        'https://shopee.co.id/product/123/456',
        'https://shopee.co.id/product/789/012',
        'https://shopee.co.id/product/345/678',
      ],
      type: 'product',
      accountId: 'user123',
      options: {
        concurrency: 3,
      },
    },
    {
      priority: config.queue.priorities.normal,
    }
  );
  console.log(`✅ Batch scraping job added: ${batchJob.id}`);
  
  // Data processing job
  const dataJob = await queueManager.addJob(
    config.queue.queues.dataProcessing,
    'save-product-data',
    {
      productData: [
        {
          productId: 'prod123',
          name: 'Sample Product',
          price: 100000,
          rating: 4.5,
        },
      ],
    },
    {
      priority: config.queue.priorities.normal,
    }
  );
  console.log(`✅ Data processing job added: ${dataJob.id}`);
  
  // Notification job
  const notificationJob = await queueManager.addJob(
    config.queue.queues.notifications,
    'send-email',
    {
      to: 'admin@example.com',
      subject: 'Scraping Job Completed',
      template: 'job-completion',
      data: {
        jobId: productJob.id,
        status: 'completed',
      },
    },
    {
      priority: config.queue.priorities.high,
      delay: 5000, // Send after 5 seconds
    }
  );
  console.log(`✅ Notification job added: ${notificationJob.id}`);
  
  // Cleanup job
  const cleanupJob = await queueManager.addJob(
    config.queue.queues.cleanup,
    'cleanup-temp-files',
    {
      directories: ['./temp', './uploads/temp'],
      olderThan: 1,
      extensions: ['.tmp', '.temp'],
    },
    {
      priority: config.queue.priorities.low,
    }
  );
  console.log(`✅ Cleanup job added: ${cleanupJob.id}\n`);
  
  // 3. Add bulk jobs
  console.log('3️⃣ Adding bulk jobs...');
  const bulkJobs = [];
  for (let i = 1; i <= 5; i++) {
    bulkJobs.push({
      name: 'product-scraping',
      data: {
        url: `https://shopee.co.id/product/${i}/123`,
        accountId: 'user123',
      },
      priority: config.queue.priorities.normal,
    });
  }
  
  const addedBulkJobs = await queueManager.addBulkJobs(
    config.queue.queues.scraping,
    bulkJobs
  );
  console.log(`✅ Added ${addedBulkJobs.length} bulk jobs\n`);
  
  // 4. Get queue statistics
  console.log('4️⃣ Queue Statistics:');
  const stats = await queueManager.getAllQueueStats();
  console.log(JSON.stringify(stats, null, 2));
  console.log('');
  
  // 5. Demonstrate scheduler
  console.log('5️⃣ Setting up scheduler...');
  const scheduler = new SchedulerService();
  await scheduler.initialize(queueManager);
  
  // Add custom schedule
  await scheduler.addSchedule({
    name: 'hourly-product-sync',
    schedule: '0 * * * *', // Every hour
    jobName: 'sync-database',
    queueName: config.queue.queues.dataProcessing,
    jobData: {
      syncType: 'incremental',
    },
    enabled: true,
  });
  console.log('✅ Custom schedule added');
  
  // Add dynamic schedule
  await scheduler.addDynamicSchedule(
    'high-queue-alert',
    {
      type: 'queue_size',
      queueName: config.queue.queues.scraping,
      operator: '>',
      threshold: 50,
    },
    {
      jobName: 'send-email',
      queueName: config.queue.queues.notifications,
      jobData: {
        to: 'admin@example.com',
        subject: 'High Queue Alert',
        template: 'queue-alert',
        data: {
          queueName: config.queue.queues.scraping,
          threshold: 50,
        },
      },
    }
  );
  console.log('✅ Dynamic schedule added\n');
  
  // 6. Monitor queue events
  console.log('6️⃣ Setting up monitoring...');
  
  queueManager.on('job:completed', (data) => {
    console.log(`🎉 Job completed: ${data.jobId} in queue ${data.queueName}`);
  });
  
  queueManager.on('job:failed', (data) => {
    console.log(`❌ Job failed: ${data.jobId} in queue ${data.queueName} - ${data.failedReason}`);
  });
  
  queueManager.on('scaling:up', (data) => {
    console.log(`📈 Scaling up: ${data.queueName} from ${data.from} to ${data.to} workers`);
  });
  
  scheduler.on('job:scheduled', (data) => {
    console.log(`⏰ Scheduled job executed: ${data.scheduleName} - Job ID: ${data.jobId}`);
  });
  
  console.log('✅ Monitoring setup complete\n');
  
  // 7. Demonstrate queue management
  console.log('7️⃣ Queue Management Operations...');
  
  // Pause and resume queue
  await queueManager.pauseQueue(config.queue.queues.scraping);
  console.log('⏸️ Scraping queue paused');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await queueManager.resumeQueue(config.queue.queues.scraping);
  console.log('▶️ Scraping queue resumed');
  
  // Clean queue
  await queueManager.cleanQueue(config.queue.queues.scraping, {
    completed: true,
    failed: true,
    count: 10,
  });
  console.log('🧹 Queue cleaned\n');
  
  // 8. Health monitoring
  console.log('8️⃣ Health Status:');
  const health = queueManager.getHealthStatus();
  console.log(JSON.stringify(health, null, 2));
  console.log('');
  
  // 9. Wait and show final stats
  console.log('9️⃣ Waiting for jobs to process...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const finalStats = await queueManager.getAllQueueStats();
  console.log('📊 Final Statistics:');
  console.log(JSON.stringify(finalStats, null, 2));
  
  // 10. Cleanup
  console.log('\n🛑 Cleaning up...');
  await scheduler.stop();
  await queueManager.shutdown();
  
  console.log('✅ Demo completed successfully!');
}

async function demonstrateAdvancedFeatures() {
  console.log('\n🔥 Advanced Features Demo\n');
  
  const queueManager = new QueueManager();
  await queueManager.initialize();
  
  // 1. Job with custom retry strategy
  console.log('1️⃣ Custom retry strategy...');
  const retryJob = await queueManager.addJob(
    config.queue.queues.scraping,
    'product-scraping',
    {
      url: 'https://shopee.co.id/difficult-product/123',
      accountId: 'user123',
    },
    {
      attempts: 5,
      retryStrategy: 'exponential',
      backoff: {
        type: 'exponential',
        delay: 2000,
        factor: 2,
        maxDelay: 30000,
      },
    }
  );
  console.log(`✅ Job with custom retry: ${retryJob.id}`);
  
  // 2. Delayed job
  console.log('2️⃣ Delayed job...');
  const delayedJob = await queueManager.addJob(
    config.queue.queues.scraping,
    'product-scraping',
    {
      url: 'https://shopee.co.id/delayed-product/123',
      accountId: 'user123',
    },
    {
      delay: 30000, // 30 seconds delay
      priority: config.queue.priorities.high,
    }
  );
  console.log(`✅ Delayed job: ${delayedJob.id} (will execute in 30 seconds)`);
  
  // 3. Job with progress tracking
  console.log('3️⃣ Job with progress tracking...');
  const progressJob = await queueManager.addJob(
    config.queue.queues.dataProcessing,
    'transform-data',
    {
      data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() })),
      transformRules: [
        { field: 'value', operation: 'format', value: 'number' },
      ],
    }
  );
  console.log(`✅ Progress tracking job: ${progressJob.id}`);
  
  // Monitor progress
  queueManager.on('job:progress', (data) => {
    console.log(`📈 Job ${data.jobId} progress: ${data.data}%`);
  });
  
  // 4. Priority queue demonstration
  console.log('4️⃣ Priority queue...');
  const priorities = [
    { name: 'critical', priority: config.queue.priorities.critical },
    { name: 'high', priority: config.queue.priorities.high },
    { name: 'normal', priority: config.queue.priorities.normal },
    { name: 'low', priority: config.queue.priorities.low },
    { name: 'background', priority: config.queue.priorities.background },
  ];
  
  for (const { name, priority } of priorities) {
    await queueManager.addJob(
      config.queue.queues.scraping,
      'product-scraping',
      {
        url: `https://shopee.co.id/${name}-priority/123`,
        accountId: 'user123',
      },
      { priority }
    );
    console.log(`✅ ${name} priority job added`);
  }
  
  // 5. Rate limiting demonstration
  console.log('5️⃣ Rate limiting...');
  try {
    // Try to add many jobs quickly to trigger rate limiting
    for (let i = 0; i < 150; i++) {
      await queueManager.addJob(
        config.queue.queues.scraping,
        'product-scraping',
        {
          url: `https://shopee.co.id/rate-limit-test/${i}`,
          accountId: 'user123',
        }
      );
    }
  } catch (error) {
    console.log(`⚠️ Rate limit triggered: ${error.message}`);
  }
  
  console.log('\n⏳ Waiting for jobs to process...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  await queueManager.shutdown();
  console.log('✅ Advanced features demo completed!');
}

// Run demos
async function runDemos() {
  try {
    await demonstrateQueueSystem();
    await demonstrateAdvancedFeatures();
  } catch (error) {
    logger.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runDemos();
}

module.exports = {
  demonstrateQueueSystem,
  demonstrateAdvancedFeatures,
};
