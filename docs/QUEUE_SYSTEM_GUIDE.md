# 🚀 Queue System & Job Management Guide

Sistem queue dan job management yang robust menggunakan Redis dan BullMQ untuk Shopee Scraper System.

## 📋 Daftar Isi

1. [Overview](#overview)
2. [Arsitektur](#arsitektur)
3. [Instalasi & Setup](#instalasi--setup)
4. [Penggunaan Dasar](#penggunaan-dasar)
5. [Queue Management](#queue-management)
6. [Job Types](#job-types)
7. [Workers](#workers)
8. [Scheduler](#scheduler)
9. [Dashboard](#dashboard)
10. [Monitoring & Alerting](#monitoring--alerting)
11. [Auto-scaling](#auto-scaling)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

## Overview

Sistem queue ini menyediakan:

- **Multiple Queue Support**: Scraping, data processing, notifications, cleanup
- **Job Priority Management**: Critical, high, normal, low, background
- **Retry Strategies**: Exponential backoff, fixed delay, linear increment
- **Auto-scaling**: Dynamic worker scaling berdasarkan queue load
- **Real-time Dashboard**: Monitoring dan management interface
- **Scheduler Service**: Cron-based dan dynamic scheduling
- **Comprehensive Monitoring**: Health checks, metrics, alerting

## Arsitektur

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Queue Manager │    │   Scheduler     │    │   Dashboard     │
│                 │    │   Service       │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │        Redis              │
                    │     (BullMQ Backend)      │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────┴───────┐    ┌─────────┴───────┐    ┌─────────┴───────┐
    │  Scraping   │    │ Data Processing │    │  Notification   │
    │  Workers    │    │    Workers      │    │    Workers      │
    └─────────────┘    └─────────────────┘    └─────────────────┘
```

## Instalasi & Setup

### 1. Prerequisites

```bash
# Redis harus running
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Atau menggunakan docker-compose
docker-compose up -d redis
```

### 2. Environment Variables

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Configuration
QUEUE_CONCURRENCY=10
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=5000
QUEUE_AUTO_SCALING=true
QUEUE_MIN_WORKERS=2
QUEUE_MAX_WORKERS=20

# Dashboard
QUEUE_DASHBOARD_ENABLED=true
QUEUE_DASHBOARD_PORT=3001
QUEUE_DASHBOARD_USERNAME=admin
QUEUE_DASHBOARD_PASSWORD=admin123

# Workers
SCRAPING_WORKERS=2
DATA_PROCESSING_WORKERS=1
NOTIFICATION_WORKERS=1
```

### 3. Start System

```bash
# Start complete system
node src/scripts/start-queue-system.js start

# Start individual components
node src/scripts/start-queue-system.js queue      # Queue manager only
node src/scripts/start-queue-system.js workers   # Workers only
node src/scripts/start-queue-system.js dashboard # Dashboard only
node src/scripts/start-queue-system.js scheduler # Scheduler only
```

## Penggunaan Dasar

### Initialize Queue Manager

```javascript
const QueueManager = require('./src/services/queue/QueueManager');

const queueManager = new QueueManager();
await queueManager.initialize();
```

### Add Jobs

```javascript
// Product scraping job
const job = await queueManager.addJob(
  'scraping-queue',
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
    priority: 7, // High priority
    delay: 0,
    attempts: 3,
  }
);

console.log(`Job added with ID: ${job.id}`);
```

### Bulk Jobs

```javascript
const bulkJobs = [
  {
    name: 'product-scraping',
    data: { url: 'https://shopee.co.id/product/1/123' },
    priority: 5,
  },
  {
    name: 'product-scraping',
    data: { url: 'https://shopee.co.id/product/2/456' },
    priority: 5,
  },
];

const addedJobs = await queueManager.addBulkJobs('scraping-queue', bulkJobs);
```

## Queue Management

### Queue Operations

```javascript
// Get queue statistics
const stats = await queueManager.getQueueStats('scraping-queue');
console.log(stats);

// Pause queue
await queueManager.pauseQueue('scraping-queue');

// Resume queue
await queueManager.resumeQueue('scraping-queue');

// Clean queue (remove completed/failed jobs)
await queueManager.cleanQueue('scraping-queue', {
  completed: true,
  failed: true,
  count: 100,
});
```

### Job Management

```javascript
// Get job details
const job = await queueManager.getJob('scraping-queue', 'job-id');

// Retry failed job
await queueManager.retryJob('scraping-queue', 'job-id');

// Remove job
await queueManager.removeJob('scraping-queue', 'job-id');
```

## Job Types

### 1. Scraping Jobs

#### Product Scraping
```javascript
await queueManager.addJob('scraping-queue', 'product-scraping', {
  url: 'https://shopee.co.id/product/123/456',
  accountId: 'user123',
  options: {
    useProxy: true,
    retryAttempts: 3,
  },
});
```

#### Order Scraping
```javascript
await queueManager.addJob('scraping-queue', 'order-scraping', {
  accountId: 'user123',
  dateRange: {
    start: '2024-01-01',
    end: '2024-01-31',
  },
});
```

#### Shop Scraping
```javascript
await queueManager.addJob('scraping-queue', 'shop-scraping', {
  shopUrl: 'https://shopee.co.id/shop/123456',
});
```

#### Batch Scraping
```javascript
await queueManager.addJob('scraping-queue', 'batch-scraping', {
  urls: [
    'https://shopee.co.id/product/1/123',
    'https://shopee.co.id/product/2/456',
  ],
  type: 'product',
  accountId: 'user123',
  options: {
    concurrency: 3,
  },
});
```

### 2. Data Processing Jobs

#### Save Product Data
```javascript
await queueManager.addJob('data-processing-queue', 'save-product-data', {
  productData: [
    {
      productId: 'prod123',
      name: 'Sample Product',
      price: 100000,
      rating: 4.5,
    },
  ],
});
```

#### Update Elasticsearch
```javascript
await queueManager.addJob('data-processing-queue', 'update-elasticsearch', {
  data: productData,
  indexName: 'products',
  operation: 'index',
});
```

#### Data Validation
```javascript
await queueManager.addJob('data-processing-queue', 'validate-data', {
  data: rawData,
  validationRules: [
    { field: 'productId', type: 'string', required: true },
    { field: 'price', type: 'number', required: true, min: 0 },
  ],
});
```

### 3. Notification Jobs

#### Email Notification
```javascript
await queueManager.addJob('notifications-queue', 'send-email', {
  to: 'admin@example.com',
  subject: 'Scraping Job Completed',
  template: 'job-completion',
  data: {
    jobId: 'job-123',
    status: 'completed',
  },
});
```

#### Webhook Notification
```javascript
await queueManager.addJob('notifications-queue', 'send-webhook', {
  url: 'https://api.example.com/webhook',
  method: 'POST',
  data: {
    event: 'job_completed',
    jobId: 'job-123',
  },
});
```

### 4. Cleanup Jobs

#### Cleanup Old Data
```javascript
await queueManager.addJob('cleanup-queue', 'cleanup-old-data', {
  collections: ['products'],
  olderThan: 30, // days
  dryRun: false,
});
```

#### Cleanup Temp Files
```javascript
await queueManager.addJob('cleanup-queue', 'cleanup-temp-files', {
  directories: ['./temp', './uploads/temp'],
  olderThan: 1, // days
  extensions: ['.tmp', '.temp'],
});
```

## Workers

### Worker Types

1. **ScrapingWorker**: Memproses scraping jobs
2. **DataProcessingWorker**: Memproses data processing jobs
3. **NotificationWorker**: Mengirim notifikasi
4. **CleanupWorker**: Membersihkan data dan file

### Start Workers

```javascript
const WorkerManager = require('./src/workers');

const workerManager = new WorkerManager();
await workerManager.initialize();

// Scale workers
await workerManager.scaleWorkers('scraping', 5); // Scale to 5 scraping workers
```

### Custom Worker

```javascript
const { Worker } = require('bullmq');

const worker = new Worker('my-queue', async (job) => {
  // Process job
  const { data } = job;
  
  // Update progress
  await job.updateProgress(50);
  
  // Return result
  return { success: true, processedData: data };
});
```

## Scheduler

### Cron-based Scheduling

```javascript
const SchedulerService = require('./src/services/scheduler/SchedulerService');

const scheduler = new SchedulerService();
await scheduler.initialize(queueManager);

// Add schedule
await scheduler.addSchedule({
  name: 'daily-cleanup',
  schedule: '0 2 * * *', // 2 AM daily
  jobName: 'cleanup-old-data',
  queueName: 'cleanup-queue',
  jobData: {
    collections: ['products'],
    olderThan: 30,
  },
  enabled: true,
});
```

### Dynamic Scheduling

```javascript
// Schedule based on queue size
await scheduler.addDynamicSchedule(
  'high-queue-alert',
  {
    type: 'queue_size',
    queueName: 'scraping-queue',
    operator: '>',
    threshold: 50,
  },
  {
    jobName: 'send-email',
    queueName: 'notifications-queue',
    jobData: {
      to: 'admin@example.com',
      subject: 'High Queue Alert',
    },
  }
);
```

## Dashboard

### Access Dashboard

```
URL: http://localhost:3001
Username: admin
Password: admin123
```

### Features

- **Real-time Queue Monitoring**: Live statistics dan job status
- **Job Management**: Retry, remove, view job details
- **Queue Operations**: Pause, resume, clean queues
- **Health Monitoring**: System health dan performance metrics
- **Worker Statistics**: Worker status dan performance

### API Endpoints

```bash
# Get queue statistics
GET /api/stats

# Get specific queue details
GET /api/queues/:queueName

# Retry job
POST /api/queues/:queueName/jobs/:jobId/retry

# Remove job
DELETE /api/queues/:queueName/jobs/:jobId

# Pause queue
POST /api/queues/:queueName/pause

# Resume queue
POST /api/queues/:queueName/resume

# Clean queue
POST /api/queues/:queueName/clean
```

## Monitoring & Alerting

### Event Monitoring

```javascript
// Monitor job events
queueManager.on('job:completed', (data) => {
  console.log(`Job completed: ${data.jobId}`);
});

queueManager.on('job:failed', (data) => {
  console.log(`Job failed: ${data.jobId} - ${data.failedReason}`);
});

queueManager.on('scaling:up', (data) => {
  console.log(`Scaling up: ${data.queueName}`);
});

// Monitor health
queueManager.on('health:check', (health) => {
  if (health.status !== 'healthy') {
    // Send alert
  }
});
```

### Metrics Collection

```javascript
// Get comprehensive statistics
const stats = await queueManager.getAllQueueStats();

// Health status
const health = queueManager.getHealthStatus();

// Worker statistics
const workerStats = workerManager.getWorkerStats();
```

## Auto-scaling

### Configuration

```javascript
// Enable auto-scaling in config
queue: {
  autoScaling: {
    enabled: true,
    minWorkers: 2,
    maxWorkers: 20,
    scaleUpThreshold: 10,   // Scale up when queue > 10 jobs
    scaleDownThreshold: 2,  // Scale down when queue < 2 jobs
    cooldownPeriod: 300000, // 5 minutes between scaling actions
  },
}
```

### Manual Scaling

```javascript
// Scale specific worker type
await workerManager.scaleWorkers('scraping', 5);

// Get current scaling status
const stats = workerManager.getWorkerStats();
console.log(stats.byType); // Workers by type
```

## Best Practices

### 1. Job Design

- **Idempotent Jobs**: Jobs harus bisa dijalankan ulang tanpa efek samping
- **Small Payloads**: Gunakan job data yang kecil, simpan data besar di database
- **Progress Tracking**: Update progress untuk job yang berjalan lama
- **Error Handling**: Implementasi error handling yang comprehensive

### 2. Queue Management

- **Separate Queues**: Pisahkan job berdasarkan tipe dan prioritas
- **Priority Setting**: Gunakan priority yang tepat untuk setiap job
- **Rate Limiting**: Implementasi rate limiting untuk mencegah overload
- **Monitoring**: Monitor queue size dan performance secara real-time

### 3. Worker Configuration

- **Concurrency**: Set concurrency berdasarkan resource dan job complexity
- **Resource Management**: Monitor memory dan CPU usage
- **Graceful Shutdown**: Implementasi graceful shutdown untuk workers
- **Health Checks**: Regular health checks untuk workers

### 4. Retry Strategies

```javascript
// Exponential backoff untuk network errors
{
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
    factor: 2,
    maxDelay: 30000,
  },
}

// Fixed delay untuk rate limiting
{
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000,
  },
}
```

## Troubleshooting

### Common Issues

#### 1. Jobs Stuck in Queue

```bash
# Check Redis connection
redis-cli ping

# Check worker status
curl http://localhost:3001/api/stats

# Restart workers
pm2 restart workers
```

#### 2. High Memory Usage

```javascript
// Increase removeOnComplete/removeOnFail
queue: {
  removeOnComplete: 50,  // Keep only 50 completed jobs
  removeOnFail: 20,      // Keep only 20 failed jobs
}

// Regular cleanup
await queueManager.cleanQueue('queue-name', {
  completed: true,
  failed: true,
  count: 100,
});
```

#### 3. Failed Jobs

```javascript
// Get failed jobs
const failedJobs = await queue.getFailed();

// Retry all failed jobs
for (const job of failedJobs) {
  await job.retry();
}

// Or clean failed jobs
await queue.clean(0, 0, 'failed');
```

### Debugging

```javascript
// Enable debug logging
process.env.DEBUG = 'bull*';

// Monitor job events
queueManager.on('job:failed', (data) => {
  console.error('Job failed:', data);
  // Log to external service
});

// Health monitoring
setInterval(async () => {
  const health = queueManager.getHealthStatus();
  if (health.status !== 'healthy') {
    console.warn('System unhealthy:', health);
  }
}, 60000);
```

### Performance Optimization

1. **Redis Optimization**:
   - Use Redis cluster untuk high availability
   - Optimize Redis memory settings
   - Monitor Redis performance

2. **Worker Optimization**:
   - Tune concurrency berdasarkan job complexity
   - Implement connection pooling
   - Use worker-specific configurations

3. **Job Optimization**:
   - Batch similar jobs
   - Optimize job payload size
   - Implement efficient retry strategies

---

## 📚 Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Support

Untuk pertanyaan atau issues, silakan buat issue di repository atau hubungi tim development.
