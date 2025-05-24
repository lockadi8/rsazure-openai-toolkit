const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const config = require('../../../config');
const logger = require('../../utils/logger');
const QueueManager = require('./QueueManager');

/**
 * Queue Dashboard
 * Real-time monitoring dan management interface untuk queue system
 */
class QueueDashboard {
  constructor(options = {}) {
    this.options = {
      port: options.port || config.queue.dashboard.port,
      username: options.username || config.queue.dashboard.username,
      password: options.password || config.queue.dashboard.password,
      updateInterval: options.updateInterval || 5000, // 5 seconds
      ...options,
    };

    this.app = express();
    this.server = null;
    this.io = null;
    this.queueManager = null;
    this.isRunning = false;

    // Dashboard statistics
    this.dashboardStats = {
      connectedClients: 0,
      totalRequests: 0,
      startTime: new Date(),
    };

    this.setupExpress();
  }

  /**
   * Setup Express application
   */
  setupExpress() {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Basic authentication middleware
    this.app.use(this.basicAuth.bind(this));

    // Static files for dashboard UI
    this.app.use(express.static(__dirname + '/dashboard-ui'));

    // API routes
    this.setupRoutes();

    // Error handling
    this.app.use(this.errorHandler.bind(this));
  }

  /**
   * Basic authentication middleware
   */
  basicAuth(req, res, next) {
    // Skip auth for health check
    if (req.path === '/health') {
      return next();
    }

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Queue Dashboard"');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
    const [username, password] = credentials;

    if (username !== this.options.username || password !== this.options.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    this.dashboardStats.totalRequests++;
    next();
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Dashboard home
    this.app.get('/', (req, res) => {
      res.send(this.getDashboardHTML());
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: Date.now() - this.dashboardStats.startTime.getTime(),
        connectedClients: this.dashboardStats.connectedClients,
      });
    });

