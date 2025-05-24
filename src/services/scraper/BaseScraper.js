const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { Cluster } = require('puppeteer-cluster');

const config = require('../../../config');
const logger = require('../../utils/logger');
const StealthConfig = require('./utils/StealthConfig');
const ProxyManager = require('./utils/ProxyManager');
const CookieManager = require('./utils/CookieManager');

// Configure puppeteer-extra
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

/**
 * Base Scraper Class dengan stealth mode dan anti-detection
 * Menyediakan foundation untuk semua scraper operations
 */
class BaseScraper {
  constructor(options = {}) {
    this.options = {
      concurrent: options.concurrent || config.scraper.concurrent || 3,
      retryAttempts: options.retryAttempts || config.scraper.retryAttempts || 3,
      timeout: options.timeout || config.scraper.timeout || 30000,
      delay: {
        min: options.delayMin || config.scraper.delay.min || 1000,
        max: options.delayMax || config.scraper.delay.max || 3000,
      },
      useProxy: options.useProxy || false,
      useCookies: options.useCookies || true,
      ...options,
    };

    this.stealthConfig = new StealthConfig();
    this.proxyManager = new ProxyManager();
    this.cookieManager = new CookieManager();
    this.cluster = null;
    this.isInitialized = false;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      startTime: null,
    };
  }

  /**
   * Initialize scraper cluster
   */
  async initialize() {
    try {
      logger.scraper('Initializing BaseScraper...');

      this.stats.startTime = new Date();

      // Initialize proxy manager if enabled
      if (this.options.useProxy && this.options.proxies) {
        this.proxyManager.addProxies(this.options.proxies);
        await this.proxyManager.testAllProxies();
      }

      // Initialize cluster
      this.cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: this.options.concurrent,
        puppeteerOptions: this.getBrowserOptions(),
        timeout: this.options.timeout,
        retryLimit: this.options.retryAttempts,
        retryDelay: this.options.delay.min,
        skipDuplicateUrls: true,
        monitor: false,
      });

      // Set up cluster task handler
      await this.cluster.task(async ({ page, data }) => {
        return await this.executeTask(page, data);
      });

      // Set up error handling
      this.cluster.on('taskerror', (err, data) => {
        logger.error('Cluster task error:', err);
        this.stats.failures++;
      });

      this.isInitialized = true;
      logger.scraper('BaseScraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize BaseScraper:', error);
      throw error;
    }
  }

  /**
   * Get browser launch options with stealth configuration
   */
  getBrowserOptions() {
    const baseOptions = this.stealthConfig.getBrowserLaunchOptions();

    // Add proxy configuration if enabled
    if (this.options.useProxy) {
      const proxy = this.proxyManager.getNextProxy();
      if (proxy) {
        const proxyConfig = this.proxyManager.getPuppeteerProxyConfig(proxy);
        baseOptions.args.push(...proxyConfig.args);
      }
    }

    return baseOptions;
  }

  /**
   * Setup page with stealth configuration
   */
  async setupPage(page, accountId = null) {
    try {
      // Apply stealth configuration
      const pageOptions = await this.stealthConfig.getPageOptions(page);

      // Apply cookies if enabled and account provided
      if (this.options.useCookies && accountId) {
        await this.cookieManager.applyCookiesToPage(page, accountId);
      }

      // Set up request interception for additional stealth
      await page.setRequestInterception(true);
      page.on('request', request => {
        const resourceType = request.resourceType();

        // Block unnecessary resources to speed up scraping
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          // Add random headers
          const headers = {
            ...request.headers(),
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': pageOptions.language,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1',
          };

          request.continue({ headers });
        }
      });

      // Set up response handling
      page.on('response', response => {
        const status = response.status();
        if (status >= 400) {
          logger.scraper(`HTTP ${status} response for: ${response.url()}`);
        }
      });

      // Set up console logging
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logger.scraper(`Page console error: ${msg.text()}`);
        }
      });

      return pageOptions;
    } catch (error) {
      logger.error('Failed to setup page:', error);
      throw error;
    }
  }

  /**
   * Execute task with retry mechanism
   */
  async executeTask(page, data) {
    const { url, taskType, accountId, ...taskData } = data;
    let attempt = 0;
    let lastError = null;

    while (attempt < this.options.retryAttempts) {
      try {
        this.stats.requests++;

        // Setup page for this attempt
        await this.setupPage(page, accountId);

        // Add random delay before request
        await this.stealthConfig.randomWait(this.options.delay.min, this.options.delay.max);

        // Navigate to URL
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: this.options.timeout,
        });

        // Execute specific task
        const result = await this.handleTask(page, taskType, taskData);

        // Save cookies if enabled
        if (this.options.useCookies && accountId) {
          await this.cookieManager.extractAndSaveCookies(page, accountId);
        }

        this.stats.successes++;
        return result;
      } catch (error) {
        attempt++;
        lastError = error;
        this.stats.retries++;

        logger.error(`Task attempt ${attempt} failed:`, error);

        if (attempt < this.options.retryAttempts) {
          // Exponential backoff
          const delay = this.options.delay.min * Math.pow(2, attempt - 1);
          await this.stealthConfig.randomWait(delay, delay * 2);
        }
      }
    }

    this.stats.failures++;
    throw lastError;
  }

  /**
   * Handle specific task type - to be overridden by subclasses
   */
  async handleTask(page, taskType, taskData) {
    throw new Error('handleTask method must be implemented by subclass');
  }

  /**
   * Add task to cluster queue
   */
  async addTask(taskData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.cluster.queue(taskData);
  }

  /**
   * Add multiple tasks to cluster queue
   */
  async addTasks(tasks) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const promises = tasks.map(task => this.cluster.queue(task));
    return await Promise.allSettled(promises);
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion() {
    if (this.cluster) {
      await this.cluster.idle();
    }
  }

  /**
   * Close scraper and cleanup resources
   */
  async close() {
    try {
      if (this.cluster) {
        await this.cluster.close();
        this.cluster = null;
      }

      this.isInitialized = false;
      logger.scraper('BaseScraper closed successfully');
    } catch (error) {
      logger.error('Error closing BaseScraper:', error);
    }
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    const runtime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;

    return {
      ...this.stats,
      runtime,
      successRate: this.stats.requests > 0 ? ((this.stats.successes / this.stats.requests) * 100).toFixed(2) : 0,
      requestsPerMinute: runtime > 0 ? (this.stats.requests / (runtime / 60000)).toFixed(2) : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      retries: 0,
      startTime: new Date(),
    };
  }

  /**
   * Check if page has CAPTCHA
   */
  async hasCaptcha(page) {
    try {
      const captchaSelectors = [
        '.captcha',
        '#captcha',
        '[class*="captcha"]',
        '[id*="captcha"]',
        '.recaptcha',
        '#recaptcha',
        '[class*="recaptcha"]',
        'iframe[src*="recaptcha"]',
      ];

      for (const selector of captchaSelectors) {
        const element = await page.$(selector);
        if (element) {
          logger.scraper('CAPTCHA detected on page');
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error checking for CAPTCHA:', error);
      return false;
    }
  }

  /**
   * Handle CAPTCHA if present
   */
  async handleCaptcha(page) {
    try {
      const hasCaptcha = await this.hasCaptcha(page);
      if (hasCaptcha) {
        logger.scraper('CAPTCHA detected, waiting for manual resolution...');

        // Wait for CAPTCHA to be resolved (manual intervention required)
        await page.waitForFunction(
          () => !document.querySelector('.captcha, #captcha, .recaptcha, #recaptcha'),
          { timeout: 300000 } // 5 minutes timeout
        );

        logger.scraper('CAPTCHA resolved');
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error handling CAPTCHA:', error);
      throw new Error('CAPTCHA resolution failed');
    }
  }
}

module.exports = BaseScraper;
