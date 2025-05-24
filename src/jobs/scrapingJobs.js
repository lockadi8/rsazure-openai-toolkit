const config = require('../config');
const logger = require('../utils/logger');
const { ProductScraper, OrderScraper, ShopScraper } = require('../services/scraper');
const { ClusterManager } = require('../services/scraper/ClusterManager');

/**
 * Job definitions untuk berbagai tipe scraping
 * Menggunakan BullMQ job processors
 */

/**
 * Product Scraping Job
 * Scraping data produk dari URL Shopee
 */
class ProductScrapingJob {
  static async process(job) {
    const { url, accountId, options = {} } = job.data;
    
    try {
      logger.info(`Starting product scraping job ${job.id} for URL: ${url}`);
      
      // Update job progress
      await job.updateProgress(10);
      
      // Initialize scraper
      const scraper = new ProductScraper({
        ...config.scraper,
        ...options,
      });
      
      await scraper.initialize();
      await job.updateProgress(30);
      
      // Perform scraping
      const result = await scraper.scrapeProduct(url, accountId);
      await job.updateProgress(80);
      
      // Cleanup
      await scraper.close();
      await job.updateProgress(100);
      
      logger.info(`Product scraping job ${job.id} completed successfully`);
      
      return {
        success: true,
        data: result,
        url,
        scrapedAt: new Date().toISOString(),
        jobId: job.id,
      };
      
    } catch (error) {
      logger.error(`Product scraping job ${job.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Order Scraping Job
 * Scraping data order history dari akun Shopee
 */
class OrderScrapingJob {
  static async process(job) {
    const { accountId, dateRange, options = {} } = job.data;
    
    try {
      logger.info(`Starting order scraping job ${job.id} for account: ${accountId}`);
      
      await job.updateProgress(10);
      
      // Initialize scraper
      const scraper = new OrderScraper({
        ...config.scraper,
        ...options,
      });
      
      await scraper.initialize();
      await job.updateProgress(30);
      
      // Perform scraping
      const result = await scraper.scrapeOrders(accountId, dateRange);
      await job.updateProgress(80);
      
      // Cleanup
      await scraper.close();
      await job.updateProgress(100);
      
      logger.info(`Order scraping job ${job.id} completed successfully`);
      
      return {
        success: true,
        data: result,
        accountId,
        dateRange,
        scrapedAt: new Date().toISOString(),
        jobId: job.id,
      };
      
    } catch (error) {
      logger.error(`Order scraping job ${job.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Shop Scraping Job
 * Scraping data toko dari URL Shopee
 */
class ShopScrapingJob {
  static async process(job) {
    const { shopUrl, options = {} } = job.data;
    
    try {
      logger.info(`Starting shop scraping job ${job.id} for shop: ${shopUrl}`);
      
      await job.updateProgress(10);
      
      // Initialize scraper
      const scraper = new ShopScraper({
        ...config.scraper,
        ...options,
      });
      
      await scraper.initialize();
      await job.updateProgress(30);
      
      // Perform scraping
      const result = await scraper.scrapeShop(shopUrl);
      await job.updateProgress(80);
      
      // Cleanup
      await scraper.close();
      await job.updateProgress(100);
      
      logger.info(`Shop scraping job ${job.id} completed successfully`);
      
      return {
        success: true,
        data: result,
        shopUrl,
        scrapedAt: new Date().toISOString(),
        jobId: job.id,
      };
      
    } catch (error) {
      logger.error(`Shop scraping job ${job.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Batch Scraping Job
 * Scraping multiple URLs dalam satu job
 */
class BatchScrapingJob {
  static async process(job) {
    const { urls, type, accountId, options = {} } = job.data;
    
    try {
      logger.info(`Starting batch scraping job ${job.id} for ${urls.length} URLs`);
      
      await job.updateProgress(5);
      
      // Initialize cluster manager
      const clusterManager = new ClusterManager({
        ...config.scraper,
        concurrency: options.concurrency || 5,
        ...options,
      });
      
      await clusterManager.initialize();
      await job.updateProgress(15);
      
      const results = [];
      const totalUrls = urls.length;
      
      // Process URLs in batches
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        
        try {
          const taskData = {
            url,
            taskType: type,
            accountId,
            taskId: `batch_${job.id}_${i}`,
          };
          
          const result = await clusterManager.addTask(taskData);
          results.push({
            url,
            success: true,
            data: result,
          });
          
        } catch (error) {
          logger.error(`Failed to scrape URL ${url} in batch job ${job.id}:`, error);
          results.push({
            url,
            success: false,
            error: error.message,
          });
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / totalUrls) * 80) + 15;
        await job.updateProgress(progress);
      }
      
      // Cleanup
      await clusterManager.close();
      await job.updateProgress(100);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      logger.info(`Batch scraping job ${job.id} completed: ${successCount} success, ${failureCount} failed`);
      
      return {
        success: true,
        totalUrls: urls.length,
        successCount,
        failureCount,
        results,
        scrapedAt: new Date().toISOString(),
        jobId: job.id,
      };
      
    } catch (error) {
      logger.error(`Batch scraping job ${job.id} failed:`, error);
      throw error;
    }
  }
}

/**
 * Scheduled Scraping Job
 * Job untuk scraping terjadwal berdasarkan konfigurasi
 */
class ScheduledScrapingJob {
  static async process(job) {
    const { scheduleConfig, accountId, options = {} } = job.data;
    
    try {
      logger.info(`Starting scheduled scraping job ${job.id} for account: ${accountId}`);
      
      await job.updateProgress(10);
      
      const { type, targets, settings } = scheduleConfig;
      const results = [];
      
      // Initialize appropriate scraper based on type
      let scraper;
      switch (type) {
        case 'product':
          scraper = new ProductScraper({ ...config.scraper, ...settings });
          break;
        case 'order':
          scraper = new OrderScraper({ ...config.scraper, ...settings });
          break;
        case 'shop':
          scraper = new ShopScraper({ ...config.scraper, ...settings });
          break;
        default:
          throw new Error(`Unknown scraping type: ${type}`);
      }
      
      await scraper.initialize();
      await job.updateProgress(30);
      
      // Process each target
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        
        try {
          let result;
          
          switch (type) {
            case 'product':
              result = await scraper.scrapeProduct(target.url, accountId);
              break;
            case 'order':
              result = await scraper.scrapeOrders(accountId, target.dateRange);
              break;
            case 'shop':
              result = await scraper.scrapeShop(target.url);
              break;
          }
          
          results.push({
            target,
            success: true,
            data: result,
          });
          
        } catch (error) {
          logger.error(`Failed to scrape target in scheduled job ${job.id}:`, error);
          results.push({
            target,
            success: false,
            error: error.message,
          });
        }
        
        // Update progress
        const progress = Math.round(((i + 1) / targets.length) * 60) + 30;
        await job.updateProgress(progress);
      }
      
      // Cleanup
      await scraper.close();
      await job.updateProgress(100);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      logger.info(`Scheduled scraping job ${job.id} completed: ${successCount} success, ${failureCount} failed`);
      
      return {
        success: true,
        type,
        totalTargets: targets.length,
        successCount,
        failureCount,
        results,
        scrapedAt: new Date().toISOString(),
        jobId: job.id,
      };
      
    } catch (error) {
      logger.error(`Scheduled scraping job ${job.id} failed:`, error);
      throw error;
    }
  }
}

module.exports = {
  ProductScrapingJob,
  OrderScrapingJob,
  ShopScrapingJob,
  BatchScrapingJob,
  ScheduledScrapingJob,
};
