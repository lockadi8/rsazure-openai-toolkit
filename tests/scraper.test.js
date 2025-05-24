/**
 * Test Suite untuk Shopee Scraper System
 * Comprehensive testing untuk semua komponen scraper
 */

const {
  BaseScraper,
  LoginHandler,
  ProductScraper,
  OrderScraper,
  ShopScraper,
  ClusterManager,
  StealthConfig,
  ProxyManager,
  CookieManager,
  QuickStart,
  Utils,
} = require('../src/services/scraper');

describe('Shopee Scraper System', () => {

  describe('StealthConfig', () => {
    let stealthConfig;

    beforeEach(() => {
      stealthConfig = new StealthConfig();
    });

    test('should generate random user agent', () => {
      const userAgent = stealthConfig.getRandomUserAgent();
      expect(userAgent).toBeDefined();
      expect(typeof userAgent).toBe('string');
      expect(userAgent.length).toBeGreaterThan(0);
    });

    test('should generate random viewport', () => {
      const viewport = stealthConfig.getRandomViewport();
      expect(viewport).toBeDefined();
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
    });

    test('should generate random delay', () => {
      const delay = stealthConfig.getRandomDelay(1000, 3000);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(3000);
    });

    test('should get browser launch options', () => {
      const options = stealthConfig.getBrowserLaunchOptions();
      expect(options).toBeDefined();
      expect(options).toHaveProperty('headless');
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });
  });

  describe('ProxyManager', () => {
    let proxyManager;

    beforeEach(() => {
      proxyManager = new ProxyManager();
    });

    test('should add proxy correctly', () => {
      proxyManager.addProxy('http://proxy.example.com:8080');
      const stats = proxyManager.getStats();
      expect(stats.total).toBe(1);
    });

    test('should parse proxy string correctly', () => {
      const proxy = proxyManager.parseProxy('http://user:pass@proxy.example.com:8080');
      expect(proxy).toBeDefined();
      expect(proxy.protocol).toBe('http');
      expect(proxy.host).toBe('proxy.example.com');
      expect(proxy.port).toBe(8080);
      expect(proxy.username).toBe('user');
      expect(proxy.password).toBe('pass');
    });

    test('should handle invalid proxy format', () => {
      const proxy = proxyManager.parseProxy('invalid-proxy');
      expect(proxy).toBeNull();
    });

    test('should get next proxy with round-robin', () => {
      proxyManager.addProxy('http://proxy1.example.com:8080');
      proxyManager.addProxy('http://proxy2.example.com:8080');

      const proxy1 = proxyManager.getNextProxy();
      const proxy2 = proxyManager.getNextProxy();

      expect(proxy1.host).toBe('proxy1.example.com');
      expect(proxy2.host).toBe('proxy2.example.com');
    });

    test('should mark proxy as failed', () => {
      proxyManager.addProxy('http://proxy.example.com:8080');
      const proxy = proxyManager.getNextProxy();

      proxyManager.markProxyFailed(proxy.id);
      const stats = proxyManager.getStats();

      expect(stats.failed).toBe(1);
      expect(stats.working).toBe(0);
    });
  });

  describe('CookieManager', () => {
    let cookieManager;

    beforeEach(() => {
      cookieManager = new CookieManager();
    });

    afterEach(async () => {
      // Clean up test sessions
      await cookieManager.deleteSession('test-account');
    });

    test('should save and load cookies', async () => {
      const testCookies = [
        { name: 'session', value: 'test123', domain: '.shopee.co.id' },
        { name: 'user', value: 'testuser', domain: '.shopee.co.id' },
      ];

      const saved = await cookieManager.saveCookies('test-account', testCookies);
      expect(saved).toBe(true);

      const loaded = await cookieManager.loadCookies('test-account');
      expect(loaded).toBeDefined();
      expect(loaded.cookies).toEqual(testCookies);
    });

    test('should validate session correctly', () => {
      const validSession = {
        metadata: { savedAt: new Date().toISOString() }
      };
      const invalidSession = {
        metadata: { savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }
      };

      expect(cookieManager.isSessionValid(validSession)).toBe(true);
      expect(cookieManager.isSessionValid(invalidSession)).toBe(false);
    });

    test('should list sessions', async () => {
      const testCookies = [{ name: 'test', value: 'value', domain: '.shopee.co.id' }];
      await cookieManager.saveCookies('test-account', testCookies);

      const sessions = await cookieManager.listSessions();
      expect(Array.isArray(sessions)).toBe(true);

      const testSession = sessions.find(s => s.accountId === 'test-account');
      expect(testSession).toBeDefined();
    });
  });

  describe('BaseScraper', () => {
    let baseScraper;

    beforeEach(() => {
      baseScraper = new BaseScraper({
        concurrent: 1,
        timeout: 10000,
      });
    });

    afterEach(async () => {
      if (baseScraper.isInitialized) {
        await baseScraper.close();
      }
    });

    test('should initialize correctly', async () => {
      await baseScraper.initialize();
      expect(baseScraper.isInitialized).toBe(true);
      expect(baseScraper.cluster).toBeDefined();
    });

    test('should get browser options', () => {
      const options = baseScraper.getBrowserOptions();
      expect(options).toBeDefined();
      expect(options).toHaveProperty('headless');
      expect(options).toHaveProperty('args');
    });

    test('should track statistics', () => {
      const stats = baseScraper.getStats();
      expect(stats).toHaveProperty('requests');
      expect(stats).toHaveProperty('successes');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('retries');
    });

    test('should reset statistics', () => {
      baseScraper.stats.requests = 10;
      baseScraper.resetStats();
      expect(baseScraper.stats.requests).toBe(0);
    });
  });

  describe('LoginHandler', () => {
    let loginHandler;

    beforeEach(() => {
      loginHandler = new LoginHandler();
    });

    afterEach(async () => {
      if (loginHandler.isInitialized) {
        await loginHandler.close();
      }
    });

    test('should add account correctly', () => {
      loginHandler.addAccount('test-user', {
        username: 'testuser',
        password: 'testpass',
      });

      const account = loginHandler.getAccountStatus('test-user');
      expect(account).toBeDefined();
      expect(account.username).toBe('testuser');
      expect(account.isActive).toBe(false);
    });

    test('should check login attempts', () => {
      const canAttempt1 = loginHandler.canAttemptLogin('test-user');
      expect(canAttempt1).toBe(true);

      // Simulate failed attempts
      for (let i = 0; i < 3; i++) {
        loginHandler.incrementLoginAttempts('test-user');
      }

      const canAttempt2 = loginHandler.canAttemptLogin('test-user');
      expect(canAttempt2).toBe(false);
    });

    test('should reset login attempts', () => {
      loginHandler.incrementLoginAttempts('test-user');
      loginHandler.resetLoginAttempts('test-user');

      const canAttempt = loginHandler.canAttemptLogin('test-user');
      expect(canAttempt).toBe(true);
    });

    test('should update account status', () => {
      loginHandler.addAccount('test-user', { username: 'test', password: 'test' });
      loginHandler.updateAccountStatus('test-user', true);

      const account = loginHandler.getAccountStatus('test-user');
      expect(account.isActive).toBe(true);
      expect(account.lastLogin).toBeDefined();
    });
  });

  describe('ProductScraper', () => {
    let productScraper;

    beforeEach(() => {
      productScraper = new ProductScraper({
        concurrent: 1,
        timeout: 10000,
        downloadImages: false,
      });
    });

    afterEach(async () => {
      if (productScraper.isInitialized) {
        await productScraper.close();
      }
    });

    test('should build search URL correctly', () => {
      const url = productScraper.buildSearchUrl('laptop gaming', {
        minPrice: 5000000,
        maxPrice: 15000000,
        rating: 4,
      });

      expect(url).toContain('keyword=laptop%20gaming');
      expect(url).toContain('price_min=5000000');
      expect(url).toContain('price_max=15000000');
      expect(url).toContain('rating_filter=4');
    });

    test('should get image extension correctly', () => {
      const ext1 = productScraper.getImageExtension('https://example.com/image.jpg');
      const ext2 = productScraper.getImageExtension('https://example.com/image.png?v=1');
      const ext3 = productScraper.getImageExtension('https://example.com/image');

      expect(ext1).toBe('jpg');
      expect(ext2).toBe('png');
      expect(ext3).toBe('jpg'); // default
    });
  });

  describe('Utils', () => {
    test('should validate Shopee URL correctly', () => {
      const validUrl = 'https://shopee.co.id/search?keyword=gmail%20premium';
      const invalidUrl = 'https://tokopedia.com/product/123456';

      expect(Utils.isValidShopeeUrl(validUrl)).toBe(true);
      expect(Utils.isValidShopeeUrl(invalidUrl)).toBe(false);
    });

    test('should extract product ID correctly', () => {
      const url = 'https://shopee.co.id/product/123456/789012';
      const productId = Utils.extractProductId(url);
      expect(productId).toBe('789012');
    });

    test('should extract shop ID correctly', () => {
      const url = 'https://shopee.co.id/shop/123456';
      const shopId = Utils.extractShopId(url);
      expect(shopId).toBe('123456');
    });

    test('should build product URL correctly', () => {
      const url = Utils.buildProductUrl('789012', '123456');
      expect(url).toBe('https://shopee.co.id/product/123456/789012');
    });

    test('should build shop URL correctly', () => {
      const url = Utils.buildShopUrl('123456');
      expect(url).toBe('https://shopee.co.id/shop/123456');
    });
  });

  describe('OrderScraper', () => {
    let orderScraper;

    beforeEach(() => {
      orderScraper = new OrderScraper({
        concurrent: 1,
        timeout: 10000,
      });
    });

    afterEach(async () => {
      if (orderScraper.isInitialized) {
        await orderScraper.close();
      }
    });

    test('should build order history URL correctly', () => {
      const url1 = orderScraper.buildOrderHistoryUrl('ALL', 1);
      const url2 = orderScraper.buildOrderHistoryUrl('TO_PAY', 2);

      expect(url1).toContain('page=1');
      expect(url2).toContain('type=TO_PAY');
      expect(url2).toContain('page=2');
    });

    test('should have correct order statuses', () => {
      expect(orderScraper.orderStatuses).toHaveProperty('TO_PAY');
      expect(orderScraper.orderStatuses).toHaveProperty('COMPLETED');
      expect(orderScraper.orderStatuses['TO_PAY']).toBe('Menunggu Pembayaran');
    });
  });

  describe('ShopScraper', () => {
    let shopScraper;

    beforeEach(() => {
      shopScraper = new ShopScraper({
        concurrent: 2,
        timeout: 10000,
      });
    });

    afterEach(async () => {
      if (shopScraper.isInitialized) {
        await shopScraper.close();
      }
    });

    test('should extract shop ID from URL correctly', () => {
      const shopId1 = shopScraper.extractShopIdFromUrl('https://shopee.co.id/shop/123456');
      const shopId2 = shopScraper.extractShopIdFromUrl('https://shopee.co.id/shop/789012/products');

      expect(shopId1).toBe('123456');
      expect(shopId2).toBe('789012');
    });

    test('should have correct configuration', () => {
      expect(shopScraper.shopBaseUrl).toBe('https://shopee.co.id/shop');
      expect(shopScraper.maxProductsPerPage).toBe(30);
      expect(shopScraper.maxReviewsPerPage).toBe(20);
    });
  });

  describe('ClusterManager', () => {
    let clusterManager;

    beforeEach(() => {
      clusterManager = new ClusterManager({
        concurrency: 2,
        maxConcurrency: 5,
        timeout: 10000,
        monitor: false, // Disable monitoring for tests
      });
    });

    afterEach(async () => {
      if (clusterManager.isInitialized) {
        await clusterManager.close();
      }
    });

    test('should determine concurrency type correctly', () => {
      const concurrencyType = clusterManager.determineConcurrencyType();
      expect(concurrencyType).toBeDefined();
    });

    test('should get browser options correctly', () => {
      const options = clusterManager.getBrowserOptions();
      expect(options).toBeDefined();
      expect(options).toHaveProperty('args');
      expect(Array.isArray(options.args)).toBe(true);
    });

    test('should get blocked resources based on task type', () => {
      const productBlocked = clusterManager.getBlockedResources('product');
      const shopBlocked = clusterManager.getBlockedResources('shop-info');

      expect(Array.isArray(productBlocked)).toBe(true);
      expect(Array.isArray(shopBlocked)).toBe(true);
      expect(productBlocked).toContain('font');
      expect(shopBlocked).toContain('image');
    });

    test('should get appropriate Accept header', () => {
      const documentHeader = clusterManager.getAcceptHeader('document');
      const scriptHeader = clusterManager.getAcceptHeader('script');

      expect(documentHeader).toContain('text/html');
      expect(scriptHeader).toContain('application/javascript');
    });

    test('should track statistics correctly', () => {
      const stats = clusterManager.getStats();
      expect(stats).toHaveProperty('cluster');
      expect(stats).toHaveProperty('workers');
      expect(stats).toHaveProperty('domains');
      expect(stats).toHaveProperty('errors');
    });
  });

  describe('Integration Tests', () => {
    test('should create scraper instances correctly', () => {
      const stealthConfig = Utils.createStealthConfig();
      const proxyManager = Utils.createProxyManager();
      const cookieManager = Utils.createCookieManager();

      expect(stealthConfig).toBeInstanceOf(StealthConfig);
      expect(proxyManager).toBeInstanceOf(ProxyManager);
      expect(cookieManager).toBeInstanceOf(CookieManager);
    });

    test('should create all scraper types from factory', () => {
      const { factory } = require('../src/services/scraper');

      const productScraper = factory.createProductScraper();
      const orderScraper = factory.createOrderScraper();
      const shopScraper = factory.createShopScraper();
      const clusterManager = factory.createClusterManager();

      expect(productScraper).toBeInstanceOf(ProductScraper);
      expect(orderScraper).toBeInstanceOf(OrderScraper);
      expect(shopScraper).toBeInstanceOf(ShopScraper);
      expect(clusterManager).toBeInstanceOf(ClusterManager);
    });

    test('should create complete scraper system', () => {
      const { factory } = require('../src/services/scraper');

      const completeScraper = factory.createCompleteScraper();

      expect(completeScraper).toHaveProperty('loginHandler');
      expect(completeScraper).toHaveProperty('productScraper');
      expect(completeScraper).toHaveProperty('orderScraper');
      expect(completeScraper).toHaveProperty('shopScraper');
      expect(completeScraper).toHaveProperty('clusterManager');
      expect(completeScraper).toHaveProperty('login');
      expect(completeScraper).toHaveProperty('scrapeProduct');
      expect(completeScraper).toHaveProperty('scrapeOrderHistory');
      expect(completeScraper).toHaveProperty('scrapeShopInfo');
    });

    // Note: Actual scraping tests would require a test environment
    // and should be run separately as integration tests
    test.skip('should scrape product successfully', async () => {
      const result = await QuickStart.scrapeProduct(
        'https://shopee.co.id/product/123456/789012',
        { timeout: 15000 }
      );

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.price).toBeDefined();
    });

    test.skip('should scrape order history successfully', async () => {
      const result = await QuickStart.scrapeOrderHistory(
        'test-account',
        'ALL',
        5
      );

      expect(result).toBeDefined();
      expect(result.accountId).toBe('test-account');
      expect(result.orders).toBeDefined();
    });

    test.skip('should scrape shop info successfully', async () => {
      const result = await QuickStart.scrapeShopInfo('123456');

      expect(result).toBeDefined();
      expect(result.shopId).toBe('123456');
      expect(result.info).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid URLs gracefully', async () => {
      const productScraper = new ProductScraper({ timeout: 5000 });

      try {
        await productScraper.initialize();
        await productScraper.addTask({
          url: 'invalid-url',
          taskType: 'product',
          accountId: 'test',
        });
      } catch (error) {
        expect(error).toBeDefined();
      } finally {
        await productScraper.close();
      }
    });

    test('should handle network timeouts', async () => {
      const scraper = new BaseScraper({ timeout: 1 }); // Very short timeout

      try {
        await scraper.initialize();
        // This should timeout quickly
        await scraper.addTask({
          url: 'https://httpbin.org/delay/10',
          taskType: 'test',
        });
      } catch (error) {
        expect(error.message).toContain('timeout');
      } finally {
        await scraper.close();
      }
    });
  });
});

// Mock implementations for testing
class MockPage {
  constructor() {
    this.cookies = [];
    this.userAgent = 'test-agent';
    this.viewport = { width: 1920, height: 1080 };
  }

  async setUserAgent(userAgent) {
    this.userAgent = userAgent;
  }

  async setViewport(viewport) {
    this.viewport = viewport;
  }

  async setCookie(...cookies) {
    this.cookies.push(...cookies);
  }

  async cookies() {
    return this.cookies;
  }

  async evaluate(fn) {
    return fn();
  }

  async goto(url, options) {
    return { url };
  }

  async waitForSelector(selector, options) {
    return {};
  }

  async $(selector) {
    return {};
  }

  async click(selector) {
    return;
  }

  async type(selector, text, options) {
    return;
  }
}

module.exports = {
  MockPage,
};
