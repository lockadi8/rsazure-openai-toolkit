# 🚀 Queue System & Job Management

Sistem queue dan job management yang robust menggunakan Redis dan BullMQ untuk Shopee Scraper System.

## ✨ Fitur Utama

- **🔄 Multiple Queue Support**: Scraping, data processing, notifications, cleanup
- **⚡ Job Priority Management**: Critical, high, normal, low, background priorities
- **🔁 Advanced Retry Strategies**: Exponential backoff, fixed delay, linear increment
- **📈 Auto-scaling**: Dynamic worker scaling berdasarkan queue load
- **📊 Real-time Dashboard**: Web-based monitoring dan management interface
- **⏰ Scheduler Service**: Cron-based dan dynamic scheduling
- **🔍 Comprehensive Monitoring**: Health checks, metrics, alerting
- **🛡️ Error Handling**: Dead letter queue, stalled job recovery
- **⚖️ Rate Limiting**: Mencegah overload dengan rate limiting per queue

## 🏗️ Arsitektur

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

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Atau menggunakan docker-compose
docker-compose up -d redis
```

### 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit configuration
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_DASHBOARD_ENABLED=true
QUEUE_DASHBOARD_PORT=3001
```

### 3. Start Queue System

```bash
# Start complete system (recommended)
npm run queue:start

# Atau start individual components
npm run queue:manager    # Queue manager only
npm run queue:workers    # Workers only
npm run queue:dashboard  # Dashboard only
npm run queue:scheduler  # Scheduler only
```

### 4. Access Dashboard

```
URL: http://localhost:3001
Username: admin
Password: admin123
```

## 📋 Available Commands

```bash
# Queue System
npm run queue:start      # Start complete queue system
npm run queue:manager    # Start queue manager only
npm run queue:workers    # Start workers only
npm run queue:dashboard  # Start dashboard only
npm run queue:scheduler  # Start scheduler only
npm run queue:demo       # Run demo/examples

# Development
npm run dev              # Start with nodemon
npm run test             # Run tests
npm run lint             # Lint code
```

## 💼 Job Types

### 1. Scraping Jobs

```javascript
// Product scraping
await queueManager.addJob('scraping-queue', 'product-scraping', {
  url: 'https://shopee.co.id/product/123/456',
  accountId: 'user123',
  options: { useProxy: true }
});

// Batch scraping
await queueManager.addJob('scraping-queue', 'batch-scraping', {
  urls: ['url1', 'url2', 'url3'],
  type: 'product',
  options: { concurrency: 3 }
});

// Order scraping
await queueManager.addJob('scraping-queue', 'order-scraping', {
  accountId: 'user123',
  dateRange: { start: '2024-01-01', end: '2024-01-31' }
});
```

### 2. Data Processing Jobs

```javascript
// Save product data
await queueManager.addJob('data-processing-queue', 'save-product-data', {
  productData: [{ productId: 'prod123', name: 'Product' }]
});

// Update Elasticsearch
await queueManager.addJob('data-processing-queue', 'update-elasticsearch', {
  data: productData,
  indexName: 'products',
  operation: 'index'
});

// Data validation
await queueManager.addJob('data-processing-queue', 'validate-data', {
  data: rawData,
  validationRules: [
    { field: 'productId', type: 'string', required: true }
  ]
});
```

### 3. Notification Jobs

```javascript
// Email notification
await queueManager.addJob('notifications-queue', 'send-email', {
  to: 'admin@example.com',
  subject: 'Job Completed',
  template: 'job-completion',
  data: { jobId: 'job-123' }
});

// Webhook notification
await queueManager.addJob('notifications-queue', 'send-webhook', {
  url: 'https://api.example.com/webhook',
  data: { event: 'job_completed' }
});
```

### 4. Cleanup Jobs

```javascript
// Cleanup old data
await queueManager.addJob('cleanup-queue', 'cleanup-old-data', {
  collections: ['products'],
  olderThan: 30 // days
});

// Cleanup temp files
await queueManager.addJob('cleanup-queue', 'cleanup-temp-files', {
  directories: ['./temp'],
  olderThan: 1 // days
});
```

## ⚙️ Configuration

### Queue Configuration

