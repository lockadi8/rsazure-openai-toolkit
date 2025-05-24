/**
 * Contoh Penggunaan Shopee Scraper System
 * Demonstrasi berbagai fitur dan use cases
 */

const {
  ProductScraper,
  LoginHandler,
  OrderScraper,
  ShopScraper,
  ClusterManager,
  QuickStart,
  Utils,
  factory,
} = require('../src/services/scraper');

/**
 * Example 1: Quick Product Scraping
 */
async function quickProductExample() {
  console.log('=== Quick Product Scraping ===');

  try {
    const productUrl = 'https://shopee.co.id/product/123456/789012';

    const result = await QuickStart.scrapeProduct(productUrl, {
      downloadImages: true,
      timeout: 30000,
    });

    console.log('Product scraped:', result.name);
    console.log('Price:', result.price);
    console.log('Rating:', result.rating);
    console.log('Images downloaded:', result.localImages?.length || 0);

  } catch (error) {
    console.error('Quick scraping failed:', error.message);
  }
}

/**
 * Example 2: Bulk Product Scraping
 */
async function bulkProductExample() {
  console.log('\n=== Bulk Product Scraping ===');

  try {
    const productUrls = [
      'https://shopee.co.id/product/123456/789012',
      'https://shopee.co.id/product/123456/789013',
      'https://shopee.co.id/product/123456/789014',
    ];

    const result = await QuickStart.scrapeProducts(productUrls, {
      concurrent: 3,
      downloadImages: false,
      retryAttempts: 2,
    });

    console.log(`Bulk scraping completed:`);
    console.log(`- Total: ${result.total}`);
    console.log(`- Successful: ${result.successful}`);
    console.log(`- Failed: ${result.failed}`);

  } catch (error) {
    console.error('Bulk scraping failed:', error.message);
  }
}

/**
 * Example 3: Login and Authenticated Scraping
 */
async function loginExample() {
  console.log('\n=== Login and Authenticated Scraping ===');

  const loginHandler = factory.createLoginHandler();
  const productScraper = factory.createProductScraper();

  try {
    // Initialize scrapers
    await loginHandler.initialize();
    await productScraper.initialize();

    // Add account
    loginHandler.addAccount('user1', {
      username: 'your_username',
      password: 'your_password',
    });

    // Try login with cookies first
    let loginResult = await loginHandler.loginWithCookies('user1');

    // If cookie login fails, use credentials
    if (!loginResult.success) {
      loginResult = await loginHandler.loginWithCredentials(
        'user1',
        'your_username',
        'your_password'
      );
    }

    if (loginResult.success) {
      console.log('Login successful for user1');

      // Scrape product with authenticated session
      const productResult = await productScraper.addTask({
        url: 'https://shopee.co.id/product/123456/789012',
        taskType: 'product',
        accountId: 'user1',
      });

      console.log('Authenticated scraping completed:', productResult.name);
    }

  } catch (error) {
    console.error('Login example failed:', error.message);
  } finally {
    await loginHandler.close();
    await productScraper.close();
  }
}

/**
 * Example 4: Shop Scraping
 */
