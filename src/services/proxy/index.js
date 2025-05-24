/**
 * Advanced Proxy Rotation & Anti-Detection System
 * Main integration file yang menggabungkan semua komponen:
 * - ProxyManager dengan multiple provider support
 * - AntiDetectionModule dengan comprehensive fingerprint spoofing
 * - StealthConfig dengan advanced browser arguments
 * - HumanBehavior simulation
 * - Real-time monitoring dan alerting
 */

const ProxyManager = require('../scraper/utils/ProxyManager');
const AntiDetectionModule = require('../antiDetection');
const StealthConfig = require('../scraper/utils/StealthConfig');
const HumanBehavior = require('../behavior/HumanBehavior');
const ProxyMonitor = require('../monitoring/ProxyMonitor');
const MonitoringDashboard = require('../monitoring/Dashboard');
const PuppeteerConfig = require('../../config/puppeteer');
const logger = require('../../utils/logger');

/**
 * Advanced Proxy System - Main orchestrator
 */
class AdvancedProxySystem {
  constructor(options = {}) {
    this.config = {
      // Proxy configuration
      proxy: {
        loadBalancing: 'performance', // round-robin, least-used, performance, random
        healthCheckInterval: 300000, // 5 minutes
        maxFailureRate: 0.3,
        geoTargeting: true,
        ...options.proxy
      },

      // Anti-detection configuration
      antiDetection: {
        enableCanvasFingerprinting: true,
        enableWebRTCProtection: true,
        enableFontBlocking: true,
        enableHardwareSpoof: true,
        enableMemorySpoof: true,
        ...options.antiDetection
      },

      // Human behavior configuration
      humanBehavior: {
        typingSpeed: { min: 50, max: 150 },
        mouseSpeed: { min: 100, max: 300 },
        scrollSpeed: { min: 200, max: 800 },
        readingSpeed: { wordsPerMinute: 200, variationPercent: 30 },
        ...options.humanBehavior
      },

      // Monitoring configuration
      monitoring: {
        enabled: true,
        alertThresholds: {
          failureRate: 0.3,
          responseTime: 5000,
          detectionRate: 0.1,
          consecutiveFailures: 5
        },
        dashboard: {
          enabled: true,
          port: 3001
        },
        ...options.monitoring
      },

      ...options
    };

    // Initialize components
    this.proxyManager = new ProxyManager(this.config.proxy);
    this.antiDetection = new AntiDetectionModule(this.config.antiDetection);
    this.stealthConfig = new StealthConfig(this.config.antiDetection);
    this.humanBehavior = new HumanBehavior(this.config.humanBehavior);
    this.puppeteerConfig = new PuppeteerConfig({
      ...this.config,
      proxy: this.config.proxy
    });

    // Initialize monitoring if enabled
    if (this.config.monitoring.enabled) {
      this.proxyMonitor = new ProxyMonitor(this.config.monitoring);
      
      if (this.config.monitoring.dashboard.enabled) {
        this.dashboard = new MonitoringDashboard(
          this.proxyMonitor, 
          this.config.monitoring.dashboard
        );
      }
    }

    // Setup event handlers
    this.setupEventHandlers();

    logger.scraper('AdvancedProxySystem initialized with all components');
  }

  /**
   * Setup event handlers between components
   */
  setupEventHandlers() {
    if (this.proxyMonitor) {
      // Monitor proxy usage
      this.proxyMonitor.on('alert', (alert) => {
        logger.warn(`Proxy Alert: ${alert.message}`, alert.data);
        
        // Auto-remediation for critical alerts
        if (alert.severity === 'critical') {
          this.handleCriticalAlert(alert);
        }
      });

      this.proxyMonitor.on('healthCheck', (health) => {
        if (health.status === 'unhealthy') {
          logger.error('Proxy system is unhealthy', health);
        }
      });
    }
  }

  /**
   * Handle critical alerts with auto-remediation
   */
  async handleCriticalAlert(alert) {
    switch (alert.type) {
      case 'HIGH_DETECTION_RATE':
      case 'CONSECUTIVE_FAILURES':
        // Remove problematic proxy
        if (alert.data.proxyId) {
          logger.warn(`Auto-removing problematic proxy: ${alert.data.proxyId}`);
          this.proxyManager.markProxyFailed(alert.data.proxyId, new Error('Auto-removed due to critical alert'));
        }
        break;
        
      case 'GLOBAL_HIGH_DETECTION_RATE':
        // Switch to more aggressive anti-detection
        logger.warn('Enabling enhanced anti-detection measures');
        this.antiDetection.config.enableCanvasFingerprinting = true;
        this.antiDetection.config.enableWebRTCProtection = true;
        break;
    }
  }

  /**
   * Add proxy providers
   */
  addProxyProvider(name, config) {
    this.proxyManager.addProvider(name, config);
    logger.scraper(`Added proxy provider: ${name}`);
  }

  /**
   * Add proxies to the pool
   */
  addProxies(proxies) {
    this.proxyManager.addProxies(proxies);
    logger.scraper(`Added ${proxies.length} proxies to the pool`);
  }

  /**
   * Load proxies from file
   */
  async loadProxiesFromFile(filePath) {
    const count = await this.proxyManager.loadProxiesFromFile(filePath);
    logger.scraper(`Loaded ${count} proxies from file: ${filePath}`);
    return count;
  }

