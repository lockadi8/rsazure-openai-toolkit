const BaseScraper = require('./BaseScraper');
const logger = require('../../utils/logger');

/**
 * Shop Scraper untuk Shopee dengan comprehensive shop analysis
 * Menangani shop information, product catalog, statistics & performance
 */
class ShopScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);

    this.shopBaseUrl = 'https://shopee.co.id/shop';
    this.shopApiBaseUrl = 'https://shopee.co.id/api/v4/shop';
    this.maxProductsPerPage = 30;
    this.maxReviewsPerPage = 20;
  }

  /**
   * Handle shop scraping tasks
   */
  async handleTask(page, taskType, taskData) {
    switch (taskType) {
      case 'shop-info':
        return await this.scrapeShopInfo(page, taskData);
      case 'shop-products':
        return await this.scrapeShopProducts(page, taskData);
      case 'shop-reviews':
        return await this.scrapeShopReviews(page, taskData);
      case 'shop-analytics':
        return await this.scrapeShopAnalytics(page, taskData);
      case 'shop-complete':
        return await this.scrapeCompleteShop(page, taskData);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  /**
   * Scrape comprehensive shop information
   */
  async scrapeShopInfo(page, { shopId, shopUrl, accountId }) {
    try {
      const targetUrl = shopUrl || `${this.shopBaseUrl}/${shopId}`;
      logger.scraper(`Scraping shop info: ${targetUrl}`);

      await page.goto(targetUrl, { waitUntil: 'networkidle0' });
      
      // Check for CAPTCHA
      await this.handleCaptcha(page);

      // Wait for shop page to load
      await page.waitForSelector('.shop-page-header, .shop-info', { timeout: 15000 });

      const shopInfo = await this.extractShopInfo(page);
      const shopStats = await this.extractShopStats(page);
      const shopPolicies = await this.extractShopPolicies(page);

      return {
        shopId: shopId || this.extractShopIdFromUrl(targetUrl),
        shopUrl: targetUrl,
        accountId,
        info: shopInfo,
        statistics: shopStats,
        policies: shopPolicies,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape shop info: ${shopId || shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract basic shop information
   */
  async extractShopInfo(page) {
    return await page.evaluate(() => {
      const shopInfo = {};

      // Basic shop details
      const nameElement = document.querySelector('.shop-name, .shop-title');
      shopInfo.name = nameElement ? nameElement.textContent.trim() : null;

      const descriptionElement = document.querySelector('.shop-description');
      shopInfo.description = descriptionElement ? descriptionElement.textContent.trim() : null;

      const locationElement = document.querySelector('.shop-location');
      shopInfo.location = locationElement ? locationElement.textContent.trim() : null;

      const joinDateElement = document.querySelector('.shop-join-date');
      shopInfo.joinDate = joinDateElement ? joinDateElement.textContent.trim() : null;

      // Shop avatar and cover
      const avatarElement = document.querySelector('.shop-avatar img');
      shopInfo.avatar = avatarElement ? avatarElement.src : null;

      const coverElement = document.querySelector('.shop-cover img');
      shopInfo.cover = coverElement ? coverElement.src : null;

      // Verification status
      const verifiedElement = document.querySelector('.shop-verified, .verified-badge');
      shopInfo.isVerified = verifiedElement !== null;

      const officialElement = document.querySelector('.shop-official, .official-badge');
      shopInfo.isOfficial = officialElement !== null;

      const mallElement = document.querySelector('.shop-mall, .mall-badge');
      shopInfo.isMall = mallElement !== null;

      // Contact information
      const phoneElement = document.querySelector('.shop-phone');
      shopInfo.phone = phoneElement ? phoneElement.textContent.trim() : null;

      const emailElement = document.querySelector('.shop-email');
      shopInfo.email = emailElement ? emailElement.textContent.trim() : null;

      const websiteElement = document.querySelector('.shop-website');
      shopInfo.website = websiteElement ? websiteElement.href : null;

      // Social media links
      const socialElements = document.querySelectorAll('.shop-social a');
      shopInfo.socialMedia = Array.from(socialElements).map(link => ({
        platform: link.className.includes('facebook') ? 'facebook' :
                 link.className.includes('instagram') ? 'instagram' :
                 link.className.includes('twitter') ? 'twitter' : 'other',
        url: link.href,
      }));

      // Business hours
      const hoursElement = document.querySelector('.shop-hours');
      shopInfo.businessHours = hoursElement ? hoursElement.textContent.trim() : null;

      return shopInfo;
    });
  }

  /**
   * Extract shop statistics
   */
  async extractShopStats(page) {
    return await page.evaluate(() => {
      const stats = {};

      // Basic statistics
      const ratingElement = document.querySelector('.shop-rating .rating-score');
      stats.rating = ratingElement ? parseFloat(ratingElement.textContent.trim()) : null;

      const reviewCountElement = document.querySelector('.shop-rating .review-count');
      stats.reviewCount = reviewCountElement ? 
        parseInt(reviewCountElement.textContent.replace(/\D/g, '')) : null;

      const followerElement = document.querySelector('.shop-followers .follower-count');
      stats.followers = followerElement ? 
        parseInt(followerElement.textContent.replace(/\D/g, '')) : null;

      const productCountElement = document.querySelector('.shop-products .product-count');
      stats.productCount = productCountElement ? 
        parseInt(productCountElement.textContent.replace(/\D/g, '')) : null;

      // Response metrics
      const responseRateElement = document.querySelector('.response-rate');
      stats.responseRate = responseRateElement ? responseRateElement.textContent.trim() : null;

      const responseTimeElement = document.querySelector('.response-time');
      stats.responseTime = responseTimeElement ? responseTimeElement.textContent.trim() : null;

      // Performance metrics
      const performanceElements = document.querySelectorAll('.shop-performance .metric');
      stats.performance = {};
      performanceElements.forEach(metric => {
        const label = metric.querySelector('.metric-label')?.textContent?.trim();
        const value = metric.querySelector('.metric-value')?.textContent?.trim();
        if (label && value) {
          stats.performance[label] = value;
        }
      });

      // Sales metrics (if available)
      const salesElement = document.querySelector('.shop-sales');
      stats.totalSales = salesElement ? salesElement.textContent.trim() : null;

      const monthlyVisitorsElement = document.querySelector('.monthly-visitors');
      stats.monthlyVisitors = monthlyVisitorsElement ? 
        monthlyVisitorsElement.textContent.trim() : null;

      return stats;
    });
  }

  /**
   * Extract shop policies
   */
  async extractShopPolicies(page) {
    return await page.evaluate(() => {
      const policies = {};

      // Shipping policies
      const shippingElement = document.querySelector('.shipping-policy');
      policies.shipping = shippingElement ? shippingElement.textContent.trim() : null;

      // Return policy
      const returnElement = document.querySelector('.return-policy');
      policies.return = returnElement ? returnElement.textContent.trim() : null;

      // Terms and conditions
      const termsElement = document.querySelector('.terms-conditions');
      policies.terms = termsElement ? termsElement.textContent.trim() : null;

      // Payment methods
      const paymentElements = document.querySelectorAll('.payment-methods .payment-method');
      policies.paymentMethods = Array.from(paymentElements).map(method => 
        method.textContent.trim()
      );

      // Shipping methods
      const shippingMethodElements = document.querySelectorAll('.shipping-methods .shipping-method');
      policies.shippingMethods = Array.from(shippingMethodElements).map(method => ({
        name: method.querySelector('.method-name')?.textContent?.trim(),
        fee: method.querySelector('.method-fee')?.textContent?.trim(),
        duration: method.querySelector('.method-duration')?.textContent?.trim(),
      }));

      return policies;
    });
  }

  /**
   * Scrape shop products with pagination
   */
  async scrapeShopProducts(page, { shopId, shopUrl, maxProducts = 100, accountId }) {
    try {
      const targetUrl = shopUrl || `${this.shopBaseUrl}/${shopId}`;
      logger.scraper(`Scraping shop products: ${targetUrl}`);

      const products = [];
      let currentPage = 0;
      let hasNextPage = true;

      while (hasNextPage && products.length < maxProducts) {
        // Navigate to shop products page
        const pageUrl = `${targetUrl}?page=${currentPage}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        // Wait for products to load
        await page.waitForSelector('.shop-search-result-view, .shop-product-list', { timeout: 15000 });

        // Extract products from current page
        const pageProducts = await this.extractProductsFromPage(page);
        
        if (pageProducts.length === 0) {
          break;
        }

        products.push(...pageProducts.slice(0, maxProducts - products.length));

        // Check for next page
        hasNextPage = pageProducts.length === this.maxProductsPerPage && 
                     products.length < maxProducts;
        currentPage++;

        logger.scraper(`Page ${currentPage} completed. Products: ${pageProducts.length}`);
        
        // Add delay between pages
        await this.stealthConfig.randomWait(2000, 4000);
      }

      return {
        shopId: shopId || this.extractShopIdFromUrl(targetUrl),
        shopUrl: targetUrl,
        accountId,
        totalProducts: products.length,
        totalPages: currentPage,
        products,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape shop products: ${shopId || shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract products from current page
   */
  async extractProductsFromPage(page) {
    return await page.evaluate(() => {
      const productElements = document.querySelectorAll('.shop-search-result-view .col-xs-2-4, .shop-product-item');
      
      return Array.from(productElements).map(product => {
        const linkElement = product.querySelector('a');
        const nameElement = product.querySelector('.product-name, ._10Wbs-');
        const priceElement = product.querySelector('.product-price, ._3c5u9');
        const imageElement = product.querySelector('img');
        const soldElement = product.querySelector('.product-sold, ._1uq9j');
        const ratingElement = product.querySelector('.product-rating, ._32vbJ');
        const discountElement = product.querySelector('.product-discount, ._2Tpdn');

        return {
          url: linkElement ? linkElement.href : null,
          name: nameElement ? nameElement.textContent.trim() : null,
          price: priceElement ? priceElement.textContent.trim() : null,
          image: imageElement ? imageElement.src : null,
          sold: soldElement ? soldElement.textContent.trim() : null,
          rating: ratingElement ? ratingElement.textContent.trim() : null,
          discount: discountElement ? discountElement.textContent.trim() : null,
        };
      }).filter(product => product.url);
    });
  }

  /**
   * Scrape shop reviews
   */
  async scrapeShopReviews(page, { shopId, shopUrl, maxReviews = 100, accountId }) {
    try {
      const targetUrl = shopUrl || `${this.shopBaseUrl}/${shopId}`;
      logger.scraper(`Scraping shop reviews: ${targetUrl}`);

      // Navigate to shop reviews section
      await page.goto(`${targetUrl}/reviews`, { waitUntil: 'networkidle0' });
      
      const reviews = [];
      let currentPage = 0;
      let hasNextPage = true;

      while (hasNextPage && reviews.length < maxReviews) {
        // Wait for reviews to load
        await page.waitForSelector('.shop-review-list, .review-item', { timeout: 15000 });

        // Extract reviews from current page
        const pageReviews = await this.extractReviewsFromPage(page);
        
        if (pageReviews.length === 0) {
          break;
        }

        reviews.push(...pageReviews.slice(0, maxReviews - reviews.length));

        // Check for next page
        hasNextPage = await this.hasNextReviewPage(page);
        if (hasNextPage) {
          await this.clickNextReviewPage(page);
          currentPage++;
        }

        logger.scraper(`Review page ${currentPage + 1} completed. Reviews: ${pageReviews.length}`);
        
        // Add delay between pages
        await this.stealthConfig.randomWait(2000, 4000);
      }

      return {
        shopId: shopId || this.extractShopIdFromUrl(targetUrl),
        shopUrl: targetUrl,
        accountId,
        totalReviews: reviews.length,
        totalPages: currentPage + 1,
        reviews,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape shop reviews: ${shopId || shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract reviews from current page
   */
  async extractReviewsFromPage(page) {
    return await page.evaluate(() => {
      const reviewElements = document.querySelectorAll('.review-item, .shop-review-item');
      
      return Array.from(reviewElements).map(review => {
        const userElement = review.querySelector('.review-user, .reviewer-name');
        const ratingElement = review.querySelector('.review-rating, .rating-stars');
        const dateElement = review.querySelector('.review-date');
        const contentElement = review.querySelector('.review-content, .review-text');
        const productElement = review.querySelector('.review-product');
        const imagesElements = review.querySelectorAll('.review-images img');

        return {
          user: userElement ? userElement.textContent.trim() : null,
          rating: ratingElement ? ratingElement.textContent.trim() : null,
          date: dateElement ? dateElement.textContent.trim() : null,
          content: contentElement ? contentElement.textContent.trim() : null,
          product: productElement ? productElement.textContent.trim() : null,
          images: Array.from(imagesElements).map(img => img.src),
        };
      });
    });
  }

  /**
   * Scrape shop analytics and performance metrics
   */
  async scrapeShopAnalytics(page, { shopId, shopUrl, accountId }) {
    try {
      const targetUrl = shopUrl || `${this.shopBaseUrl}/${shopId}`;
      logger.scraper(`Scraping shop analytics: ${targetUrl}`);

      await page.goto(targetUrl, { waitUntil: 'networkidle0' });

      const analytics = await page.evaluate(() => {
        const data = {};

        // Performance indicators
        const indicators = document.querySelectorAll('.performance-indicator');
        data.performance = {};
        indicators.forEach(indicator => {
          const label = indicator.querySelector('.indicator-label')?.textContent?.trim();
          const value = indicator.querySelector('.indicator-value')?.textContent?.trim();
          if (label && value) {
            data.performance[label] = value;
          }
        });

        // Category distribution
        const categories = document.querySelectorAll('.category-stats .category-item');
        data.categories = Array.from(categories).map(cat => ({
          name: cat.querySelector('.category-name')?.textContent?.trim(),
          count: cat.querySelector('.category-count')?.textContent?.trim(),
          percentage: cat.querySelector('.category-percentage')?.textContent?.trim(),
        }));

        // Price range analysis
        const priceRanges = document.querySelectorAll('.price-range-stats .price-range');
        data.priceRanges = Array.from(priceRanges).map(range => ({
          range: range.querySelector('.range-label')?.textContent?.trim(),
          count: range.querySelector('.range-count')?.textContent?.trim(),
          percentage: range.querySelector('.range-percentage')?.textContent?.trim(),
        }));

        // Top selling products
        const topProducts = document.querySelectorAll('.top-products .product-item');
        data.topProducts = Array.from(topProducts).map(product => ({
          name: product.querySelector('.product-name')?.textContent?.trim(),
          sales: product.querySelector('.product-sales')?.textContent?.trim(),
          revenue: product.querySelector('.product-revenue')?.textContent?.trim(),
        }));

        return data;
      });

      return {
        shopId: shopId || this.extractShopIdFromUrl(targetUrl),
        shopUrl: targetUrl,
        accountId,
        analytics,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape shop analytics: ${shopId || shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Scrape complete shop data (info + products + reviews + analytics)
   */
  async scrapeCompleteShop(page, { shopId, shopUrl, maxProducts = 100, maxReviews = 50, accountId }) {
    try {
      logger.scraper(`Scraping complete shop data: ${shopId || shopUrl}`);

      // Scrape shop info
      const shopInfo = await this.scrapeShopInfo(page, { shopId, shopUrl, accountId });
      
      // Scrape products
      const products = await this.scrapeShopProducts(page, { shopId, shopUrl, maxProducts, accountId });
      
      // Scrape reviews
      const reviews = await this.scrapeShopReviews(page, { shopId, shopUrl, maxReviews, accountId });
      
      // Scrape analytics
      const analytics = await this.scrapeShopAnalytics(page, { shopId, shopUrl, accountId });

      return {
        shopId: shopId || this.extractShopIdFromUrl(shopUrl),
        shopUrl: shopUrl || `${this.shopBaseUrl}/${shopId}`,
        accountId,
        info: shopInfo.info,
        statistics: shopInfo.statistics,
        policies: shopInfo.policies,
        products: products.products,
        reviews: reviews.reviews,
        analytics: analytics.analytics,
        summary: {
          totalProducts: products.totalProducts,
          totalReviews: reviews.totalReviews,
          avgRating: shopInfo.statistics.rating,
          followers: shopInfo.statistics.followers,
        },
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape complete shop: ${shopId || shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract shop ID from URL
   */
  extractShopIdFromUrl(url) {
    const match = url.match(/shop\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if there's next review page
   */
  async hasNextReviewPage(page) {
    try {
      const nextButton = await page.$('.review-pagination .next:not(.disabled)');
      return nextButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Click next review page
   */
  async clickNextReviewPage(page) {
    try {
      await this.stealthConfig.humanClick(page, '.review-pagination .next');
      await page.waitForTimeout(2000);
    } catch (error) {
      logger.error('Failed to click next review page:', error);
    }
  }

  /**
   * Bulk scrape multiple shops
   */
  async bulkScrapeShops(shopIds, options = {}) {
    try {
      logger.scraper(`Starting bulk shop scraping for ${shopIds.length} shops`);

      const tasks = shopIds.map(shopId => ({
        url: `${this.shopBaseUrl}/${shopId}`,
        taskType: options.complete ? 'shop-complete' : 'shop-info',
        shopId,
        accountId: options.accountId || 'default',
        ...options,
      }));

      const results = await this.addTasks(tasks);
      await this.waitForCompletion();

      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedResults = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      logger.scraper(`Bulk shop scraping completed. Success: ${successfulResults.length}, Failed: ${failedResults.length}`);

      return {
        total: shopIds.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        shops: successfulResults,
        errors: failedResults,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Bulk shop scraping failed:', error);
      throw error;
    }
  }
}

module.exports = ShopScraper;