    // Queue statistics
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.getQueueStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Queue details
    this.app.get('/api/queues/:queueName', async (req, res) => {
      try {
        const { queueName } = req.params;
        const queueStats = await this.queueManager.getQueueStats(queueName);
        res.json(queueStats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Job details
    this.app.get('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
      try {
        const { queueName, jobId } = req.params;
        const job = await this.queueManager.getJob(queueName, jobId);
        res.json(job);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Retry job
    this.app.post('/api/queues/:queueName/jobs/:jobId/retry', async (req, res) => {
      try {
        const { queueName, jobId } = req.params;
        await this.queueManager.retryJob(queueName, jobId);
        res.json({ success: true, message: 'Job retried successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Remove job
    this.app.delete('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
      try {
        const { queueName, jobId } = req.params;
        await this.queueManager.removeJob(queueName, jobId);
        res.json({ success: true, message: 'Job removed successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Pause queue
    this.app.post('/api/queues/:queueName/pause', async (req, res) => {
      try {
        const { queueName } = req.params;
        await this.queueManager.pauseQueue(queueName);
        res.json({ success: true, message: 'Queue paused successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Resume queue
    this.app.post('/api/queues/:queueName/resume', async (req, res) => {
      try {
        const { queueName } = req.params;
        await this.queueManager.resumeQueue(queueName);
        res.json({ success: true, message: 'Queue resumed successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Clean queue
    this.app.post('/api/queues/:queueName/clean', async (req, res) => {
      try {
        const { queueName } = req.params;
        const options = req.body;
        await this.queueManager.cleanQueue(queueName, options);
        res.json({ success: true, message: 'Queue cleaned successfully' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Add job
    this.app.post('/api/queues/:queueName/jobs', async (req, res) => {
      try {
        const { queueName } = req.params;
        const { jobName, jobData, options } = req.body;

        const job = await this.queueManager.addJob(queueName, jobName, jobData, options);
        res.json({
          success: true,
          jobId: job.id,
          message: 'Job added successfully',
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Error handler
   */
  errorHandler(error, req, res, next) {
    logger.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }

  /**
   * Start dashboard server
   */
  async start(queueManager) {
    try {
      this.queueManager = queueManager;

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Setup Socket.IO
      this.io = socketIo(this.server, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST'],
        },
      });

      // Setup Socket.IO events
      this.setupSocketEvents();

      // Start server
      await new Promise((resolve, reject) => {
        this.server.listen(this.options.port, error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Start real-time updates
      this.startRealTimeUpdates();

      this.isRunning = true;
      logger.info(`Queue Dashboard started on port ${this.options.port}`);
      logger.info(`Dashboard URL: http://localhost:${this.options.port}`);
      logger.info(`Username: ${this.options.username}, Password: ${this.options.password}`);
    } catch (error) {
      logger.error('Failed to start Queue Dashboard:', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO events
   */
  setupSocketEvents() {
    this.io.on('connection', socket => {
      this.dashboardStats.connectedClients++;
      logger.debug(`Client connected to dashboard. Total: ${this.dashboardStats.connectedClients}`);

      // Send initial data
      this.sendStatsToClient(socket);

      socket.on('disconnect', () => {
        this.dashboardStats.connectedClients--;
        logger.debug(`Client disconnected from dashboard. Total: ${this.dashboardStats.connectedClients}`);
      });

      // Handle client requests
      socket.on('request:stats', () => {
        this.sendStatsToClient(socket);
      });

      socket.on('request:queue', async queueName => {
        try {
          const queueStats = await this.queueManager.getQueueStats(queueName);
          socket.emit('queue:stats', { queueName, stats: queueStats });
        } catch (error) {
          socket.emit('error', { message: error.message });
        }
      });
    });
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    setInterval(async () => {
      if (this.dashboardStats.connectedClients > 0) {
        try {
          const stats = await this.getQueueStats();
          this.io.emit('stats:update', stats);
        } catch (error) {
          logger.error('Failed to send real-time updates:', error);
        }
      }
    }, this.options.updateInterval);
  }

  /**
   * Send stats to specific client
   */
  async sendStatsToClient(socket) {
    try {
      const stats = await this.getQueueStats();
      socket.emit('stats:initial', stats);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Get comprehensive queue statistics
   */
  async getQueueStats() {
    if (!this.queueManager) {
      throw new Error('Queue manager not initialized');
    }

    const queueStats = await this.queueManager.getAllQueueStats();
    const healthStatus = this.queueManager.getHealthStatus();

    return {
      ...queueStats,
      health: healthStatus,
      dashboard: {
        ...this.dashboardStats,
        uptime: Date.now() - this.dashboardStats.startTime.getTime(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get dashboard HTML
   */
  getDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Queue Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .stat-label { color: #7f8c8d; margin-top: 5px; }
        .queue-list { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .queue-item { padding: 15px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: center; }
        .queue-name { font-weight: bold; color: #2c3e50; }
        .queue-stats { display: flex; gap: 15px; }
        .queue-stat { text-align: center; }
        .queue-stat-value { font-weight: bold; color: #3498db; }
        .queue-stat-label { font-size: 0.8em; color: #7f8c8d; }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; margin-right: 10px; }
        .status-healthy { background: #27ae60; }
        .status-warning { background: #f39c12; }
        .status-error { background: #e74c3c; }
        .refresh-time { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Queue Dashboard</h1>
            <p>Real-time monitoring for Shopee Scraper Queue System</p>
            <div class="refresh-time">Last updated: <span id="lastUpdate">-</span></div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalJobs">-</div>
                <div class="stat-label">Total Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="activeJobs">-</div>
                <div class="stat-label">Active Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="completedJobs">-</div>
                <div class="stat-label">Completed Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="failedJobs">-</div>
                <div class="stat-label">Failed Jobs</div>
            </div>
        </div>

        <div class="queue-list">
            <h2>Queue Status</h2>
            <div id="queueList">Loading...</div>
        </div>
    </div>

    <script>
        const socket = io();

        socket.on('stats:initial', updateStats);
        socket.on('stats:update', updateStats);

        function updateStats(data) {
            document.getElementById('totalJobs').textContent = data.global.totalJobs || 0;
            document.getElementById('activeJobs').textContent = data.global.activeJobs || 0;
            document.getElementById('completedJobs').textContent = data.global.completedJobs || 0;
            document.getElementById('failedJobs').textContent = data.global.failedJobs || 0;
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();

            updateQueueList(data.queues);
        }

        function updateQueueList(queues) {
            const queueList = document.getElementById('queueList');
            queueList.innerHTML = '';

            Object.entries(queues).forEach(([queueName, stats]) => {
                const queueItem = document.createElement('div');
                queueItem.className = 'queue-item';

                const statusClass = stats.failed > 0 ? 'status-error' :
                                  stats.active > 10 ? 'status-warning' : 'status-healthy';

                queueItem.innerHTML = \`
                    <div style="display: flex; align-items: center;">
                        <div class="status-indicator \${statusClass}"></div>
                        <div class="queue-name">\${queueName}</div>
                    </div>
                    <div class="queue-stats">
                        <div class="queue-stat">
                            <div class="queue-stat-value">\${stats.waiting}</div>
                            <div class="queue-stat-label">Waiting</div>
                        </div>
                        <div class="queue-stat">
                            <div class="queue-stat-value">\${stats.active}</div>
                            <div class="queue-stat-label">Active</div>
                        </div>
                        <div class="queue-stat">
                            <div class="queue-stat-value">\${stats.completed}</div>
                            <div class="queue-stat-label">Completed</div>
                        </div>
                        <div class="queue-stat">
                            <div class="queue-stat-value">\${stats.failed}</div>
                            <div class="queue-stat-label">Failed</div>
                        </div>
                    </div>
                \`;

                queueList.appendChild(queueItem);
            });
        }

        // Request initial stats
        socket.emit('request:stats');
    </script>
</body>
</html>
    `;
  }

  /**
   * Stop dashboard server
   */
  async stop() {
    try {
      logger.info('Stopping Queue Dashboard...');

      if (this.io) {
        this.io.close();
      }

      if (this.server) {
        await new Promise(resolve => {
          this.server.close(resolve);
        });
      }

      this.isRunning = false;
      logger.info('Queue Dashboard stopped successfully');
    } catch (error) {
      logger.error('Error stopping Queue Dashboard:', error);
      throw error;
    }
  }
}

module.exports = QueueDashboard;
