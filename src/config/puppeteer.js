const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const config = require('./index');
const logger = require('../utils/logger');

// Import our custom modules
const StealthConfig = require('../services/scraper/utils/StealthConfig');
const ProxyManager = require('../services/scraper/utils/ProxyManager');
const AntiDetectionModule = require('../services/antiDetection');
const HumanBehavior = require('../services/behavior/HumanBehavior');

/**
 * Enhanced Puppeteer Configuration dengan comprehensive stealth mode
 * Mengintegrasikan semua anti-detection modules dan human behavior simulation
 */
class PuppeteerConfig {
  constructor(options = {}) {
    this.options = {
      // Stealth options
      enableStealth: options.enableStealth !== false,
      enableAdblocker: options.enableAdblocker !== false,
      enableProxy: options.enableProxy || false,
      enableHumanBehavior: options.enableHumanBehavior !== false,
      
      // Performance options
      enableImages: options.enableImages || false,
      enableCSS: options.enableCSS !== false,
      enableJavaScript: options.enableJavaScript !== false,
      enableFonts: options.enableFonts || false,
      
      // Advanced options
      blockTrackers: options.blockTrackers !== false,
      blockAds: options.blockAds !== false,
      blockAnalytics: options.blockAnalytics !== false,
      
      ...options
    };

    // Initialize modules
    this.stealthConfig = new StealthConfig(this.options);
    this.proxyManager = new ProxyManager(this.options.proxy || {});
    this.antiDetection = new AntiDetectionModule(this.options.antiDetection || {});
    this.humanBehavior = new HumanBehavior(this.options.humanBehavior || {});

    // Configure puppeteer-extra plugins
    this.configurePuppeteerPlugins();

    logger.scraper('Enhanced PuppeteerConfig initialized');
  }

  /**
   * Configure puppeteer-extra plugins
   */
  configurePuppeteerPlugins() {
    if (this.options.enableStealth) {
      // Configure stealth plugin with advanced options
      const stealthPlugin = StealthPlugin();
      
      // Customize stealth plugin
      stealthPlugin.enabledEvasions.delete('user-agent-override');
      stealthPlugin.enabledEvasions.delete('navigator.languages');
      stealthPlugin.enabledEvasions.delete('navigator.permissions');
      
      puppeteer.use(stealthPlugin);
      logger.scraper('Stealth plugin configured');
    }

    if (this.options.enableAdblocker) {
      // Configure adblocker plugin
      puppeteer.use(AdblockerPlugin({
        blockTrackers: this.options.blockTrackers,
        blockTrackersAndAnnoyances: this.options.blockTrackers,
        useCache: true
      }));
      logger.scraper('Adblocker plugin configured');
    }
  }

  /**
   * Launch browser with enhanced configuration
   */
  async launchBrowser(options = {}) {
    try {
      // Generate browser profile
      const profile = this.stealthConfig.generateBrowserProfile();
      
      // Get proxy if enabled
      let proxy = null;
      if (this.options.enableProxy) {
        proxy = this.proxyManager.getNextProxy(options.proxyOptions || {});
      }

      // Prepare launch options
      const launchOptions = this.prepareLaunchOptions(profile, proxy, options);
      
      // Launch browser
      const browser = await puppeteer.launch(launchOptions);
      
      // Setup browser-level configurations
      await this.setupBrowser(browser, profile);
      
      logger.scraper(`Browser launched with profile: ${profile.browser.isChrome ? 'Chrome' : 'Other'}`);
      
      return { browser, profile, proxy };
    } catch (error) {
      logger.error('Failed to launch browser:', error);
      throw error;
    }
  }

  /**
   * Prepare launch options
   */
  prepareLaunchOptions(profile, proxy, options) {
    const baseOptions = this.stealthConfig.getBrowserLaunchOptions(profile);
    
    // Add proxy configuration
    if (proxy) {
      const proxyConfig = this.proxyManager.getPuppeteerProxyConfig(proxy);
      baseOptions.args.push(...proxyConfig.args);
    }

    // Performance optimizations
    if (!this.options.enableImages) {
      baseOptions.args.push('--disable-images');
    }
    
    if (!this.options.enableFonts) {
      baseOptions.args.push('--disable-remote-fonts');
    }

    // Merge with custom options
    return {
      ...baseOptions,
      ...options,
      args: [
        ...baseOptions.args,
        ...(options.args || [])
      ]
    };
  }

