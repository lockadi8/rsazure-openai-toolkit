const { Cluster } = require('puppeteer-cluster');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');

const config = require('../../../config');
const logger = require('../../utils/logger');
const StealthConfig = require('./utils/StealthConfig');
const ProxyManager = require('./utils/ProxyManager');

// Configure puppeteer-extra
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

/**
 * Cluster Manager untuk advanced puppeteer-cluster integration
 * Menangani load balancing, resource monitoring, dan task distribution
 */
class ClusterManager {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || config.scraper.concurrent || 5,
      maxConcurrency: options.maxConcurrency || 10,
      timeout: options.timeout || config.scraper.timeout || 30000,
      retryLimit: options.retryLimit || config.scraper.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      monitor: options.monitor !== false,
      sameDomainDelay: options.sameDomainDelay || 2000,
      workerCreationDelay: options.workerCreationDelay || 100,
      ...options,
    };

    this.cluster = null;
    this.isInitialized = false;
    this.stealthConfig = new StealthConfig();
    this.proxyManager = new ProxyManager();

    // Monitoring data
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeWorkers: 0,
      queueSize: 0,
      startTime: null,
      lastTaskTime: null,
    };

    this.workerStats = new Map();
    this.domainStats = new Map();
    this.errorStats = new Map();

    // Task queue management
    this.taskQueue = [];
    this.priorityQueue = [];
    this.runningTasks = new Set();

    // Resource monitoring
    this.resourceMonitor = {
      memoryUsage: [],
      cpuUsage: [],
      networkStats: [],
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize cluster with advanced configuration
   */
  async initialize() {
    try {
      logger.scraper('Initializing ClusterManager...');

      this.stats.startTime = new Date();

      // Initialize proxy manager if enabled
      if (this.options.useProxy && this.options.proxies) {
        this.proxyManager.addProxies(this.options.proxies);
        await this.proxyManager.testAllProxies();
      }

      // Create cluster with advanced options
      this.cluster = await Cluster.launch({
        concurrency: this.determineConcurrencyType(),
        maxConcurrency: this.options.maxConcurrency,
        puppeteerOptions: this.getBrowserOptions(),
        timeout: this.options.timeout,
        retryLimit: this.options.retryLimit,
        retryDelay: this.options.retryDelay,
        skipDuplicateUrls: this.options.skipDuplicateUrls || true,
        sameDomainDelay: this.options.sameDomainDelay,
        workerCreationDelay: this.options.workerCreationDelay,
        monitor: this.options.monitor,
      });

      // Setup cluster event handlers
      this.setupClusterEventHandlers();

      // Setup task handler
      await this.cluster.task(async ({ page, data }) => {
        return await this.executeTask(page, data);
      });

      // Start monitoring if enabled
      if (this.options.monitor) {
        this.startResourceMonitoring();
      }

      this.isInitialized = true;
      logger.scraper('ClusterManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ClusterManager:', error);
      throw error;
    }
  }

  /**
   * Determine optimal concurrency type based on system resources
   */
  determineConcurrencyType() {
    const totalMemory = require('os').totalmem();
    const availableMemory = require('os').freemem();
    const cpuCount = require('os').cpus().length;

    // Use CONTEXT concurrency for better resource management
    if (totalMemory > 8 * 1024 * 1024 * 1024) {
      // > 8GB RAM
      return Cluster.CONCURRENCY_CONTEXT;
    } else if (totalMemory > 4 * 1024 * 1024 * 1024) {
      // > 4GB RAM
      return Cluster.CONCURRENCY_PAGE;
    } else {
      return Cluster.CONCURRENCY_BROWSER;
    }
  }

  /**
   * Get optimized browser options
   */
  getBrowserOptions() {
    const baseOptions = this.stealthConfig.getBrowserLaunchOptions();

    // Add performance optimizations
    const optimizedArgs = [
      ...baseOptions.args,
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-client-side-phishing-detection',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--enable-automation',
      '--password-store=basic',
      '--use-mock-keychain',
    ];

    // Add proxy configuration if enabled
    if (this.options.useProxy) {
      const proxy = this.proxyManager.getNextProxy();
      if (proxy) {
        const proxyConfig = this.proxyManager.getPuppeteerProxyConfig(proxy);
        optimizedArgs.push(...proxyConfig.args);
      }
    }

    return {
      ...baseOptions,
      args: optimizedArgs,
    };
  }

  /**
   * Setup cluster event handlers
   */
  setupClusterEventHandlers() {
    this.cluster.on('taskerror', (err, data, willRetry) => {
      this.handleTaskError(err, data, willRetry);
    });

    this.cluster.on('queue', data => {
      this.handleTaskQueued(data);
    });

    this.cluster.on('taskstart', data => {
      this.handleTaskStart(data);
    });

    this.cluster.on('taskdone', data => {
      this.handleTaskDone(data);
    });

    this.cluster.on('workercreated', () => {
      this.handleWorkerCreated();
    });

    this.cluster.on('workerdestroyed', () => {
      this.handleWorkerDestroyed();
    });
  }

  /**
   * Execute task with advanced error handling and monitoring
   */
  async executeTask(page, data) {
    const taskId = data.taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Setup page with stealth configuration
      await this.setupPage(page, data);

      // Add task to running tasks
      this.runningTasks.add(taskId);

      // Execute the actual task
      const result = await this.handleTaskExecution(page, data);

      // Update statistics
      this.updateTaskStats(data.url, Date.now() - startTime, true);

      return {
        ...result,
        taskId,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Update error statistics
      this.updateTaskStats(data.url, Date.now() - startTime, false, error);
      throw error;
    } finally {
      // Remove from running tasks
      this.runningTasks.delete(taskId);
      this.stats.lastTaskTime = new Date();
    }
  }

  /**
   * Setup page with advanced stealth configuration
   */
  async setupPage(page, data) {
    try {
      // Apply stealth configuration
      const pageOptions = await this.stealthConfig.getPageOptions(page);

      // Set up request interception with advanced filtering
      await page.setRequestInterception(true);
      page.on('request', request => {
        this.handleRequest(request, data);
      });

      // Set up response monitoring
      page.on('response', response => {
        this.handleResponse(response, data);
      });

      // Set up console monitoring
      page.on('console', msg => {
        this.handleConsoleMessage(msg, data);
      });

      // Set up error monitoring
      page.on('pageerror', error => {
        this.handlePageError(error, data);
      });

      return pageOptions;
    } catch (error) {
      logger.error('Failed to setup page:', error);
      throw error;
    }
  }

  /**
   * Handle request interception with smart filtering
   */
  handleRequest(request, data) {
    const resourceType = request.resourceType();
    const url = request.url();

    // Block unnecessary resources based on task type
    const blockedResources = this.getBlockedResources(data.taskType);

    if (blockedResources.includes(resourceType)) {
      request.abort();
      return;
    }

    // Add custom headers
    const headers = {
      ...request.headers(),
      Accept: this.getAcceptHeader(resourceType),
      'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    };

    request.continue({ headers });
  }

  /**
   * Get blocked resources based on task type
   */
  getBlockedResources(taskType) {
    const baseBlocked = ['font', 'media'];

    switch (taskType) {
      case 'product':
        return [...baseBlocked, 'stylesheet']; // Keep images for product scraping
      case 'shop-info':
        return [...baseBlocked, 'image', 'stylesheet'];
      case 'order-history':
        return [...baseBlocked, 'image', 'stylesheet'];
      default:
        return [...baseBlocked, 'image', 'stylesheet'];
    }
  }

  /**
   * Get appropriate Accept header for resource type
   */
  getAcceptHeader(resourceType) {
    switch (resourceType) {
      case 'document':
        return 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
      case 'script':
        return 'application/javascript, application/ecmascript, text/javascript, text/ecmascript, */*;q=0.01';
      case 'stylesheet':
        return 'text/css,*/*;q=0.1';
      case 'image':
        return 'image/webp,image/apng,image/*,*/*;q=0.8';
      default:
        return '*/*';
    }
  }

  /**
   * Handle task execution based on type
   */
  async handleTaskExecution(page, data) {
    const { taskType, handler } = data;

    if (handler && typeof handler === 'function') {
      return await handler(page, data);
    }

    // Default task execution
    await page.goto(data.url, {
      waitUntil: 'networkidle0',
      timeout: this.options.timeout,
    });

    return {
      url: data.url,
      taskType,
      success: true,
    };
  }

  /**
   * Add task to cluster with priority support
   */
  async addTask(taskData, priority = 0) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const task = {
      ...taskData,
      taskId: taskData.taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      priority,
      addedAt: new Date().toISOString(),
    };

    this.stats.totalTasks++;

    if (priority > 0) {
      this.priorityQueue.push(task);
      this.priorityQueue.sort((a, b) => b.priority - a.priority);
    } else {
      this.taskQueue.push(task);
    }

    return await this.cluster.queue(task);
  }

  /**
   * Add multiple tasks with load balancing
   */
  async addTasks(tasks, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { batchSize = 10, delay = 100 } = options;
    const results = [];

    // Process tasks in batches to prevent overwhelming
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      const batchPromises = batch.map(task => this.addTask(task));
      const batchResults = await Promise.allSettled(batchPromises);

      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < tasks.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Wait for all tasks to complete with timeout
   */
  async waitForCompletion(timeout = 300000) {
    if (!this.cluster) return;

    const startTime = Date.now();

    while (this.runningTasks.size > 0 || this.taskQueue.length > 0) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Cluster completion timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await this.cluster.idle();
  }

  /**
   * Start resource monitoring
   */
  startResourceMonitoring() {
    const monitorInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, 30000); // Every 30 seconds

    // Store interval for cleanup
    this.monitorInterval = monitorInterval;
  }

  /**
   * Collect resource metrics
   */
  collectResourceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.resourceMonitor.memoryUsage.push({
      timestamp: new Date().toISOString(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    });

    this.resourceMonitor.cpuUsage.push({
      timestamp: new Date().toISOString(),
      user: cpuUsage.user,
      system: cpuUsage.system,
    });

    // Keep only last 100 entries
    if (this.resourceMonitor.memoryUsage.length > 100) {
      this.resourceMonitor.memoryUsage = this.resourceMonitor.memoryUsage.slice(-100);
    }

    if (this.resourceMonitor.cpuUsage.length > 100) {
      this.resourceMonitor.cpuUsage = this.resourceMonitor.cpuUsage.slice(-100);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    const runtime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;

    return {
      cluster: {
        ...this.stats,
        runtime,
        successRate:
          this.stats.totalTasks > 0 ? ((this.stats.completedTasks / this.stats.totalTasks) * 100).toFixed(2) : 0,
        tasksPerMinute: runtime > 0 ? (this.stats.completedTasks / (runtime / 60000)).toFixed(2) : 0,
        queueSize: this.taskQueue.length + this.priorityQueue.length,
        runningTasks: this.runningTasks.size,
      },
      workers: Array.from(this.workerStats.entries()).map(([id, stats]) => ({
        id,
        ...stats,
      })),
      domains: Array.from(this.domainStats.entries()).map(([domain, stats]) => ({
        domain,
        ...stats,
      })),
      errors: Array.from(this.errorStats.entries()).map(([error, count]) => ({
        error,
        count,
      })),
      resources: {
        memory: this.resourceMonitor.memoryUsage.slice(-10),
        cpu: this.resourceMonitor.cpuUsage.slice(-10),
      },
    };
  }

  /**
   * Event handlers
   */
  setupEventHandlers() {
    // Handle process signals
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  handleTaskError(err, data, willRetry) {
    this.stats.failedTasks++;

    const errorKey = err.message.substring(0, 100);
    this.errorStats.set(errorKey, (this.errorStats.get(errorKey) || 0) + 1);

    logger.error('Cluster task error:', {
      error: err.message,
      url: data.url,
      willRetry,
    });
  }

  handleTaskQueued(data) {
    this.stats.queueSize++;
  }

  handleTaskStart(data) {
    this.stats.queueSize--;
  }

  handleTaskDone(data) {
    this.stats.completedTasks++;
  }

  handleWorkerCreated() {
    this.stats.activeWorkers++;
  }

  handleWorkerDestroyed() {
    this.stats.activeWorkers--;
  }

  handleResponse(response, data) {
    const status = response.status();
    const url = response.url();

    if (status >= 400) {
      logger.scraper(`HTTP ${status} response for: ${url}`);
    }
  }

  handleConsoleMessage(msg, data) {
    if (msg.type() === 'error') {
      logger.scraper(`Page console error: ${msg.text()}`);
    }
  }

  handlePageError(error, data) {
    logger.error('Page error:', error);
  }

  /**
   * Update task statistics
   */
  updateTaskStats(url, executionTime, success, error = null) {
    try {
      const domain = new URL(url).hostname;

      if (!this.domainStats.has(domain)) {
        this.domainStats.set(domain, {
          requests: 0,
          successes: 0,
          failures: 0,
          avgExecutionTime: 0,
        });
      }

      const domainStats = this.domainStats.get(domain);
      domainStats.requests++;

      if (success) {
        domainStats.successes++;
      } else {
        domainStats.failures++;
      }

      // Update average execution time
      domainStats.avgExecutionTime =
        (domainStats.avgExecutionTime * (domainStats.requests - 1) + executionTime) / domainStats.requests;
    } catch (err) {
      logger.error('Failed to update task stats:', err);
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    logger.scraper('Initiating graceful shutdown...');

    try {
      // Stop accepting new tasks
      this.taskQueue = [];
      this.priorityQueue = [];

      // Wait for running tasks to complete (with timeout)
      await this.waitForCompletion(60000);

      // Close cluster
      await this.close();

      logger.scraper('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
    }
  }

  /**
   * Close cluster and cleanup resources
   */
  async close() {
    try {
      // Stop resource monitoring
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
      }

      // Close cluster
      if (this.cluster) {
        await this.cluster.close();
        this.cluster = null;
      }

      this.isInitialized = false;
      logger.scraper('ClusterManager closed successfully');
    } catch (error) {
      logger.error('Error closing ClusterManager:', error);
    }
  }
}

module.exports = ClusterManager;
