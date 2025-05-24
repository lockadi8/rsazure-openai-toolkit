const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Real-time Proxy Monitoring dan Alerting System
 * Memantau performa proxy, detection rate, dan memberikan alert real-time
 */
class ProxyMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      alertThresholds: {
        failureRate: options.failureRate || 0.3, // 30%
        responseTime: options.responseTime || 5000, // 5 seconds
        detectionRate: options.detectionRate || 0.1, // 10%
        consecutiveFailures: options.consecutiveFailures || 5
      },
      monitoringInterval: options.monitoringInterval || 60000, // 1 minute
      retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      ...options
    };

    // Monitoring data
    this.metrics = {
      proxies: new Map(),
      global: {
        totalRequests: 0,
        totalFailures: 0,
        totalDetections: 0,
        averageResponseTime: 0,
        startTime: new Date()
      }
    };

    // Alert state
    this.alerts = {
      active: new Map(),
      history: []
    };

    // Start monitoring
    this.startMonitoring();

    logger.scraper('ProxyMonitor initialized');
  }

  /**
   * Start monitoring interval
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
      this.checkAlertConditions();
      this.cleanupOldData();
    }, this.config.monitoringInterval);

    logger.scraper(`Proxy monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.scraper('Proxy monitoring stopped');
    }
  }

  /**
   * Record proxy usage
   */
  recordProxyUsage(proxyId, success, responseTime, metadata = {}) {
    if (!this.metrics.proxies.has(proxyId)) {
      this.metrics.proxies.set(proxyId, {
        id: proxyId,
        requests: 0,
        failures: 0,
        detections: 0,
        responseTimes: [],
        consecutiveFailures: 0,
        lastUsed: null,
        firstUsed: new Date(),
        metadata: {}
      });
    }

    const proxyMetrics = this.metrics.proxies.get(proxyId);
    
    // Update proxy metrics
    proxyMetrics.requests++;
    proxyMetrics.lastUsed = new Date();
    proxyMetrics.responseTimes.push({
      time: responseTime,
      timestamp: new Date()
    });
    
    // Keep only recent response times
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    proxyMetrics.responseTimes = proxyMetrics.responseTimes.filter(
      rt => rt.timestamp > cutoff
    );

    if (success) {
      proxyMetrics.consecutiveFailures = 0;
    } else {
      proxyMetrics.failures++;
      proxyMetrics.consecutiveFailures++;
      
      // Check if it's a detection
      if (metadata.detected) {
        proxyMetrics.detections++;
        this.metrics.global.totalDetections++;
      }
    }

    // Update global metrics
    this.metrics.global.totalRequests++;
    if (!success) {
      this.metrics.global.totalFailures++;
    }

    // Calculate average response time
    const allResponseTimes = Array.from(this.metrics.proxies.values())
      .flatMap(p => p.responseTimes.map(rt => rt.time));
    
    if (allResponseTimes.length > 0) {
      this.metrics.global.averageResponseTime = 
        allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
    }

    // Emit events
    this.emit('proxyUsage', {
      proxyId,
      success,
      responseTime,
      metadata,
      metrics: proxyMetrics
    });

    // Check for immediate alerts
    this.checkProxyAlerts(proxyId, proxyMetrics);
  }

  /**
   * Check proxy-specific alert conditions
   */
  checkProxyAlerts(proxyId, metrics) {
    const alerts = [];

    // High failure rate
    if (metrics.requests >= 10) {
      const failureRate = metrics.failures / metrics.requests;
      if (failureRate >= this.config.alertThresholds.failureRate) {
        alerts.push({
          type: 'HIGH_FAILURE_RATE',
          severity: 'warning',
          message: `Proxy ${proxyId} has high failure rate: ${(failureRate * 100).toFixed(1)}%`,
          data: { proxyId, failureRate, threshold: this.config.alertThresholds.failureRate }
        });
      }
    }

    // High detection rate
    if (metrics.requests >= 5) {
      const detectionRate = metrics.detections / metrics.requests;
      if (detectionRate >= this.config.alertThresholds.detectionRate) {
        alerts.push({
          type: 'HIGH_DETECTION_RATE',
          severity: 'critical',
          message: `Proxy ${proxyId} has high detection rate: ${(detectionRate * 100).toFixed(1)}%`,
          data: { proxyId, detectionRate, threshold: this.config.alertThresholds.detectionRate }
        });
      }
    }

    // Consecutive failures
    if (metrics.consecutiveFailures >= this.config.alertThresholds.consecutiveFailures) {
      alerts.push({
        type: 'CONSECUTIVE_FAILURES',
        severity: 'critical',
        message: `Proxy ${proxyId} has ${metrics.consecutiveFailures} consecutive failures`,
        data: { proxyId, consecutiveFailures: metrics.consecutiveFailures }
      });
    }

    // High response time
    if (metrics.responseTimes.length >= 5) {
      const recentResponseTimes = metrics.responseTimes.slice(-5).map(rt => rt.time);
      const avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
      
      if (avgResponseTime >= this.config.alertThresholds.responseTime) {
        alerts.push({
          type: 'HIGH_RESPONSE_TIME',
          severity: 'warning',
          message: `Proxy ${proxyId} has high response time: ${avgResponseTime.toFixed(0)}ms`,
          data: { proxyId, responseTime: avgResponseTime, threshold: this.config.alertThresholds.responseTime }
        });
      }
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Check global alert conditions
   */
  checkAlertConditions() {
    const alerts = [];

    // Global failure rate
    if (this.metrics.global.totalRequests >= 50) {
      const globalFailureRate = this.metrics.global.totalFailures / this.metrics.global.totalRequests;
      if (globalFailureRate >= this.config.alertThresholds.failureRate) {
        alerts.push({
          type: 'GLOBAL_HIGH_FAILURE_RATE',
          severity: 'critical',
          message: `Global failure rate is high: ${(globalFailureRate * 100).toFixed(1)}%`,
          data: { failureRate: globalFailureRate }
        });
      }
    }

    // Global detection rate
    if (this.metrics.global.totalRequests >= 20) {
      const globalDetectionRate = this.metrics.global.totalDetections / this.metrics.global.totalRequests;
      if (globalDetectionRate >= this.config.alertThresholds.detectionRate) {
        alerts.push({
          type: 'GLOBAL_HIGH_DETECTION_RATE',
          severity: 'critical',
          message: `Global detection rate is high: ${(globalDetectionRate * 100).toFixed(1)}%`,
          data: { detectionRate: globalDetectionRate }
        });
      }
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Process and emit alert
   */
  processAlert(alert) {
    const alertKey = `${alert.type}_${JSON.stringify(alert.data)}`;
    
    // Check if alert is already active
    if (this.alerts.active.has(alertKey)) {
      return;
    }

    // Add timestamp and ID
    alert.id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    alert.timestamp = new Date();

    // Store alert
    this.alerts.active.set(alertKey, alert);
    this.alerts.history.push(alert);

    // Log alert
    logger.warn(`PROXY ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, alert.data);

    // Emit alert event
    this.emit('alert', alert);

    // Auto-resolve after some time
    setTimeout(() => {
      this.resolveAlert(alertKey);
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertKey) {
    if (this.alerts.active.has(alertKey)) {
      const alert = this.alerts.active.get(alertKey);
      alert.resolvedAt = new Date();
      this.alerts.active.delete(alertKey);
      
      this.emit('alertResolved', alert);
      logger.scraper(`Alert resolved: ${alert.id}`);
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    const healthData = this.getHealthStatus();
    
    this.emit('healthCheck', healthData);
    
    if (healthData.status !== 'healthy') {
      logger.warn('Proxy system health check failed', healthData);
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    const now = new Date();
    const uptime = now - this.metrics.global.startTime;
    
    const totalProxies = this.metrics.proxies.size;
    const activeProxies = Array.from(this.metrics.proxies.values())
      .filter(p => p.consecutiveFailures < this.config.alertThresholds.consecutiveFailures).length;
    
    const globalFailureRate = this.metrics.global.totalRequests > 0 ? 
      this.metrics.global.totalFailures / this.metrics.global.totalRequests : 0;
    
    const globalDetectionRate = this.metrics.global.totalRequests > 0 ? 
      this.metrics.global.totalDetections / this.metrics.global.totalRequests : 0;

    let status = 'healthy';
    if (globalFailureRate > this.config.alertThresholds.failureRate || 
        globalDetectionRate > this.config.alertThresholds.detectionRate ||
        activeProxies / totalProxies < 0.5) {
      status = 'unhealthy';
    } else if (globalFailureRate > this.config.alertThresholds.failureRate * 0.7 ||
               globalDetectionRate > this.config.alertThresholds.detectionRate * 0.7) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: now,
      uptime,
      metrics: {
        totalProxies,
        activeProxies,
        totalRequests: this.metrics.global.totalRequests,
        globalFailureRate,
        globalDetectionRate,
        averageResponseTime: this.metrics.global.averageResponseTime
      },
      activeAlerts: this.alerts.active.size
    };
  }

  /**
   * Get detailed metrics
   */
  getMetrics() {
    return {
      global: { ...this.metrics.global },
      proxies: Array.from(this.metrics.proxies.values()).map(proxy => ({
        ...proxy,
        failureRate: proxy.requests > 0 ? proxy.failures / proxy.requests : 0,
        detectionRate: proxy.requests > 0 ? proxy.detections / proxy.requests : 0,
        averageResponseTime: proxy.responseTimes.length > 0 ? 
          proxy.responseTimes.reduce((a, b) => a + b.time, 0) / proxy.responseTimes.length : 0
      })),
      alerts: {
        active: Array.from(this.alerts.active.values()),
        history: this.alerts.history.slice(-100) // Last 100 alerts
      }
    };
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    
    // Clean up old response times
    for (const proxyMetrics of this.metrics.proxies.values()) {
      proxyMetrics.responseTimes = proxyMetrics.responseTimes.filter(
        rt => rt.timestamp > cutoff
      );
    }

    // Clean up old alerts
    this.alerts.history = this.alerts.history.filter(
      alert => alert.timestamp > cutoff
    );
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopMonitoring();
    this.metrics.proxies.clear();
    this.alerts.active.clear();
    this.alerts.history = [];
    this.removeAllListeners();
    
    logger.scraper('ProxyMonitor destroyed');
  }
}

module.exports = ProxyMonitor;
