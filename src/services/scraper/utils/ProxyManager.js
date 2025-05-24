const axios = require('axios');
const logger = require('../../../utils/logger');

/**
 * Advanced Proxy Manager dengan multiple provider support
 * Mendukung HTTP, HTTPS, SOCKS proxy dengan advanced features:
 * - Multiple proxy providers (Bright Data, Oxylabs, etc.)
 * - Geolocation management
 * - Advanced health checking
 * - Load balancing algorithms
 * - Performance monitoring
 */
class ProxyManager {
  constructor(options = {}) {
    this.proxies = [];
    this.currentIndex = 0;
    this.failedProxies = new Set();
    this.proxyStats = new Map();
    this.providers = new Map();
    this.geolocations = new Map();

    // Configuration
    this.config = {
      maxRetries: options.maxRetries || 3,
      testTimeout: options.testTimeout || 10000,
      healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
      maxFailureRate: options.maxFailureRate || 0.3, // 30%
      loadBalancing: options.loadBalancing || 'round-robin', // round-robin, least-used, performance
      geoTargeting: options.geoTargeting || false,
      ...options
    };

    // Load balancing strategies
    this.loadBalancingStrategies = {
      'round-robin': this.getRoundRobinProxy.bind(this),
      'least-used': this.getLeastUsedProxy.bind(this),
      'performance': this.getPerformanceBasedProxy.bind(this),
      'random': this.getRandomProxy.bind(this)
    };

    // Start health check interval
    this.startHealthCheckInterval();
  }

  /**
   * Add proxy provider configuration
   */
  addProvider(name, config) {
    this.providers.set(name, {
      name,
      endpoint: config.endpoint,
      auth: config.auth,
      type: config.type, // 'brightdata', 'oxylabs', 'custom'
      geolocations: config.geolocations || [],
      ...config
    });
    logger.scraper(`Proxy provider added: ${name}`);
  }

  /**
   * Add proxy to the pool with enhanced metadata
   */
  addProxy(proxy) {
    const proxyConfig = this.parseProxy(proxy);
    if (proxyConfig) {
      this.proxies.push(proxyConfig);
      this.proxyStats.set(proxyConfig.id, {
        requests: 0,
        failures: 0,
        lastUsed: null,
        responseTime: 0,
        successRate: 1.0,
        geolocation: proxyConfig.geolocation || null,
        provider: proxyConfig.provider || 'custom',
        createdAt: new Date(),
        lastHealthCheck: null,
        isHealthy: true
      });

      // Store geolocation mapping
      if (proxyConfig.geolocation) {
        if (!this.geolocations.has(proxyConfig.geolocation)) {
          this.geolocations.set(proxyConfig.geolocation, []);
        }
        this.geolocations.get(proxyConfig.geolocation).push(proxyConfig.id);
      }

      logger.scraper(`Proxy added: ${proxyConfig.id} (${proxyConfig.geolocation || 'unknown location'})`);
    }
  }

  /**
   * Add multiple proxies
   */
  addProxies(proxies) {
    proxies.forEach(proxy => this.addProxy(proxy));
  }

  /**
   * Parse proxy string to configuration object with enhanced metadata
   */
  parseProxy(proxy) {
    try {
      if (typeof proxy === 'object') {
        return {
          id: proxy.id || `${proxy.host}:${proxy.port}`,
          host: proxy.host,
          port: proxy.port,
          protocol: proxy.protocol || 'http',
          username: proxy.username,
          password: proxy.password,
          geolocation: proxy.geolocation || proxy.country || null,
          provider: proxy.provider || 'custom',
          sticky: proxy.sticky || false,
          sessionId: proxy.sessionId || null,
          ...proxy
        };
      }

      if (typeof proxy === 'string') {
        // Format: protocol://username:password@host:port atau host:port
        let url;

        if (proxy.includes('://')) {
          url = new URL(proxy);
        } else {
          // Assume HTTP if no protocol specified
          url = new URL(`http://${proxy}`);
        }

        const port = parseInt(url.port);
        if (isNaN(port)) { // Check if port is NaN after parsing
          logger.error(`Invalid port for proxy string: ${proxy}`);
          return null;
        }

        return {
          id: `${url.hostname}:${url.port}`, // Use original url.port for ID consistency with test
          protocol: url.protocol.replace(':', ''),
          host: url.hostname,
          port: port, // Use the parsed port
          username: url.username || null,
          password: url.password || null,
          geolocation: null,
          provider: 'custom',
          sticky: false,
          sessionId: null
        };
      }

      logger.error('Invalid proxy format:', proxy);
      return null;
    } catch (error) {
      logger.error(`Error parsing proxy: ${proxy}`, error);
      return null;
    }
  }

