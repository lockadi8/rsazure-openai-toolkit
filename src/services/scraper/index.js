/**
 * Shopee Scraper System - Main Export
 * Core scraping engine dengan stealth mode dan anti-detection
 */

const BaseScraper = require('./BaseScraper');
const LoginHandler = require('./LoginHandler');
const ProductScraper = require('./ProductScraper');
const OrderScraper = require('./OrderScraper');
const ShopScraper = require('./ShopScraper');
const ClusterManager = require('./ClusterManager');

// Utils
const StealthConfig = require('./utils/StealthConfig');
const ProxyManager = require('./utils/ProxyManager');
const CookieManager = require('./utils/CookieManager');

/**
 * Shopee Scraper Factory
 * Menyediakan interface yang mudah untuk membuat scraper instances
 */
class ShopeeScraperFactory {
  constructor() {
    this.defaultOptions = {
      concurrent: 3,
      retryAttempts: 3,
      timeout: 30000,
      delayMin: 1000,
      delayMax: 3000,
      useProxy: false,
      useCookies: true,
      downloadImages: false,
      priceHistoryEnabled: false,
    };
  }

  /**
   * Create Product Scraper instance
   */
  createProductScraper(options = {}) {
    return new ProductScraper({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Create Login Handler instance
   */
  createLoginHandler(options = {}) {
    return new LoginHandler({
      ...this.defaultOptions,
      concurrent: 1, // Login should be sequential
      ...options,
    });
  }

  /**
   * Create Base Scraper instance
   */
  createBaseScraper(options = {}) {
    return new BaseScraper({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Create Order Scraper instance
   */
  createOrderScraper(options = {}) {
    return new OrderScraper({
      ...this.defaultOptions,
      concurrent: 1, // Order scraping should be sequential
      ...options,
    });
  }

  /**
   * Create Shop Scraper instance
   */
  createShopScraper(options = {}) {
    return new ShopScraper({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Create Cluster Manager instance
   */
  createClusterManager(options = {}) {
    return new ClusterManager({
      concurrency: this.defaultOptions.concurrent,
      timeout: this.defaultOptions.timeout,
      retryLimit: this.defaultOptions.retryAttempts,
      ...options,
    });
  }

  /**
   * Create complete scraper system with all components
   */
  createCompleteScraper(options = {}) {
    const loginHandler = this.createLoginHandler(options);
    const productScraper = this.createProductScraper(options);
    const orderScraper = this.createOrderScraper(options);
    const shopScraper = this.createShopScraper(options);
    const clusterManager = this.createClusterManager(options);

    return {
      loginHandler,
      productScraper,
      orderScraper,
      shopScraper,
      clusterManager,

      // Convenience methods
      async login(accountId, username, password) {
        return await loginHandler.loginWithCredentials(accountId, username, password);
      },

      async loginWithCookies(accountId) {
        return await loginHandler.loginWithCookies(accountId);
      },

      async scrapeProduct(productUrl, accountId) {
        return await productScraper.addTask({
          url: productUrl,
          taskType: 'product',
          accountId,
        });
      },

      async scrapeProducts(productUrls, accountId) {
        return await productScraper.bulkScrapeProducts(productUrls, accountId);
      },

      async scrapeShop(shopUrl, maxProducts, accountId) {
        return await productScraper.addTask({
          url: shopUrl,
          taskType: 'shop',
          maxProducts,
          accountId,
        });
      },

      async scrapeSearch(query, maxPages, filters, accountId) {
        const searchUrl = productScraper.buildSearchUrl(query, filters);
        return await productScraper.addTask({
          url: searchUrl,
          taskType: 'search',
          query,
          maxPages,
          filters,
          accountId,
        });
      },

      async scrapeOrderHistory(accountId, status, maxPages) {
        return await orderScraper.addTask({
          url: orderScraper.orderHistoryUrl,
          taskType: 'order-history',
          accountId,
          status,
          maxPages,
        });
      },

      async scrapeOrderDetail(orderId, accountId) {
        return await orderScraper.addTask({
          url: `${orderScraper.orderDetailBaseUrl}/${orderId}`,
          taskType: 'order-detail',
          orderId,
          accountId,
        });
      },

      async scrapeShopInfo(shopId, accountId) {
        return await shopScraper.addTask({
          url: `${shopScraper.shopBaseUrl}/${shopId}`,
          taskType: 'shop-info',
          shopId,
          accountId,
        });
      },

      async scrapeShopProducts(shopId, maxProducts, accountId) {
        return await shopScraper.addTask({
          url: `${shopScraper.shopBaseUrl}/${shopId}`,
          taskType: 'shop-products',
          shopId,
          maxProducts,
          accountId,
        });
      },

      async close() {
        await loginHandler.close();
        await productScraper.close();
        await orderScraper.close();
        await shopScraper.close();
        await clusterManager.close();
      },

      getStats() {
        return {
          login: loginHandler.getStats(),
          product: productScraper.getStats(),
          order: orderScraper.getStats(),
          shop: shopScraper.getStats(),
          cluster: clusterManager.getStats(),
        };
      },
    };
  }
}

/**
 * Quick start functions untuk penggunaan yang mudah
 */
const QuickStart = {
  /**
   * Quick product scraping
   */
  async scrapeProduct(productUrl, options = {}) {
    const scraper = new ProductScraper(options);
    try {
      await scraper.initialize();
      const result = await scraper.addTask({
        url: productUrl,
        taskType: 'product',
        accountId: options.accountId || 'default',
      });
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },

  /**
   * Quick bulk product scraping
   */
  async scrapeProducts(productUrls, options = {}) {
    const scraper = new ProductScraper(options);
    try {
      const result = await scraper.bulkScrapeProducts(
        productUrls,
        options.accountId || 'default'
      );
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },

  /**
   * Quick login
   */
  async login(username, password, accountId = 'default', options = {}) {
    const loginHandler = new LoginHandler(options);
    try {
      await loginHandler.initialize();
      const result = await loginHandler.loginWithCredentials(accountId, username, password);
      await loginHandler.close();
      return result;
    } catch (error) {
      await loginHandler.close();
      throw error;
    }
  },

  /**
   * Quick search scraping
   */
  async scrapeSearch(query, maxPages = 5, filters = {}, options = {}) {
    const scraper = new ProductScraper(options);
    try {
      await scraper.initialize();
      const searchUrl = scraper.buildSearchUrl(query, filters);
      const result = await scraper.addTask({
        url: searchUrl,
        taskType: 'search',
        query,
        maxPages,
        filters,
        accountId: options.accountId || 'default',
      });
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },

  /**
   * Quick order history scraping
   */
  async scrapeOrderHistory(accountId, status = 'ALL', maxPages = 10, options = {}) {
    const scraper = new OrderScraper(options);
    try {
      await scraper.initialize();
      const result = await scraper.addTask({
        url: scraper.orderHistoryUrl,
        taskType: 'order-history',
        accountId,
        status,
        maxPages,
      });
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },

  /**
   * Quick shop info scraping
   */
  async scrapeShopInfo(shopId, options = {}) {
    const scraper = new ShopScraper(options);
    try {
      await scraper.initialize();
      const result = await scraper.addTask({
        url: `${scraper.shopBaseUrl}/${shopId}`,
        taskType: 'shop-info',
        shopId,
        accountId: options.accountId || 'default',
      });
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },

  /**
   * Quick complete shop scraping
   */
  async scrapeCompleteShop(shopId, maxProducts = 100, maxReviews = 50, options = {}) {
    const scraper = new ShopScraper(options);
    try {
      await scraper.initialize();
      const result = await scraper.addTask({
        url: `${scraper.shopBaseUrl}/${shopId}`,
        taskType: 'shop-complete',
        shopId,
        maxProducts,
        maxReviews,
        accountId: options.accountId || 'default',
      });
      await scraper.close();
      return result;
    } catch (error) {
      await scraper.close();
      throw error;
    }
  },
};

/**
 * Utility functions
 */
const Utils = {
  StealthConfig,
  ProxyManager,
  CookieManager,

  /**
   * Create stealth configuration
   */
  createStealthConfig() {
    return new StealthConfig();
  },

  /**
   * Create proxy manager
   */
  createProxyManager() {
    return new ProxyManager();
  },

  /**
   * Create cookie manager
   */
  createCookieManager() {
    return new CookieManager();
  },

  /**
   * Validate Shopee URL
   */
  isValidShopeeUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('shopee.co.id');
    } catch {
      return false;
    }
  },

  /**
   * Extract product ID from URL
   * Expected URL structure: https://shopee.co.id/product/<shop_id>/<item_id>
   * or https://shopee.co.id/Anything-i.<shop_id>.<item_id>
   */
  extractProductId(url) {
    // Try the new structure first: /product/shopid/itemid
    let match = url.match(/product\/\d+\/(\d+)/);
    if (match) {
      return match[1];
    }
    // Fallback to the old structure: -i.shopid.itemid
    match = url.match(/-i\.\d+\.(\d+)/);
    return match ? match[1] : null;
  },

  /**
   * Extract shop ID from URL
   * Expected URL structure: https://shopee.co.id/shop/<shop_id>
   * or https://shopee.co.id/Anything-i.<shop_id>.<item_id>
   */
  extractShopId(url) {
    // Try the /shop/shopid structure
    let match = url.match(/shop\/(\d+)/);
    if (match) {
      return match[1];
    }
    // Fallback to the -i.shopid.itemid structure
    match = url.match(/-i\.(\d+)\.\d+/);
    return match ? match[1] : null;
  },

  /**
   * Build product URL from ID
   */
  buildProductUrl(productId, shopId) {
    return `https://shopee.co.id/product/${shopId}/${productId}`;
  },

  /**
   * Build shop URL from ID
   */
  buildShopUrl(shopId) {
    return `https://shopee.co.id/shop/${shopId}`;
  },
};

// Export everything
module.exports = {
  // Main classes
  BaseScraper,
  LoginHandler,
  ProductScraper,
  OrderScraper,
  ShopScraper,
  ClusterManager,

  // Utils
  StealthConfig,
  ProxyManager,
  CookieManager,

  // Factory
  ShopeeScraperFactory,

  // Quick start functions
  QuickStart,

  // Utilities
  Utils,

  // Default factory instance
  factory: new ShopeeScraperFactory(),
};

// Export individual classes for direct import
module.exports.default = module.exports;
