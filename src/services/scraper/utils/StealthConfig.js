const config = require('../../../../config');
const logger = require('../../../utils/logger');
const AntiDetectionModule = require('../../antiDetection');

/**
 * Enhanced Stealth Configuration dengan advanced anti-detection
 * Mengintegrasikan AntiDetectionModule untuk comprehensive stealth mode
 */
class StealthConfig {
  constructor(options = {}) {
    this.antiDetection = new AntiDetectionModule(options);

    // Advanced browser arguments untuk maximum stealth
    this.stealthArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-domain-reliability',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--disable-logging',
      '--aggressive-cache-discard',
      '--disable-restore-session-state',
    ];

    // Resource blocking patterns
    this.blockedResourceTypes = ['image', 'media', 'font', 'texttrack', 'object', 'beacon', 'csp_report', 'imageset'];

    this.blockedDomains = [
      'googlesyndication.com',
      'googletagmanager.com',
      'google-analytics.com',
      'googleadservices.com',
      'doubleclick.net',
      'facebook.com',
      'connect.facebook.net',
      'twitter.com',
      'analytics.twitter.com',
      'ads.yahoo.com',
      'amazon-adsystem.com',
      'adsystem.amazon.com',
    ];

    logger.scraper('Enhanced StealthConfig initialized with AntiDetectionModule');
  }

  /**
   * Generate random user agent (delegated to AntiDetectionModule)
   */
  getRandomUserAgent() {
    return this.antiDetection.getRandomUserAgent();
  }

  /**
   * Generate random viewport (delegated to AntiDetectionModule)
   */
  getRandomViewport() {
    return this.antiDetection.getRandomViewport();
  }

  /**
   * Generate random language (delegated to AntiDetectionModule)
   */
  getRandomLanguage() {
    return this.antiDetection.getRandomLanguage();
  }

  /**
   * Generate random timezone (delegated to AntiDetectionModule)
   */
  getRandomTimezone() {
    return this.antiDetection.getRandomTimezone();
  }

  /**
   * Generate comprehensive browser profile
   */
  generateBrowserProfile() {
    return this.antiDetection.generateBrowserProfile();
  }

  /**
   * Get enhanced stealth browser launch options
   */
  getBrowserLaunchOptions(profile = null) {
    if (!profile) {
      profile = this.generateBrowserProfile();
    }

    return {
      headless: config.puppeteer?.headless !== false ? 'new' : false,
      args: [
        ...this.stealthArgs,
        `--user-agent=${profile.userAgent}`,
        `--window-size=${profile.viewport.width},${profile.viewport.height}`,
        ...(config.puppeteer?.args || []),
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
      ignoreHTTPSErrors: true,
      defaultViewport: profile.viewport,
      devtools: false,
      executablePath: config.puppeteer?.executablePath || undefined,
    };
  }

  /**
   * Setup advanced request interception
   */
  async setupRequestInterception(page) {
    await page.setRequestInterception(true);

    page.on('request', request => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Block unwanted resource types
      if (this.blockedResourceTypes.includes(resourceType)) {
        request.abort();
        return;
      }

      // Block tracking domains
      const domain = new URL(url).hostname;
      if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
        request.abort();
        return;
      }

      // Continue with request
      request.continue();
    });
  }

  /**
   * Get enhanced stealth page options with comprehensive anti-detection
   */
  async getPageOptions(page, profile = null) {
    if (!profile) {
      profile = this.generateBrowserProfile();
    }

    // Apply comprehensive anti-detection
    const appliedProfile = await this.antiDetection.applyAntiDetection(page, profile);

    // Setup request interception
    await this.setupRequestInterception(page);

    // Additional stealth measures
    await page.evaluateOnNewDocument(() => {
      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = parameters =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters);

      // Override chrome property
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // Hide automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_JSON;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Object;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
    });

    return appliedProfile;
  }

  /**
   * Generate random delay between actions
   */
  getRandomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate human-like typing delay
   */
  getTypingDelay() {
    return Math.floor(Math.random() * 100) + 50;
  }

  /**
   * Generate mouse movement delay
   */
  getMouseDelay() {
    return Math.floor(Math.random() * 200) + 100;
  }

  /**
   * Simulate human-like scrolling
   */
  async humanScroll(page, distance = 300) {
    const scrollSteps = Math.floor(distance / 50);
    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, 50);
      });
      await page.waitForTimeout(this.getRandomDelay(50, 150));
    }
  }

  /**
   * Simulate human-like typing
   */
  async humanType(page, selector, text) {
    await page.click(selector);
    await page.waitForTimeout(this.getRandomDelay(100, 300));

    for (const char of text) {
      await page.type(selector, char, { delay: this.getTypingDelay() });
    }
  }

  /**
   * Simulate human-like click
   */
  async humanClick(page, selector) {
    await page.hover(selector);
    await page.waitForTimeout(this.getMouseDelay());
    await page.click(selector);
    await page.waitForTimeout(this.getRandomDelay(200, 500));
  }

  /**
   * Wait for random time to simulate human behavior
   */
  async randomWait(min = 1000, max = 3000) {
    const delay = this.getRandomDelay(min, max);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = StealthConfig;