  /**
   * Get next available proxy using configured load balancing strategy
   */
  getNextProxy(options = {}) {
    if (this.proxies.length === 0) {
      return null;
    }

    const { geolocation, forceHealthy = true } = options;

    // Filter proxies based on criteria
    let availableProxies = this.proxies.filter(proxy => {
      const stats = this.proxyStats.get(proxy.id);

      // Check if proxy is failed
      if (this.failedProxies.has(proxy.id)) return false;

      // Check health status
      if (forceHealthy && !stats.isHealthy) return false;

      // Check geolocation if specified
      if (geolocation && proxy.geolocation !== geolocation) return false;

      // Check failure rate
      if (stats.successRate < (1 - this.config.maxFailureRate)) return false;

      return true;
    });

    if (availableProxies.length === 0) {
      // Fallback: reset failed proxies and try again
      this.failedProxies.clear();
      logger.scraper('No available proxies, resetting failed list');

      availableProxies = this.proxies.filter(proxy => {
        if (geolocation && proxy.geolocation !== geolocation) return false;
        return true;
      });

      if (availableProxies.length === 0) {
        return null;
      }
    }

    // Use configured load balancing strategy
    const strategy = this.loadBalancingStrategies[this.config.loadBalancing];
    const proxy = strategy(availableProxies);

    if (proxy) {
      // Update stats
      const stats = this.proxyStats.get(proxy.id);
      stats.requests++;
      stats.lastUsed = new Date();

      logger.scraper(`Using proxy: ${proxy.id} (${proxy.geolocation || 'unknown'}) via ${this.config.loadBalancing}`);
    }

    return proxy;
  }

  /**
   * Load balancing strategies
   */
  getRoundRobinProxy(availableProxies) {
    const proxy = availableProxies[this.currentIndex % availableProxies.length];
    this.currentIndex++;
    return proxy;
  }

  getLeastUsedProxy(availableProxies) {
    return availableProxies.reduce((least, current) => {
      const leastStats = this.proxyStats.get(least.id);
      const currentStats = this.proxyStats.get(current.id);
      return currentStats.requests < leastStats.requests ? current : least;
    });
  }

  getPerformanceBasedProxy(availableProxies) {
    // Sort by success rate and response time
    return availableProxies.sort((a, b) => {
      const statsA = this.proxyStats.get(a.id);
      const statsB = this.proxyStats.get(b.id);

      // Primary: success rate
      if (statsA.successRate !== statsB.successRate) {
        return statsB.successRate - statsA.successRate;
      }

      // Secondary: response time (lower is better)
      return statsA.responseTime - statsB.responseTime;
    })[0];
  }

  getRandomProxy(availableProxies) {
    return availableProxies[Math.floor(Math.random() * availableProxies.length)];
  }

  /**
   * Get proxy configuration for Puppeteer
   */
  getPuppeteerProxyConfig(proxy) {
    if (!proxy) return null;

    const args = [`--proxy-server=${proxy.protocol}://${proxy.host}:${proxy.port}`];

    return {
      args,
      proxy: {
        server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
        username: proxy.username,
        password: proxy.password,
      },
    };
  }

  /**
   * Mark proxy as failed with enhanced tracking
   */
  markProxyFailed(proxyId, error = null) {
    this.failedProxies.add(proxyId);

    const stats = this.proxyStats.get(proxyId);
    if (stats) {
      stats.failures++;
      stats.isHealthy = false;

      // Update success rate
      const totalRequests = stats.requests;
      if (totalRequests > 0) {
        stats.successRate = (totalRequests - stats.failures) / totalRequests;
      }
    }

    logger.scraper(`Proxy marked as failed: ${proxyId}`, {
      error: error?.message,
      successRate: stats?.successRate,
      totalFailures: stats?.failures
    });
  }

  /**
   * Mark proxy as successful
   */
  markProxySuccess(proxyId, responseTime = 0) {
    const stats = this.proxyStats.get(proxyId);
    if (stats) {
      stats.isHealthy = true;
      stats.responseTime = responseTime;

      // Update success rate
      const totalRequests = stats.requests;
      if (totalRequests > 0) {
        stats.successRate = (totalRequests - stats.failures) / totalRequests;
      }

      // Remove from failed list if it was there
      this.failedProxies.delete(proxyId);
    }
  }

