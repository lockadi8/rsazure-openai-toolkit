const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * Real-time Monitoring Dashboard
 * Menyediakan web interface untuk monitoring proxy dan scraper performance
 */
class MonitoringDashboard {
  constructor(proxyMonitor, options = {}) {
    this.proxyMonitor = proxyMonitor;
    this.config = {
      port: options.port || 3001,
      updateInterval: options.updateInterval || 5000, // 5 seconds
      ...options
    };

    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.connectedClients = new Set();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupMonitoringEvents();

    logger.scraper('MonitoringDashboard initialized');
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, 'dashboard')));

    // API endpoints
    this.app.get('/api/health', (req, res) => {
      res.json(this.proxyMonitor.getHealthStatus());
    });

    this.app.get('/api/metrics', (req, res) => {
      res.json(this.proxyMonitor.getMetrics());
    });

    this.app.get('/api/proxies', (req, res) => {
      const metrics = this.proxyMonitor.getMetrics();
      res.json(metrics.proxies);
    });

    this.app.get('/api/alerts', (req, res) => {
      const metrics = this.proxyMonitor.getMetrics();
      res.json(metrics.alerts);
    });

    // Dashboard home
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboardHTML());
    });
  }

  /**
   * Setup Socket.IO handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      this.connectedClients.add(socket);
      logger.scraper(`Dashboard client connected: ${socket.id}`);

      // Send initial data
      socket.emit('initialData', {
        health: this.proxyMonitor.getHealthStatus(),
        metrics: this.proxyMonitor.getMetrics()
      });

      socket.on('disconnect', () => {
        this.connectedClients.delete(socket);
        logger.scraper(`Dashboard client disconnected: ${socket.id}`);
      });

      socket.on('requestUpdate', () => {
        socket.emit('metricsUpdate', this.proxyMonitor.getMetrics());
      });
    });
  }

  /**
   * Setup monitoring event handlers
   */
  setupMonitoringEvents() {
    // Real-time updates
    this.proxyMonitor.on('proxyUsage', (data) => {
      this.broadcast('proxyUsage', data);
    });

    this.proxyMonitor.on('alert', (alert) => {
      this.broadcast('alert', alert);
    });

    this.proxyMonitor.on('alertResolved', (alert) => {
      this.broadcast('alertResolved', alert);
    });

    this.proxyMonitor.on('healthCheck', (health) => {
      this.broadcast('healthUpdate', health);
    });

    // Periodic metrics update
    setInterval(() => {
      this.broadcast('metricsUpdate', this.proxyMonitor.getMetrics());
    }, this.config.updateInterval);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Generate dashboard HTML
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proxy Monitoring Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1a1a1a; color: #fff; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #4CAF50; margin-bottom: 10px; }
        .status-indicator { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .status-healthy { background: #4CAF50; }
        .status-degraded { background: #FF9800; }
        .status-unhealthy { background: #f44336; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #2d2d2d; border-radius: 10px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .card h3 { color: #4CAF50; margin-bottom: 15px; }
        .metric { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .metric-value { font-weight: bold; color: #fff; }
        .alerts { margin-top: 20px; }
        .alert { padding: 10px; margin-bottom: 10px; border-radius: 5px; }
        .alert-warning { background: rgba(255, 152, 0, 0.2); border-left: 4px solid #FF9800; }
        .alert-critical { background: rgba(244, 67, 54, 0.2); border-left: 4px solid #f44336; }
        .proxy-list { max-height: 400px; overflow-y: auto; }
        .proxy-item { background: #3d3d3d; margin-bottom: 10px; padding: 15px; border-radius: 5px; }
        .proxy-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .proxy-id { font-weight: bold; color: #4CAF50; }
        .proxy-status { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
        .status-active { background: #4CAF50; }
        .status-failed { background: #f44336; }
        .proxy-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
        .proxy-metric { text-align: center; }
        .proxy-metric-label { font-size: 12px; color: #aaa; }
        .proxy-metric-value { font-weight: bold; }
        .chart-container { height: 200px; background: #3d3d3d; border-radius: 5px; margin-top: 15px; display: flex; align-items: center; justify-content: center; color: #aaa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Proxy Monitoring Dashboard</h1>
            <div id="systemStatus" class="status-indicator">Connecting...</div>
            <div id="lastUpdate" style="margin-top: 10px; color: #aaa; font-size: 14px;"></div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 System Overview</h3>
                <div class="metric">
                    <span>Total Proxies:</span>
                    <span id="totalProxies" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span>Active Proxies:</span>
                    <span id="activeProxies" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span>Total Requests:</span>
                    <span id="totalRequests" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span>Global Failure Rate:</span>
                    <span id="globalFailureRate" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span>Detection Rate:</span>
                    <span id="detectionRate" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span>Avg Response Time:</span>
                    <span id="avgResponseTime" class="metric-value">-</span>
                </div>
            </div>

            <div class="card">
                <h3>🚨 Active Alerts</h3>
                <div id="activeAlerts">No active alerts</div>
            </div>

            <div class="card">
                <h3>📈 Performance Chart</h3>
                <div class="chart-container">
                    Chart will be implemented here
                </div>
            </div>
        </div>

        <div class="card">
            <h3>🌐 Proxy Status</h3>
            <div id="proxyList" class="proxy-list">
                Loading proxy data...
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        let lastUpdateTime = new Date();

        // Update last update time
        function updateLastUpdateTime() {
            document.getElementById('lastUpdate').textContent = 
                'Last updated: ' + lastUpdateTime.toLocaleTimeString();
        }

        // Update system status
        function updateSystemStatus(health) {
            const statusEl = document.getElementById('systemStatus');
            statusEl.textContent = health.status.toUpperCase();
            statusEl.className = 'status-indicator status-' + health.status;
        }

        // Update metrics
        function updateMetrics(metrics) {
            document.getElementById('totalProxies').textContent = metrics.global.totalProxies || 0;
            document.getElementById('activeProxies').textContent = metrics.global.activeProxies || 0;
            document.getElementById('totalRequests').textContent = metrics.global.totalRequests || 0;
            document.getElementById('globalFailureRate').textContent = 
                ((metrics.global.globalFailureRate || 0) * 100).toFixed(1) + '%';
            document.getElementById('detectionRate').textContent = 
                ((metrics.global.globalDetectionRate || 0) * 100).toFixed(1) + '%';
            document.getElementById('avgResponseTime').textContent = 
                Math.round(metrics.global.averageResponseTime || 0) + 'ms';
        }

        // Update alerts
        function updateAlerts(alerts) {
            const alertsEl = document.getElementById('activeAlerts');
            if (alerts.active.length === 0) {
                alertsEl.innerHTML = '<div style="color: #4CAF50;">✅ No active alerts</div>';
                return;
            }

            alertsEl.innerHTML = alerts.active.map(alert => 
                '<div class="alert alert-' + alert.severity + '">' +
                '<strong>' + alert.type + '</strong><br>' +
                alert.message +
                '</div>'
            ).join('');
        }

        // Update proxy list
        function updateProxyList(proxies) {
            const listEl = document.getElementById('proxyList');
            if (proxies.length === 0) {
                listEl.innerHTML = '<div style="text-align: center; color: #aaa;">No proxy data available</div>';
                return;
            }

            listEl.innerHTML = proxies.map(proxy => 
                '<div class="proxy-item">' +
                '<div class="proxy-header">' +
                '<span class="proxy-id">' + proxy.id + '</span>' +
                '<span class="proxy-status status-' + (proxy.consecutiveFailures > 0 ? 'failed' : 'active') + '">' +
                (proxy.consecutiveFailures > 0 ? 'FAILED' : 'ACTIVE') +
                '</span>' +
                '</div>' +
                '<div class="proxy-metrics">' +
                '<div class="proxy-metric">' +
                '<div class="proxy-metric-label">Requests</div>' +
                '<div class="proxy-metric-value">' + proxy.requests + '</div>' +
                '</div>' +
                '<div class="proxy-metric">' +
                '<div class="proxy-metric-label">Failure Rate</div>' +
                '<div class="proxy-metric-value">' + (proxy.failureRate * 100).toFixed(1) + '%</div>' +
                '</div>' +
                '<div class="proxy-metric">' +
                '<div class="proxy-metric-label">Avg Response</div>' +
                '<div class="proxy-metric-value">' + Math.round(proxy.averageResponseTime) + 'ms</div>' +
                '</div>' +
                '<div class="proxy-metric">' +
                '<div class="proxy-metric-label">Last Used</div>' +
                '<div class="proxy-metric-value">' + 
                (proxy.lastUsed ? new Date(proxy.lastUsed).toLocaleTimeString() : 'Never') +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>'
            ).join('');
        }

        // Socket event handlers
        socket.on('initialData', (data) => {
            updateSystemStatus(data.health);
            updateMetrics(data.metrics);
            updateAlerts(data.metrics.alerts);
            updateProxyList(data.metrics.proxies);
            lastUpdateTime = new Date();
            updateLastUpdateTime();
        });

        socket.on('metricsUpdate', (metrics) => {
            updateMetrics(metrics);
            updateAlerts(metrics.alerts);
            updateProxyList(metrics.proxies);
            lastUpdateTime = new Date();
            updateLastUpdateTime();
        });

        socket.on('healthUpdate', (health) => {
            updateSystemStatus(health);
        });

        socket.on('alert', (alert) => {
            // Show notification for new alerts
            console.log('New alert:', alert);
        });

        // Update time every second
        setInterval(updateLastUpdateTime, 1000);
    </script>
</body>
</html>`;
  }

  /**
   * Start dashboard server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.scraper(`Monitoring dashboard started on port ${this.config.port}`);
          logger.scraper(`Dashboard URL: http://localhost:${this.config.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Stop dashboard server
   */
  async stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.scraper('Monitoring dashboard stopped');
        resolve();
      });
    });
  }

  /**
   * Get dashboard URL
   */
  getURL() {
    return `http://localhost:${this.config.port}`;
  }
}

module.exports = MonitoringDashboard;
