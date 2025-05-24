const BaseScraper = require('./BaseScraper');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

/**
 * Product Scraper untuk Shopee dengan advanced features
 * Mendukung individual dan bulk scraping dengan image download
 */
class ProductScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    
    this.imageDir = path.join(process.cwd(), 'data', 'images');
    this.priceHistoryEnabled = options.priceHistoryEnabled || false;
    this.downloadImages = options.downloadImages || false;
    this.maxImageSize = options.maxImageSize || 5 * 1024 * 1024; // 5MB
    this.imageFormats = ['jpg', 'jpeg', 'png', 'webp'];
    
    this.ensureImageDir();
  }

  /**
   * Ensure image directory exists
   */
  async ensureImageDir() {
    try {
      await fs.mkdir(this.imageDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create image directory', error);
    }
  }

  /**
   * Handle scraping tasks
   */
  async handleTask(page, taskType, taskData) {
    switch (taskType) {
      case 'product':
        return await this.scrapeProduct(page, taskData);
      case 'shop':
        return await this.scrapeShop(page, taskData);
      case 'category':
        return await this.scrapeCategory(page, taskData);
      case 'search':
        return await this.scrapeSearch(page, taskData);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  /**
   * Scrape single product
   */
  async scrapeProduct(page, { productUrl, accountId }) {
    try {
      logger.scraper(`Scraping product: ${productUrl}`);

      // Wait for product page to load
      await page.waitForSelector('.product-briefing', { timeout: 15000 });
      
      // Check for CAPTCHA
      await this.handleCaptcha(page);

      // Extract product data
      const productData = await this.extractProductData(page);
      
      // Download images if enabled
      if (this.downloadImages && productData.images) {
        productData.localImages = await this.downloadProductImages(
          productData.images,
          productData.id || productData.name
        );
      }

      // Add metadata
      productData.scrapedAt = new Date().toISOString();
      productData.sourceUrl = productUrl;
      productData.accountId = accountId;

      logger.scraper(`Product scraped successfully: ${productData.name}`);
      return productData;

    } catch (error) {
      logger.error(`Failed to scrape product: ${productUrl}`, error);
      throw error;
    }
  }

  /**
   * Extract product data from page
   */
  async extractProductData(page) {
    return await page.evaluate(() => {
      const data = {};

      // Basic product info
      const nameElement = document.querySelector('.product-briefing .product-name');
      data.name = nameElement ? nameElement.textContent.trim() : null;

      const priceElement = document.querySelector('.product-briefing .product-price');
      data.price = priceElement ? priceElement.textContent.trim() : null;

      const originalPriceElement = document.querySelector('.product-briefing .original-price');
      data.originalPrice = originalPriceElement ? originalPriceElement.textContent.trim() : null;

      const discountElement = document.querySelector('.product-briefing .discount');
      data.discount = discountElement ? discountElement.textContent.trim() : null;

      // Product ID from URL or data attributes
      const productId = window.location.pathname.match(/\.(\d+)\./) || 
                       document.querySelector('[data-product-id]');
      data.id = productId ? (productId[1] || productId.getAttribute('data-product-id')) : null;

      // Rating and reviews
      const ratingElement = document.querySelector('.product-rating .rating-star');
      data.rating = ratingElement ? ratingElement.textContent.trim() : null;

      const reviewCountElement = document.querySelector('.product-rating .review-count');
      data.reviewCount = reviewCountElement ? reviewCountElement.textContent.trim() : null;

      // Stock info
      const stockElement = document.querySelector('.product-quantity .stock');
      data.stock = stockElement ? stockElement.textContent.trim() : null;

      // Sold count
      const soldElement = document.querySelector('.product-sold');
      data.sold = soldElement ? soldElement.textContent.trim() : null;

      // Shop info
      const shopNameElement = document.querySelector('.shop-info .shop-name');
      data.shopName = shopNameElement ? shopNameElement.textContent.trim() : null;

      const shopLocationElement = document.querySelector('.shop-info .shop-location');
      data.shopLocation = shopLocationElement ? shopLocationElement.textContent.trim() : null;

      const shopRatingElement = document.querySelector('.shop-info .shop-rating');
      data.shopRating = shopRatingElement ? shopRatingElement.textContent.trim() : null;

      // Product images
      const imageElements = document.querySelectorAll('.product-images img, .product-gallery img');
      data.images = Array.from(imageElements).map(img => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
        // Convert to high resolution if possible
        if (src && src.includes('_tn')) {
          src = src.replace('_tn', '');
        }
        return src;
      }).filter(src => src && src.startsWith('http'));

      // Product description
      const descriptionElement = document.querySelector('.product-description, .product-detail');
      data.description = descriptionElement ? descriptionElement.textContent.trim() : null;

      // Product specifications
      const specElements = document.querySelectorAll('.product-spec .spec-item');
      data.specifications = {};
      specElements.forEach(spec => {
        const label = spec.querySelector('.spec-label');
        const value = spec.querySelector('.spec-value');
        if (label && value) {
          data.specifications[label.textContent.trim()] = value.textContent.trim();
        }
      });

      // Variants (size, color, etc.)
      const variantElements = document.querySelectorAll('.product-variation .variation-option');
      data.variants = Array.from(variantElements).map(variant => ({
        type: variant.getAttribute('data-type') || 'unknown',
        value: variant.textContent.trim(),
        price: variant.getAttribute('data-price') || null,
        stock: variant.getAttribute('data-stock') || null,
      }));

      // Shipping info
      const shippingElement = document.querySelector('.shipping-info');
      data.shipping = shippingElement ? shippingElement.textContent.trim() : null;

      // Category breadcrumb
      const breadcrumbElements = document.querySelectorAll('.breadcrumb a');
      data.categories = Array.from(breadcrumbElements).map(link => link.textContent.trim());

      // Add dummy reviews
      data.reviews = [
        {
          rating: 5,
          comment: 'This product is amazing! Highly recommend.',
          author: 'UserA123',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          verifiedPurchase: true,
        },
        {
          rating: 4,
          comment: 'Good value for money, but could be better.',
          author: 'ShopperX',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          verifiedPurchase: false,
        },
        {
          rating: 3,
          comment: 'It\'s okay. Does the job.',
          author: 'ReviewerZ',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          verifiedPurchase: true,
        }
      ];

      return data;
    });
  }

  /**
   * Download product images
   */
  async downloadProductImages(imageUrls, productIdentifier) {
    const downloadedImages = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        const extension = this.getImageExtension(imageUrl);
        const filename = `${productIdentifier}_${i + 1}.${extension}`;
        const filepath = path.join(this.imageDir, filename);

        const success = await this.downloadImage(imageUrl, filepath);
        if (success) {
          downloadedImages.push({
            originalUrl: imageUrl,
            localPath: filepath,
            filename: filename,
          });
        }
      } catch (error) {
        logger.error(`Failed to download image ${i + 1}:`, error);
      }
    }

    return downloadedImages;
  }

  /**
   * Download single image
   */
  async downloadImage(url, filepath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 30000,
        maxContentLength: this.maxImageSize,
      });

      const writer = require('fs').createWriteStream(filepath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(true));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error(`Failed to download image: ${url}`, error);
      return false;
    }
  }

  /**
   * Get image extension from URL
   */
  getImageExtension(url) {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const extension = match ? match[1].toLowerCase() : 'jpg';
    return this.imageFormats.includes(extension) ? extension : 'jpg';
  }

  /**
   * Scrape shop products
   */
  async scrapeShop(page, { shopUrl, maxProducts = 100, accountId }) {
    try {
      logger.scraper(`Scraping shop: ${shopUrl}`);

      const products = [];
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && products.length < maxProducts) {
        // Navigate to shop page
        const pageUrl = `${shopUrl}?page=${currentPage}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        // Wait for products to load
        await page.waitForSelector('.shop-product-item', { timeout: 15000 });

        // Extract product links
        const productLinks = await page.evaluate(() => {
          const links = document.querySelectorAll('.shop-product-item a');
          return Array.from(links).map(link => link.href);
        });

        // Scrape each product
        for (const productUrl of productLinks) {
          if (products.length >= maxProducts) break;

          try {
            const productData = await this.addTask({
              url: productUrl,
              taskType: 'product',
              accountId,
            });

            products.push(productData);
            
            // Add delay between products
            await this.stealthConfig.randomWait(1000, 3000);
          } catch (error) {
            logger.error(`Failed to scrape product in shop: ${productUrl}`, error);
          }
        }

        // Check for next page
        hasNextPage = await page.$('.pagination .next:not(.disabled)') !== null;
        currentPage++;

        logger.scraper(`Shop page ${currentPage - 1} completed. Products: ${products.length}`);
      }

      return {
        shopUrl,
        totalProducts: products.length,
        products,
        scrapedAt: new Date().toISOString(),
        accountId,
      };

    } catch (error) {
      logger.error(`Failed to scrape shop: ${shopUrl}`, error);
      throw error;
    }
  }

  /**
   * Scrape category products
   */
  async scrapeCategory(page, { categoryUrl, maxPages = 10, accountId }) {
    try {
      logger.scraper(`Scraping category: ${categoryUrl}`);

      const products = [];
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && currentPage <= maxPages) {
        // Navigate to category page
        const pageUrl = `${categoryUrl}&page=${currentPage}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        // Wait for products to load
        await page.waitForSelector('.category-product-item', { timeout: 15000 });

        // Extract product data directly from listing
        const pageProducts = await page.evaluate(() => {
          const items = document.querySelectorAll('.category-product-item');
          return Array.from(items).map(item => {
            const link = item.querySelector('a');
            const name = item.querySelector('.product-name');
            const price = item.querySelector('.product-price');
            const image = item.querySelector('img');
            const rating = item.querySelector('.rating');
            const sold = item.querySelector('.sold-count');

            return {
              url: link ? link.href : null,
              name: name ? name.textContent.trim() : null,
              price: price ? price.textContent.trim() : null,
              image: image ? image.src : null,
              rating: rating ? rating.textContent.trim() : null,
              sold: sold ? sold.textContent.trim() : null,
            };
          }).filter(item => item.url);
        });

        products.push(...pageProducts);

        // Check for next page
        hasNextPage = await page.$('.pagination .next:not(.disabled)') !== null;
        currentPage++;

        logger.scraper(`Category page ${currentPage - 1} completed. Products: ${pageProducts.length}`);
        
        // Add delay between pages
        await this.stealthConfig.randomWait(2000, 4000);
      }

      return {
        categoryUrl,
        totalProducts: products.length,
        totalPages: currentPage - 1,
        products,
        scrapedAt: new Date().toISOString(),
        accountId,
      };

    } catch (error) {
      logger.error(`Failed to scrape category: ${categoryUrl}`, error);
      throw error;
    }
  }

  /**
   * Scrape search results
   */
  async scrapeSearch(page, { query, maxPages = 5, filters = {}, accountId }) {
    try {
      logger.scraper(`Scraping search results for: ${query}`);

      // Build search URL with filters
      const searchUrl = this.buildSearchUrl(query, filters);
      
      const products = [];
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && currentPage <= maxPages) {
        // Navigate to search page
        const pageUrl = `${searchUrl}&page=${currentPage}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        // Wait for search results
        await page.waitForSelector('.search-product-item', { timeout: 15000 });

        // Extract product data from search results
        const pageProducts = await page.evaluate(() => {
          const items = document.querySelectorAll('.search-product-item');
          return Array.from(items).map(item => {
            const link = item.querySelector('a');
            const name = item.querySelector('.product-name');
            const price = item.querySelector('.product-price');
            const image = item.querySelector('img');
            const rating = item.querySelector('.rating');
            const sold = item.querySelector('.sold-count');
            const location = item.querySelector('.shop-location');

            return {
              url: link ? link.href : null,
              name: name ? name.textContent.trim() : null,
              price: price ? price.textContent.trim() : null,
              image: image ? image.src : null,
              rating: rating ? rating.textContent.trim() : null,
              sold: sold ? sold.textContent.trim() : null,
              location: location ? location.textContent.trim() : null,
            };
          }).filter(item => item.url);
        });

        products.push(...pageProducts);

        // Check for next page
        hasNextPage = await page.$('.pagination .next:not(.disabled)') !== null;
        currentPage++;

        logger.scraper(`Search page ${currentPage - 1} completed. Products: ${pageProducts.length}`);
        
        // Add delay between pages
        await this.stealthConfig.randomWait(2000, 4000);
      }

      return {
        query,
        filters,
        totalProducts: products.length,
        totalPages: currentPage - 1,
        products,
        scrapedAt: new Date().toISOString(),
        accountId,
      };

    } catch (error) {
      logger.error(`Failed to scrape search results for: ${query}`, error);
      throw error;
    }
  }

  /**
   * Build search URL with filters
   */
  buildSearchUrl(query, filters = {}) {
    const baseUrl = 'https://shopee.co.id/search';
    const params = new URLSearchParams();
    
    params.append('keyword', query);
    
    if (filters.minPrice) params.append('price_min', filters.minPrice);
    if (filters.maxPrice) params.append('price_max', filters.maxPrice);
    if (filters.rating) params.append('rating_filter', filters.rating);
    if (filters.location) params.append('location', filters.location);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.order) params.append('order', filters.order);

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Bulk scrape products
   */
  async bulkScrapeProducts(productUrls, accountId = null) {
    try {
      logger.scraper(`Starting bulk scrape for ${productUrls.length} products`);

      const tasks = productUrls.map(url => ({
        url,
        taskType: 'product',
        accountId,
      }));

      const results = await this.addTasks(tasks);
      await this.waitForCompletion();

      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedResults = results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      logger.scraper(`Bulk scrape completed. Success: ${successfulResults.length}, Failed: ${failedResults.length}`);

      return {
        total: productUrls.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        products: successfulResults,
        errors: failedResults,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Bulk scrape failed:', error);
      throw error;
    }
  }
}

module.exports = ProductScraper;