  /**
   * Advanced proxy health check with multiple test endpoints
   */
  async testProxy(proxy, testUrl = 'https://httpbin.org/ip') {
    const startTime = Date.now();
    const testEndpoints = [
      'https://httpbin.org/ip',
      'https://api.ipify.org?format=json',
      'http://ip-api.com/json'
    ];

    try {
      // Use axios for faster testing instead of puppeteer
      for (const endpoint of testEndpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: this.config.testTimeout,
            proxy: {
              protocol: proxy.protocol,
              host: proxy.host,
              port: proxy.port,
              auth: proxy.username ? {
                username: proxy.username,
                password: proxy.password
              } : undefined
            }
          });

          if (response.status === 200) {
            const responseTime = Date.now() - startTime;
            const data = response.data;

            // Extract geolocation info if available
            let detectedLocation = null;
            if (data.country) {
              detectedLocation = data.country;
            } else if (data.query) {
              detectedLocation = data.country;
            }

            // Update proxy stats
            const stats = this.proxyStats.get(proxy.id);
            if (stats) {
              stats.responseTime = responseTime;
              stats.lastHealthCheck = new Date();
              stats.isHealthy = true;

              // Update geolocation if detected
              if (detectedLocation && !proxy.geolocation) {
                proxy.geolocation = detectedLocation;
                stats.geolocation = detectedLocation;
              }
            }

            this.markProxySuccess(proxy.id, responseTime);

            logger.scraper(`Proxy test successful: ${proxy.id} (${responseTime}ms) - ${detectedLocation || 'unknown location'}`);

            return {
              success: true,
              responseTime,
              detectedLocation,
              endpoint: endpoint,
              ip: data.ip || data.query || 'unknown'
            };
          }
        } catch (endpointError) {
          // Try next endpoint
          continue;
        }
      }

      throw new Error('All test endpoints failed');
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.markProxyFailed(proxy.id, error);

      logger.scraper(`Proxy test failed: ${proxy.id} (${responseTime}ms)`, error);
      return { success: false, error: error.message, responseTime };
    }
  }

  /**
   * Test all proxies
   */
  async testAllProxies() {
    logger.scraper('Testing all proxies...');

    const testPromises = this.proxies.map(proxy => this.testProxy(proxy));
    const results = await Promise.allSettled(testPromises);

    const workingProxies = results.filter(result => result.status === 'fulfilled' && result.value).length;

    logger.scraper(`Proxy test completed: ${workingProxies}/${this.proxies.length} working`);

    return {
      total: this.proxies.length,
      working: workingProxies,
      failed: this.proxies.length - workingProxies,
    };
  }

  /**
   * Get proxy statistics
   */
  getStats() {
    const stats = {
      total: this.proxies.length,
      failed: this.failedProxies.size,
      working: this.proxies.length - this.failedProxies.size,
      proxies: [],
    };

    this.proxies.forEach(proxy => {
      const proxyStats = this.proxyStats.get(proxy.id);
      stats.proxies.push({
        id: proxy.id,
        host: proxy.host,
        port: proxy.port,
        protocol: proxy.protocol,
        failed: this.failedProxies.has(proxy.id),
        ...proxyStats,
      });
    });

    return stats;
  }

  /**
   * Remove failed proxies from pool
   */
  removeFailedProxies() {
    const initialCount = this.proxies.length;

    this.proxies = this.proxies.filter(proxy => !this.failedProxies.has(proxy.id));
    this.failedProxies.clear();

    const removedCount = initialCount - this.proxies.length;
    logger.scraper(`Removed ${removedCount} failed proxies`);

    return removedCount;
  }

  /**
   * Reset proxy statistics
   */
  resetStats() {
    this.failedProxies.clear();
    this.currentIndex = 0;

    this.proxyStats.forEach(stats => {
      stats.requests = 0;
      stats.failures = 0;
      stats.lastUsed = null;

      stats.responseTime = 0;
    });

    logger.scraper('Proxy statistics reset');
  }

  /**
   * Start health check interval
   */
  startHealthCheckInterval() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        logger.scraper('Running scheduled proxy health check...');
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check interval error:', error);
      }
    }, this.config.healthCheckInterval);

    logger.scraper(`Health check interval started (${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Stop health check interval
   */
  stopHealthCheckInterval() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.scraper('Health check interval stopped');
    }
  }

  /**
   * Perform health check on all proxies
   */
  async performHealthCheck() {
    const unhealthyProxies = this.proxies.filter(proxy => {
      const stats = this.proxyStats.get(proxy.id);
      return !stats.isHealthy || this.failedProxies.has(proxy.id);
    });

    if (unhealthyProxies.length === 0) {
      logger.scraper('All proxies are healthy');
      return;
    }

    logger.scraper(`Health checking ${unhealthyProxies.length} unhealthy proxies...`);

    const testPromises = unhealthyProxies.map(proxy => this.testProxy(proxy));
    const results = await Promise.allSettled(testPromises);

    const recovered = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    logger.scraper(`Health check completed: ${recovered}/${unhealthyProxies.length} proxies recovered`);
  }

  /**
   * Get proxies by geolocation
   */
  getProxiesByLocation(location) {
    const proxyIds = this.geolocations.get(location) || [];
    return proxyIds.map(id => this.proxies.find(p => p.id === id)).filter(Boolean);
  }

  /**
   * Get available geolocations
   */
  getAvailableLocations() {
    return Array.from(this.geolocations.keys());
  }

  /**
   * Load proxies from file
   */
  async loadProxiesFromFile(filePath) {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      const proxies = content.split('\n').filter(line => line.trim());

      this.addProxies(proxies);
      logger.scraper(`Loaded ${proxies.length} proxies from file: ${filePath}`);

      return proxies.length;
    } catch (error) {
      logger.error(`Failed to load proxies from file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthCheckInterval();
    this.proxies = [];
    this.proxyStats.clear();
    this.failedProxies.clear();
    this.providers.clear();
    this.geolocations.clear();
    logger.scraper('ProxyManager destroyed');
  }
}

module.exports = ProxyManager;