async function shopScrapingExample() {
  console.log('\n=== Shop Scraping ===');

  const scraper = factory.createProductScraper({
    concurrent: 2,
    downloadImages: false,
  });

  try {
    await scraper.initialize();

    const shopResult = await scraper.addTask({
      url: 'https://shopee.co.id/shop/123456',
      taskType: 'shop',
      maxProducts: 50,
      accountId: 'default',
    });

    console.log(`Shop scraping completed:`);
    console.log(`- Shop: ${shopResult.shopUrl}`);
    console.log(`- Products found: ${shopResult.totalProducts}`);

  } catch (error) {
    console.error('Shop scraping failed:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 5: Search Scraping with Filters
 */
async function searchExample() {
  console.log('\n=== Search Scraping ===');

  try {
    const result = await QuickStart.scrapeSearch(
      'laptop gaming',
      3, // max pages
      {
        minPrice: 5000000,
        maxPrice: 15000000,
        rating: 4,
        sortBy: 'price',
        order: 'asc',
      }
    );

    console.log(`Search completed:`);
    console.log(`- Query: ${result.query}`);
    console.log(`- Products found: ${result.totalProducts}`);
    console.log(`- Pages scraped: ${result.totalPages}`);

  } catch (error) {
    console.error('Search scraping failed:', error.message);
  }
}

/**
 * Example 6: Proxy Usage
 */
async function proxyExample() {
  console.log('\n=== Proxy Usage ===');

  const proxyManager = Utils.createProxyManager();

  // Add proxies
  proxyManager.addProxies([
    'http://proxy1.example.com:8080',
    'http://username:password@proxy2.example.com:8080',
    'socks5://proxy3.example.com:1080',
  ]);

  // Test proxies
  const testResults = await proxyManager.testAllProxies();
  console.log('Proxy test results:', testResults);

  // Use with scraper
  const scraper = factory.createProductScraper({
    useProxy: true,
    proxies: [
      'http://proxy1.example.com:8080',
      'http://proxy2.example.com:8080',
    ],
  });

  try {
    await scraper.initialize();

    const result = await scraper.addTask({
      url: 'https://shopee.co.id/product/123456/789012',
      taskType: 'product',
      accountId: 'default',
    });

    console.log('Proxy scraping completed:', result.name);

  } catch (error) {
    console.error('Proxy scraping failed:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 7: Cookie Management
 */
async function cookieExample() {
  console.log('\n=== Cookie Management ===');

  const cookieManager = Utils.createCookieManager();

  // List existing sessions
  const sessions = await cookieManager.listSessions();
  console.log('Existing sessions:', sessions.length);

  // Clean expired sessions
  const cleanedCount = await cookieManager.cleanExpiredSessions();
  console.log('Cleaned expired sessions:', cleanedCount);

  // Get statistics
  const stats = await cookieManager.getStats();
  console.log('Cookie stats:', stats);
}

/**
 * Example 8: Complete Scraper System
 */
async function completeSystemExample() {
  console.log('\n=== Complete Scraper System ===');

  const scraper = factory.createCompleteScraper({
    concurrent: 3,
    downloadImages: true,
    useCookies: true,
  });

  try {
    // Login
    const loginResult = await scraper.loginWithCookies('user1');
    if (!loginResult.success) {
      await scraper.login('user1', 'username', 'password');
    }

    // Scrape single product
    const productResult = await scraper.scrapeProduct(
      'https://shopee.co.id/product/123456/789012',
      'user1'
    );
    console.log('Single product:', productResult.name);

    // Scrape multiple products
    const bulkResult = await scraper.scrapeProducts([
      'https://shopee.co.id/product/123456/789012',
      'https://shopee.co.id/product/123456/789013',
    ], 'user1');
    console.log('Bulk products:', bulkResult.successful);

    // Scrape shop
    const shopResult = await scraper.scrapeShop(
      'https://shopee.co.id/shop/123456',
      20,
      'user1'
    );
    console.log('Shop products:', shopResult.totalProducts);

    // Get statistics
    const stats = scraper.getStats();
    console.log('System stats:', stats);

  } catch (error) {
    console.error('Complete system failed:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Example 9: Order Scraping
 */
async function orderScrapingExample() {
  console.log('\n=== Order Scraping ===');

  const orderScraper = factory.createOrderScraper();

  try {
    await orderScraper.initialize();

    // Scrape order history
    const orderHistory = await orderScraper.addTask({
      url: orderScraper.orderHistoryUrl,
      taskType: 'order-history',
      accountId: 'user1',
      status: 'ALL',
      maxPages: 5,
    });

    console.log(`Order history completed:`);
    console.log(`- Total orders: ${orderHistory.totalOrders}`);
    console.log(`- Pages scraped: ${orderHistory.totalPages}`);

    // Scrape specific order detail
    if (orderHistory.orders.length > 0) {
      const firstOrder = orderHistory.orders[0];
      const orderDetail = await orderScraper.addTask({
        url: `${orderScraper.orderDetailBaseUrl}/${firstOrder.orderId}`,
        taskType: 'order-detail',
        orderId: firstOrder.orderId,
        accountId: 'user1',
      });

      console.log(`Order detail: ${orderDetail.orderInfo.status}`);
    }

  } catch (error) {
    console.error('Order scraping failed:', error.message);
  } finally {
    await orderScraper.close();
  }
}

/**
 * Example 10: Shop Analysis
 */
async function shopAnalysisExample() {
  console.log('\n=== Shop Analysis ===');

  const shopScraper = factory.createShopScraper();

  try {
    await shopScraper.initialize();

    // Complete shop analysis
    const shopData = await shopScraper.addTask({
      url: `${shopScraper.shopBaseUrl}/123456`,
      taskType: 'shop-complete',
      shopId: '123456',
      maxProducts: 50,
      maxReviews: 30,
      accountId: 'default',
    });

    console.log(`Shop analysis completed:`);
    console.log(`- Shop: ${shopData.info.name}`);
    console.log(`- Rating: ${shopData.statistics.rating}`);
    console.log(`- Products: ${shopData.summary.totalProducts}`);
    console.log(`- Reviews: ${shopData.summary.totalReviews}`);
    console.log(`- Followers: ${shopData.summary.followers}`);

  } catch (error) {
    console.error('Shop analysis failed:', error.message);
  } finally {
    await shopScraper.close();
  }
}

/**
 * Example 11: Advanced Cluster Management
 */
async function clusterManagementExample() {
  console.log('\n=== Advanced Cluster Management ===');

  const clusterManager = factory.createClusterManager({
    concurrency: 5,
    maxConcurrency: 10,
    monitor: true,
  });

  try {
    await clusterManager.initialize();

    // Add multiple tasks with different priorities
    const tasks = [
      { url: 'https://shopee.co.id/product/123456/789012', taskType: 'product', priority: 1 },
      { url: 'https://shopee.co.id/product/123456/789013', taskType: 'product', priority: 2 },
      { url: 'https://shopee.co.id/shop/123456', taskType: 'shop-info', priority: 3 },
    ];

    // Add tasks with load balancing
    const results = await clusterManager.addTasks(tasks, {
      batchSize: 2,
      delay: 500,
    });

    // Wait for completion
    await clusterManager.waitForCompletion();

    // Get comprehensive statistics
    const stats = clusterManager.getStats();
    console.log('Cluster statistics:', {
      totalTasks: stats.cluster.totalTasks,
      completedTasks: stats.cluster.completedTasks,
      successRate: stats.cluster.successRate,
      activeWorkers: stats.cluster.activeWorkers,
    });

  } catch (error) {
    console.error('Cluster management failed:', error.message);
  } finally {
    await clusterManager.close();
  }
}

/**
 * Example 12: Error Handling and Monitoring
 */
async function errorHandlingExample() {
  console.log('\n=== Error Handling and Monitoring ===');

  const scraper = factory.createProductScraper({
    retryAttempts: 3,
    timeout: 15000,
  });

  try {
    await scraper.initialize();

    // Monitor scraper events
    scraper.cluster.on('taskerror', (err, data) => {
      console.log('Task error:', err.message);
      console.log('Failed URL:', data.url);
    });

    // Scrape with error handling
    const results = await scraper.bulkScrapeProducts([
      'https://shopee.co.id/product/123456/789012', // valid
      'https://shopee.co.id/product/invalid/url',    // invalid
      'https://shopee.co.id/product/123456/789013',  // valid
    ]);

    console.log('Results with errors:', {
      successful: results.successful,
      failed: results.failed,
      errors: results.errors.map(e => e.message),
    });

    // Get detailed statistics
    const stats = scraper.getStats();
    console.log('Detailed stats:', stats);

  } catch (error) {
    console.error('Error handling example failed:', error.message);
  } finally {
    await scraper.close();
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Starting Shopee Scraper Examples\n');

  try {
    await quickProductExample();
    await bulkProductExample();
    await loginExample();
    await shopScrapingExample();
    await searchExample();
    await orderScrapingExample();
    await shopAnalysisExample();
    await clusterManagementExample();
    await proxyExample();
    await cookieExample();
    await completeSystemExample();
    await errorHandlingExample();

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Examples failed:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().then(() => {
    console.log('\n🎉 Examples finished!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Examples crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  quickProductExample,
  bulkProductExample,
  loginExample,
  shopScrapingExample,
  searchExample,
  orderScrapingExample,
  shopAnalysisExample,
  clusterManagementExample,
  proxyExample,
  cookieExample,
  completeSystemExample,
  errorHandlingExample,
  runAllExamples,
};