  /**
   * Setup browser-level configurations
   */
  async setupBrowser(browser, profile) {
    // Set default page configurations
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        const page = await target.page();
        if (page) {
          await this.setupPage(page, profile);
        }
      }
    });
  }

  /**
   * Setup page with comprehensive anti-detection
   */
  async setupPage(page, profile = null) {
    try {
      if (!profile) {
        profile = this.stealthConfig.generateBrowserProfile();
      }

      // Apply stealth configuration
      await this.stealthConfig.getPageOptions(page, profile);

      // Setup request interception for performance and stealth
      await this.setupRequestInterception(page);

      // Setup response monitoring
      await this.setupResponseMonitoring(page);

      // Setup console monitoring
      await this.setupConsoleMonitoring(page);

      // Setup error handling
      await this.setupErrorHandling(page);

      logger.scraper('Page setup completed with anti-detection measures');
      
      return profile;
    } catch (error) {
      logger.error('Failed to setup page:', error);
      throw error;
    }
  }

  /**
   * Setup advanced request interception
   */
  async setupRequestInterception(page) {
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Block unwanted resources for performance
      if (!this.options.enableImages && resourceType === 'image') {
        request.abort();
        return;
      }

      if (!this.options.enableFonts && resourceType === 'font') {
        request.abort();
        return;
      }

      if (!this.options.enableCSS && resourceType === 'stylesheet') {
        request.abort();
        return;
      }

      // Block tracking and analytics
      if (this.options.blockAnalytics) {
        const domain = new URL(url).hostname;
        const analyticsPatterns = [
          'google-analytics.com',
          'googletagmanager.com',
          'facebook.com/tr',
          'analytics.twitter.com',
          'mixpanel.com',
          'segment.com'
        ];

        if (analyticsPatterns.some(pattern => domain.includes(pattern))) {
          request.abort();
          return;
        }
      }

      // Continue with request
      request.continue();
    });
  }

  /**
   * Setup response monitoring
   */
  async setupResponseMonitoring(page) {
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();

      // Log suspicious responses
      if (status === 403 || status === 429) {
        logger.warn(`Suspicious response: ${status} for ${url}`);
      }

      // Monitor for bot detection
      if (response.headers()['x-robots-tag'] || 
          response.headers()['x-frame-options']) {
        logger.warn(`Potential bot detection headers detected for ${url}`);
      }
    });
  }

  /**
   * Setup console monitoring
   */
  async setupConsoleMonitoring(page) {
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      // Monitor for bot detection messages
      if (text.includes('webdriver') || 
          text.includes('automation') || 
          text.includes('bot detected')) {
        logger.warn(`Potential bot detection in console: ${text}`);
      }

      // Log errors and warnings
      if (type === 'error' || type === 'warning') {
        logger.debug(`Console ${type}: ${text}`);
      }
    });
  }

  /**
   * Setup error handling
   */
  async setupErrorHandling(page) {
    page.on('pageerror', (error) => {
      logger.error('Page error:', error.message);
    });

    page.on('requestfailed', (request) => {
      logger.warn(`Request failed: ${request.url()} - ${request.failure().errorText}`);
    });
  }

  /**
   * Create new page with full setup
   */
  async createPage(browser, options = {}) {
    const page = await browser.newPage();
    const profile = await this.setupPage(page, options.profile);
    
    return { page, profile };
  }

  /**
   * Navigate with human behavior simulation
   */
  async navigateWithBehavior(page, url, options = {}) {
    const {
      waitUntil = 'networkidle2',
      timeout = 30000,
      simulateReading = true
    } = options;

    try {
      // Pre-navigation delay
      await this.humanBehavior.navigationDelay();

      // Navigate
      await page.goto(url, { waitUntil, timeout });

      // Post-navigation behavior
      if (simulateReading) {
        await this.humanBehavior.simulateReadingTime(page);
      }

      // Random mouse movements
      await this.humanBehavior.randomMouseMovements(page, 2);

      logger.scraper(`Navigation completed: ${url}`);
    } catch (error) {
      logger.error(`Navigation failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.proxyManager) {
      this.proxyManager.destroy();
    }
    logger.scraper('PuppeteerConfig cleanup completed');
  }
}

module.exports = PuppeteerConfig;
