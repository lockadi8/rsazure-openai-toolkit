#!/usr/bin/env node

/**
 * Script untuk menjalankan contoh penggunaan Shopee Scraper
 * Demonstrasi berbagai fitur dan capabilities
 */

const path = require('path');
const { program } = require('commander');

// Import examples
const examples = require('../examples/scraper-usage');

// Configure CLI
program
  .name('run-scraper-examples')
  .description('Run Shopee Scraper examples')
  .version('1.0.0');

program
  .command('quick-product')
  .description('Run quick product scraping example')
  .option('-u, --url <url>', 'Product URL to scrape')
  .option('--download-images', 'Download product images')
  .action(async (options) => {
    console.log('🚀 Running Quick Product Example...\n');

    if (options.url) {
      // Override example with custom URL
      const { QuickStart } = require('../src/services/scraper');

      try {
        const result = await QuickStart.scrapeProduct(options.url, {
          downloadImages: options.downloadImages || false,
          timeout: 30000,
        });

        console.log('✅ Product scraped successfully:');
        console.log(`- Name: ${result.name}`);
        console.log(`- Price: ${result.price}`);
        console.log(`- Rating: ${result.rating}`);
        console.log(`- Images: ${result.images?.length || 0}`);

        if (options.downloadImages && result.localImages) {
          console.log(`- Downloaded: ${result.localImages.length} images`);
        }

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.quickProductExample();
    }
  });

program
  .command('bulk-products')
  .description('Run bulk product scraping example')
  .option('-f, --file <file>', 'File containing product URLs (one per line)')
  .option('-c, --concurrent <number>', 'Number of concurrent scrapers', '3')
  .action(async (options) => {
    console.log('🚀 Running Bulk Product Example...\n');

    if (options.file) {
      const fs = require('fs');
      const { QuickStart } = require('../src/services/scraper');

      try {
        const content = fs.readFileSync(options.file, 'utf8');
        const urls = content.split('\n').filter(url => url.trim());

        console.log(`📋 Found ${urls.length} URLs in file`);

        const result = await QuickStart.scrapeProducts(urls, {
          concurrent: parseInt(options.concurrent),
          downloadImages: false,
          retryAttempts: 2,
        });

        console.log('✅ Bulk scraping completed:');
        console.log(`- Total: ${result.total}`);
        console.log(`- Successful: ${result.successful}`);
        console.log(`- Failed: ${result.failed}`);

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.bulkProductExample();
    }
  });

program
  .command('login')
  .description('Run login example')
  .option('-u, --username <username>', 'Shopee username')
  .option('-p, --password <password>', 'Shopee password')
  .option('-a, --account-id <id>', 'Account ID', 'default')
  .action(async (options) => {
    console.log('🚀 Running Login Example...\n');

    if (options.username && options.password) {
      const { QuickStart } = require('../src/services/scraper');

      try {
        const result = await QuickStart.login(
          options.username,
          options.password,
          options.accountId
        );

        if (result.success) {
          console.log('✅ Login successful!');
          console.log(`- Account: ${result.accountId}`);
          console.log(`- Method: ${result.loginMethod}`);
        } else {
          console.log('❌ Login failed:', result.error);
        }

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.loginExample();
    }
  });

program
  .command('shop')
  .description('Run shop scraping example')
  .option('-u, --url <url>', 'Shop URL to scrape')
  .option('-m, --max-products <number>', 'Maximum products to scrape', '50')
  .action(async (options) => {
    console.log('🚀 Running Shop Scraping Example...\n');

    if (options.url) {
      const { factory } = require('../src/services/scraper');

      const scraper = factory.createProductScraper({
        concurrent: 2,
        downloadImages: false,
      });

      try {
        await scraper.initialize();

        const result = await scraper.addTask({
          url: options.url,
          taskType: 'shop',
          maxProducts: parseInt(options.maxProducts),
          accountId: 'default',
        });

        console.log('✅ Shop scraping completed:');
        console.log(`- Shop: ${result.shopUrl}`);
        console.log(`- Products: ${result.totalProducts}`);

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      } finally {
        await scraper.close();
      }
    } else {
      await examples.shopScrapingExample();
    }
  });

program
  .command('search')
  .description('Run search scraping example')
  .option('-q, --query <query>', 'Search query')
  .option('-p, --pages <number>', 'Maximum pages to scrape', '5')
  .option('--min-price <price>', 'Minimum price filter')
  .option('--max-price <price>', 'Maximum price filter')
  .option('--rating <rating>', 'Minimum rating filter')
  .action(async (options) => {
    console.log('🚀 Running Search Example...\n');

    if (options.query) {
      const { QuickStart } = require('../src/services/scraper');

      const filters = {};
      if (options.minPrice) filters.minPrice = parseInt(options.minPrice);
      if (options.maxPrice) filters.maxPrice = parseInt(options.maxPrice);
      if (options.rating) filters.rating = parseInt(options.rating);

      try {
        const result = await QuickStart.scrapeSearch(
          options.query,
          parseInt(options.pages),
          filters
        );

        console.log('✅ Search completed:');
        console.log(`- Query: ${result.query}`);
        console.log(`- Products: ${result.totalProducts}`);
        console.log(`- Pages: ${result.totalPages}`);

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.searchExample();
    }
  });

program
  .command('proxy')
  .description('Run proxy usage example')
  .option('-f, --file <file>', 'File containing proxy list (one per line)')
  .action(async (options) => {
    console.log('🚀 Running Proxy Example...\n');

    if (options.file) {
      const fs = require('fs');
      const { Utils } = require('../src/services/scraper');

      try {
        const content = fs.readFileSync(options.file, 'utf8');
        const proxies = content.split('\n').filter(proxy => proxy.trim());

        console.log(`📋 Testing ${proxies.length} proxies...`);

        const proxyManager = Utils.createProxyManager();
        proxyManager.addProxies(proxies);

        const testResults = await proxyManager.testAllProxies();
        console.log('✅ Proxy test results:', testResults);

        const stats = proxyManager.getStats();
        console.log('\n📊 Proxy Statistics:');
        stats.proxies.forEach(proxy => {
          console.log(`- ${proxy.id}: ${proxy.failed ? '❌ Failed' : '✅ Working'}`);
        });

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.proxyExample();
    }
  });

program
  .command('cookies')
  .description('Run cookie management example')
  .action(async () => {
    console.log('🚀 Running Cookie Management Example...\n');
    await examples.cookieExample();
  });

program
  .command('orders')
  .description('Run order scraping example')
  .option('-a, --account-id <id>', 'Account ID', 'user1')
  .option('-s, --status <status>', 'Order status filter', 'ALL')
  .option('-p, --pages <number>', 'Maximum pages to scrape', '5')
  .action(async (options) => {
    console.log('🚀 Running Order Scraping Example...\n');

    if (options.accountId !== 'user1') {
      const { QuickStart } = require('../src/services/scraper');

      try {
        const result = await QuickStart.scrapeOrderHistory(
          options.accountId,
          options.status,
          parseInt(options.pages)
        );

        console.log('✅ Order scraping completed:');
        console.log(`- Account: ${result.accountId}`);
        console.log(`- Total orders: ${result.totalOrders}`);
        console.log(`- Pages scraped: ${result.totalPages}`);

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.orderScrapingExample();
    }
  });

program
  .command('shop-analysis')
  .description('Run shop analysis example')
  .option('-s, --shop-id <id>', 'Shop ID to analyze')
  .option('-p, --products <number>', 'Maximum products to scrape', '50')
  .option('-r, --reviews <number>', 'Maximum reviews to scrape', '30')
  .action(async (options) => {
    console.log('🚀 Running Shop Analysis Example...\n');

    if (options.shopId) {
      const { QuickStart } = require('../src/services/scraper');

      try {
        const result = await QuickStart.scrapeCompleteShop(
          options.shopId,
          parseInt(options.products),
          parseInt(options.reviews)
        );

        console.log('✅ Shop analysis completed:');
        console.log(`- Shop: ${result.info.name}`);
        console.log(`- Rating: ${result.statistics.rating}`);
        console.log(`- Products: ${result.summary.totalProducts}`);
        console.log(`- Reviews: ${result.summary.totalReviews}`);

      } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
      }
    } else {
      await examples.shopAnalysisExample();
    }
  });

program
  .command('cluster')
  .description('Run cluster management example')
  .option('-c, --concurrency <number>', 'Concurrency level', '5')
  .option('-m, --max-concurrency <number>', 'Maximum concurrency', '10')
  .action(async (options) => {
    console.log('🚀 Running Cluster Management Example...\n');

    const { factory } = require('../src/services/scraper');

    const clusterManager = factory.createClusterManager({
      concurrency: parseInt(options.concurrency),
      maxConcurrency: parseInt(options.maxConcurrency),
      monitor: true,
    });

    try {
      await clusterManager.initialize();

      console.log('📊 Cluster initialized successfully');
      console.log(`- Concurrency: ${options.concurrency}`);
      console.log(`- Max Concurrency: ${options.maxConcurrency}`);

      // Add sample tasks
      const tasks = [
        { url: 'https://shopee.co.id', taskType: 'test', priority: 1 },
        { url: 'https://shopee.co.id', taskType: 'test', priority: 2 },
      ];

      await clusterManager.addTasks(tasks);
      await clusterManager.waitForCompletion();

      const stats = clusterManager.getStats();
      console.log('✅ Cluster test completed:', {
        totalTasks: stats.cluster.totalTasks,
        completedTasks: stats.cluster.completedTasks,
        successRate: stats.cluster.successRate,
      });

    } catch (error) {
      console.error('❌ Example failed:', error.message);
      process.exit(1);
    } finally {
      await clusterManager.close();
    }
  });

program
  .command('complete')
  .description('Run complete scraper system example')
  .action(async () => {
    console.log('🚀 Running Complete System Example...\n');
    await examples.completeSystemExample();
  });

program
  .command('error-handling')
  .description('Run error handling example')
  .action(async () => {
    console.log('🚀 Running Error Handling Example...\n');
    await examples.errorHandlingExample();
  });

program
  .command('all')
  .description('Run all examples')
  .action(async () => {
    console.log('🚀 Running All Examples...\n');
    await examples.runAllExamples();
  });

program
  .command('test-connection')
  .description('Test connection to Shopee')
  .action(async () => {
    console.log('🚀 Testing Connection to Shopee...\n');

    const { factory } = require('../src/services/scraper');
    const scraper = factory.createBaseScraper({
      concurrent: 1,
      timeout: 15000,
    });

    try {
      await scraper.initialize();

      console.log('📡 Testing connection...');

      // Test basic connection
      const cluster = scraper.cluster;
      await cluster.queue({
        url: 'https://shopee.co.id',
        taskType: 'test',
      });

      await scraper.waitForCompletion();

      console.log('✅ Connection test successful!');

      const stats = scraper.getStats();
      console.log('📊 Stats:', {
        requests: stats.requests,
        successes: stats.successes,
        failures: stats.failures,
      });

    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      process.exit(1);
    } finally {
      await scraper.close();
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