  /**
   * Create browser instance with full anti-detection
   */
  async createBrowser(options = {}) {
    try {
      const { browser, profile, proxy } = await this.puppeteerConfig.launchBrowser({
        proxyOptions: options.proxyOptions,
        ...options
      });

      // Track proxy usage if monitoring is enabled
      if (this.proxyMonitor && proxy) {
        const startTime = Date.now();
        
        // Monitor browser lifecycle
        browser.on('disconnected', () => {
          const responseTime = Date.now() - startTime;
          this.proxyMonitor.recordProxyUsage(proxy.id, true, responseTime, {
            browserSession: true
          });
        });
      }

      logger.scraper(`Browser created with proxy: ${proxy?.id || 'none'}`);
      
      return { browser, profile, proxy };
    } catch (error) {
      logger.error('Failed to create browser:', error);
      throw error;
    }
  }

  /**
   * Create page with full setup
   */
  async createPage(browser, options = {}) {
    const { page, profile } = await this.puppeteerConfig.createPage(browser, options);
    
    // Add human behavior methods to page
    page.humanType = (selector, text, opts) => this.humanBehavior.humanType(page, selector, text, opts);
    page.humanClick = (selector, opts) => this.humanBehavior.humanClick(page, selector, opts);
    page.naturalScroll = (direction, distance, opts) => this.humanBehavior.naturalScroll(page, direction, distance, opts);
    page.simulateReading = (selector) => this.humanBehavior.simulateReadingTime(page, selector);
    page.navigationDelay = () => this.humanBehavior.navigationDelay();
    
    return { page, profile };
  }

  /**
   * Navigate with comprehensive anti-detection and behavior simulation
   */
  async navigateWithStealth(page, url, options = {}) {
    const startTime = Date.now();
    let success = false;
    let detectionSuspected = false;

    try {
      await this.puppeteerConfig.navigateWithBehavior(page, url, options);
      success = true;
      
      // Check for detection indicators
      detectionSuspected = await this.checkForDetection(page);
      
      if (detectionSuspected) {
        logger.warn(`Potential detection suspected on: ${url}`);
      }

    } catch (error) {
      logger.error(`Navigation failed: ${url}`, error);
      
      // Check if it's a detection-related error
      if (error.message.includes('403') || 
          error.message.includes('blocked') ||
          error.message.includes('captcha')) {
        detectionSuspected = true;
      }
      
      throw error;
    } finally {
      // Record metrics if monitoring is enabled
      if (this.proxyMonitor && page.proxy) {
        const responseTime = Date.now() - startTime;
        this.proxyMonitor.recordProxyUsage(page.proxy.id, success, responseTime, {
          url,
          detected: detectionSuspected
        });
      }
    }
  }

  /**
   * Check for detection indicators on page
   */
  async checkForDetection(page) {
    try {
      // Check for common detection indicators
      const detectionIndicators = await page.evaluate(() => {
        const indicators = [];
        
        // Check for CAPTCHA
        if (document.querySelector('[data-sitekey]') || 
            document.querySelector('.g-recaptcha') ||
            document.querySelector('#captcha') ||
            document.body.textContent.toLowerCase().includes('captcha')) {
          indicators.push('captcha');
        }
        
        // Check for access denied messages
        if (document.body.textContent.toLowerCase().includes('access denied') ||
            document.body.textContent.toLowerCase().includes('blocked') ||
            document.body.textContent.toLowerCase().includes('forbidden')) {
          indicators.push('access_denied');
        }
        
        // Check for bot detection messages
        if (document.body.textContent.toLowerCase().includes('bot detected') ||
            document.body.textContent.toLowerCase().includes('automated traffic')) {
          indicators.push('bot_detected');
        }
        
        return indicators;
      });

      return detectionIndicators.length > 0;
    } catch (error) {
      logger.error('Failed to check for detection:', error);
      return false;
    }
  }

  /**
   * Get system status and metrics
   */
  getStatus() {
    const proxyStats = this.proxyManager.getStats();
    const health = this.proxyMonitor ? this.proxyMonitor.getHealthStatus() : null;
    
    return {
      proxies: proxyStats,
      health,
      monitoring: {
        enabled: !!this.proxyMonitor,
        dashboard: {
          enabled: !!this.dashboard,
          url: this.dashboard ? this.dashboard.getURL() : null
        }
      }
    };
  }

  /**
   * Start monitoring dashboard
   */
  async startDashboard() {
    if (this.dashboard) {
      await this.dashboard.start();
      logger.scraper(`Monitoring dashboard available at: ${this.dashboard.getURL()}`);
    } else {
      throw new Error('Dashboard not enabled');
    }
  }

  /**
   * Stop monitoring dashboard
   */
  async stopDashboard() {
    if (this.dashboard) {
      await this.dashboard.stop();
    }
  }

  /**
   * Cleanup all resources
   */
  async destroy() {
    logger.scraper('Destroying AdvancedProxySystem...');
    
    if (this.dashboard) {
      await this.dashboard.stop();
    }
    
    if (this.proxyMonitor) {
      this.proxyMonitor.destroy();
    }
    
    if (this.proxyManager) {
      this.proxyManager.destroy();
    }
    
    if (this.puppeteerConfig) {
      await this.puppeteerConfig.cleanup();
    }
    
    logger.scraper('AdvancedProxySystem destroyed');
  }
}

module.exports = {
  AdvancedProxySystem,
  ProxyManager,
  AntiDetectionModule,
  StealthConfig,
  HumanBehavior,
  ProxyMonitor,
  MonitoringDashboard,
  PuppeteerConfig
};