```javascript
// config/index.js
queue: {
  // General settings
  concurrency: 10,
  retryAttempts: 3,
  retryDelay: 5000,
  
  // Queue names
  queues: {
    scraping: 'scraping-queue',
    dataProcessing: 'data-processing-queue',
    notifications: 'notifications-queue',
    cleanup: 'cleanup-queue'
  },
  
  // Job priorities
  priorities: {
    critical: 10,
    high: 7,
    normal: 5,
    low: 3,
    background: 1
  },
  
  // Auto-scaling
  autoScaling: {
    enabled: true,
    minWorkers: 2,
    maxWorkers: 20,
    scaleUpThreshold: 10,
    scaleDownThreshold: 2
  }
}
```

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue Settings
QUEUE_CONCURRENCY=10
QUEUE_RETRY_ATTEMPTS=3
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

## 📊 Monitoring & Dashboard

### Dashboard Features

- **Real-time Statistics**: Live queue metrics dan job counts
- **Job Management**: View, retry, remove jobs
- **Queue Operations**: Pause, resume, clean queues
- **Worker Monitoring**: Worker status dan performance
- **Health Checks**: System health indicators
- **Auto-refresh**: Real-time updates via WebSocket

### API Endpoints

```bash
# Statistics
GET /api/stats                              # All queue stats
GET /api/queues/:queueName                  # Specific queue stats

# Job Management
GET /api/queues/:queueName/jobs/:jobId      # Job details
POST /api/queues/:queueName/jobs/:jobId/retry  # Retry job
DELETE /api/queues/:queueName/jobs/:jobId   # Remove job

# Queue Management
POST /api/queues/:queueName/pause           # Pause queue
POST /api/queues/:queueName/resume          # Resume queue
POST /api/queues/:queueName/clean           # Clean queue
```

## ⏰ Scheduler

### Cron-based Scheduling

```javascript
const scheduler = new SchedulerService();
await scheduler.initialize(queueManager);

// Daily cleanup at 2 AM
await scheduler.addSchedule({
  name: 'daily-cleanup',
  schedule: '0 2 * * *',
  jobName: 'cleanup-old-data',
  queueName: 'cleanup-queue',
  jobData: { collections: ['products'], olderThan: 30 }
});
```

### Dynamic Scheduling

```javascript
// Alert when queue size > 50
await scheduler.addDynamicSchedule(
  'high-queue-alert',
  {
    type: 'queue_size',
    queueName: 'scraping-queue',
    operator: '>',
    threshold: 50
  },
  {
    jobName: 'send-email',
    queueName: 'notifications-queue',
    jobData: { to: 'admin@example.com', subject: 'High Queue Alert' }
  }
);
```

## 🔧 Advanced Usage

### Custom Retry Strategies

```javascript
// Exponential backoff
await queueManager.addJob('queue-name', 'job-name', data, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
    factor: 2,
    maxDelay: 30000
  }
});

// Fixed delay
await queueManager.addJob('queue-name', 'job-name', data, {
  attempts: 3,
  backoff: { type: 'fixed', delay: 5000 }
});
```

### Job Priorities

```javascript
// Critical priority job
await queueManager.addJob('queue-name', 'job-name', data, {
  priority: 10 // Critical
});

// Background job
await queueManager.addJob('queue-name', 'job-name', data, {
  priority: 1 // Background
});
```

### Delayed Jobs

```javascript
// Execute after 30 seconds
await queueManager.addJob('queue-name', 'job-name', data, {
  delay: 30000
});

// Execute at specific time
await queueManager.addJob('queue-name', 'job-name', data, {
  delay: new Date('2024-12-31 23:59:59') - new Date()
});
```

## 🛠️ Development

### Running Examples

```bash
# Run complete demo
npm run queue:demo

# Or run specific examples
node examples/queue-system-usage.js
```

### Testing

```bash
# Run all tests
npm test

# Run queue-specific tests
npm test -- --grep "queue"

# Run with coverage
npm run test:coverage
```

### Debugging

```bash
# Enable debug logging
DEBUG=bull* npm run queue:start

# Monitor Redis
redis-cli monitor

# Check queue health
curl http://localhost:3001/health
```

## 📚 Documentation

- [Complete Queue System Guide](docs/QUEUE_SYSTEM_GUIDE.md)
- [API Documentation](docs/API.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

Untuk pertanyaan atau issues:

1. Check [documentation](docs/)
2. Search existing [issues](../../issues)
3. Create new issue dengan detail lengkap
4. Join Discord community (link)

## 🎯 Roadmap

- [ ] Redis Cluster support
- [ ] Prometheus metrics integration
- [ ] Advanced job scheduling
- [ ] Job dependency management
- [ ] Multi-tenant support
- [ ] GraphQL API
- [ ] Mobile dashboard app
