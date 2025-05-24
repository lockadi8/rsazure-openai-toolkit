const logger = require('../../utils/logger');

/**
 * Advanced Anti-Detection Module
 * Comprehensive browser fingerprint spoofing dan anti-detection techniques:
 * - User agent rotation dari database real browsers
 * - Viewport size randomization
 * - Timezone dan language spoofing
 * - WebRTC leak protection
 * - Canvas fingerprint randomization
 * - Font enumeration blocking
 * - Hardware concurrency spoofing
 * - Memory info spoofing
 */
class AntiDetectionModule {
  constructor(options = {}) {
    this.config = {
      enableCanvasFingerprinting: options.enableCanvasFingerprinting !== false,
      enableWebRTCProtection: options.enableWebRTCProtection !== false,
      enableFontBlocking: options.enableFontBlocking !== false,
      enableHardwareSpoof: options.enableHardwareSpoof !== false,
      enableMemorySpoof: options.enableMemorySpoof !== false,
      enableTimezoneSpoof: options.enableTimezoneSpoof !== false,
      enableLanguageSpoof: options.enableLanguageSpoof !== false,
      enablePluginSpoof: options.enablePluginSpoof !== false,
      ...options
    };

    // Real browser user agents database
    this.userAgents = [
      // Chrome Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      
      // Chrome macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Firefox Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
      
      // Firefox macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
      
      // Safari macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      
      // Edge Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0'
    ];

    // Realistic viewport sizes
    this.viewports = [
      { width: 1920, height: 1080, deviceScaleFactor: 1 },
      { width: 1366, height: 768, deviceScaleFactor: 1 },
      { width: 1440, height: 900, deviceScaleFactor: 1 },
      { width: 1536, height: 864, deviceScaleFactor: 1 },
      { width: 1280, height: 720, deviceScaleFactor: 1 },
      { width: 1600, height: 900, deviceScaleFactor: 1 },
      { width: 1680, height: 1050, deviceScaleFactor: 1 },
      { width: 2560, height: 1440, deviceScaleFactor: 1 },
      { width: 1920, height: 1200, deviceScaleFactor: 1 },
      // High DPI displays
      { width: 1440, height: 900, deviceScaleFactor: 2 },
      { width: 1280, height: 800, deviceScaleFactor: 2 }
    ];

    // Language and locale combinations
    this.languages = [
      { lang: 'id-ID,id;q=0.9,en;q=0.8', locale: 'id-ID' },
      { lang: 'en-US,en;q=0.9', locale: 'en-US' },
      { lang: 'en-GB,en;q=0.9', locale: 'en-GB' },
      { lang: 'id,en-US;q=0.9,en;q=0.8', locale: 'id-ID' },
      { lang: 'id-ID,id;q=0.8,en-US;q=0.5,en;q=0.3', locale: 'id-ID' }
    ];

    // Timezone options
    this.timezones = [
      'Asia/Jakarta',
      'Asia/Makassar', 
      'Asia/Jayapura',
      'Asia/Singapore',
      'Asia/Kuala_Lumpur'
    ];

    // Hardware concurrency options (CPU cores)
    this.hardwareConcurrency = [2, 4, 6, 8, 12, 16];

    // Memory options (in GB)
    this.memoryOptions = [4, 8, 16, 32];

    logger.scraper('AntiDetectionModule initialized with advanced features');
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get random viewport
   */
  getRandomViewport() {
    return this.viewports[Math.floor(Math.random() * this.viewports.length)];
  }

  /**
   * Get random language configuration
   */
  getRandomLanguage() {
    return this.languages[Math.floor(Math.random() * this.languages.length)];
  }

  /**
   * Get random timezone
   */
  getRandomTimezone() {
    return this.timezones[Math.floor(Math.random() * this.timezones.length)];
  }

  /**
   * Get random hardware concurrency
   */
  getRandomHardwareConcurrency() {
    return this.hardwareConcurrency[Math.floor(Math.random() * this.hardwareConcurrency.length)];
  }

  /**
   * Get random memory info
   */
  getRandomMemoryInfo() {
    const memoryGB = this.memoryOptions[Math.floor(Math.random() * this.memoryOptions.length)];
    const memoryBytes = memoryGB * 1024 * 1024 * 1024;
    
    return {
      jsHeapSizeLimit: Math.floor(memoryBytes * 0.9),
      totalJSHeapSize: Math.floor(memoryBytes * 0.3),
      usedJSHeapSize: Math.floor(memoryBytes * 0.2)
    };
  }

  /**
   * Generate consistent browser profile
   */
  generateBrowserProfile() {
    const userAgent = this.getRandomUserAgent();
    const viewport = this.getRandomViewport();
    const language = this.getRandomLanguage();
    const timezone = this.getRandomTimezone();
    const hardwareConcurrency = this.getRandomHardwareConcurrency();
    const memoryInfo = this.getRandomMemoryInfo();

    // Extract browser info from user agent
    const isChrome = userAgent.includes('Chrome') && !userAgent.includes('Edg');
    const isFirefox = userAgent.includes('Firefox');
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const isEdge = userAgent.includes('Edg');

    return {
      userAgent,
      viewport,
      language,
      timezone,
      hardwareConcurrency,
      memoryInfo,
      browser: {
        isChrome,
        isFirefox,
        isSafari,
        isEdge
      }
    };
  }

  /**
   * Apply anti-detection to page
   */
  async applyAntiDetection(page, profile = null) {
    if (!profile) {
      profile = this.generateBrowserProfile();
    }

    try {
      // Set user agent
      await page.setUserAgent(profile.userAgent);

      // Set viewport
      await page.setViewport(profile.viewport);

      // Set language
      await page.setExtraHTTPHeaders({
        'Accept-Language': profile.language.lang
      });

      // Set timezone
      await page.emulateTimezone(profile.timezone);

      // Apply advanced anti-detection scripts
      await this.injectAntiDetectionScripts(page, profile);

      logger.scraper(`Anti-detection applied: ${profile.browser.isChrome ? 'Chrome' : profile.browser.isFirefox ? 'Firefox' : 'Other'} profile`);

      return profile;
    } catch (error) {
      logger.error('Failed to apply anti-detection:', error);
      throw error;
    }
  }

  /**
   * Inject advanced anti-detection scripts
   */
  async injectAntiDetectionScripts(page, profile) {
    await page.evaluateOnNewDocument((config, profile) => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Spoof hardware concurrency
      if (config.enableHardwareSpoof) {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => profile.hardwareConcurrency,
        });
      }

      // Spoof memory info
      if (config.enableMemorySpoof && performance.memory) {
        Object.defineProperty(performance, 'memory', {
          get: () => profile.memoryInfo,
        });
      }

      // Canvas fingerprint randomization
      if (config.enableCanvasFingerprinting) {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          const result = originalToDataURL.apply(this, args);
          // Add slight noise to canvas data
          return result.replace(/data:image\/png;base64,/, 'data:image/png;base64,' + Math.random().toString(36).substr(2, 5));
        };

        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
          const result = originalGetImageData.apply(this, args);
          // Add minimal noise to image data
          for (let i = 0; i < result.data.length; i += 4) {
            if (Math.random() < 0.001) {
              result.data[i] = Math.min(255, result.data[i] + Math.floor(Math.random() * 3) - 1);
            }
          }
          return result;
        };
      }

      // WebRTC leak protection
      if (config.enableWebRTCProtection) {
        const originalCreateDataChannel = RTCPeerConnection.prototype.createDataChannel;
        RTCPeerConnection.prototype.createDataChannel = function() {
          throw new Error('WebRTC is disabled');
        };
      }

      // Font enumeration blocking
      if (config.enableFontBlocking) {
        // Override font detection methods
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
        
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
          get: function() {
            if (this.style && this.style.fontFamily) {
              // Add slight randomization to font measurements
              return originalOffsetWidth.get.call(this) + (Math.random() - 0.5);
            }
            return originalOffsetWidth.get.call(this);
          }
        });
      }

      // Plugin spoofing
      if (config.enablePluginSpoof) {
        Object.defineProperty(navigator, 'plugins', {
          get: () => {
            const plugins = [];
            // Add common plugins
            plugins.push({
              name: 'Chrome PDF Plugin',
              filename: 'internal-pdf-viewer',
              description: 'Portable Document Format'
            });
            return plugins;
          }
        });
      }

      // Language spoofing
      if (config.enableLanguageSpoof) {
        Object.defineProperty(navigator, 'language', {
          get: () => profile.language.locale,
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => [profile.language.locale, 'en'],
        });
      }

      // Remove automation indicators
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      
    }, this.config, profile);
  }
}

module.exports = AntiDetectionModule;
