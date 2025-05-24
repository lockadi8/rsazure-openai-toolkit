const BaseScraper = require('./BaseScraper');
const logger = require('../../utils/logger');

/**
 * Order Scraper untuk Shopee dengan comprehensive order tracking
 * Menangani order history, detail extraction, payment & shipping info
 */
class OrderScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      concurrent: 1, // Order scraping should be sequential for security
      ...options,
    });

    this.orderHistoryUrl = 'https://shopee.co.id/user/purchase';
    this.orderDetailBaseUrl = 'https://shopee.co.id/user/purchase/order';
    this.orderStatuses = {
      'TO_PAY': 'Menunggu Pembayaran',
      'TO_SHIP': 'Dikemas',
      'TO_RECEIVE': 'Dikirim',
      'COMPLETED': 'Selesai',
      'CANCELLED': 'Dibatalkan',
      'RETURN_REFUND': 'Pengembalian',
    };
  }

  /**
   * Handle order scraping tasks
   */
  async handleTask(page, taskType, taskData) {
    switch (taskType) {
      case 'order-history':
        return await this.scrapeOrderHistory(page, taskData);
      case 'order-detail':
        return await this.scrapeOrderDetail(page, taskData);
      case 'order-tracking':
        return await this.scrapeOrderTracking(page, taskData);
      case 'payment-info':
        return await this.scrapePaymentInfo(page, taskData);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  /**
   * Scrape order history dengan pagination
   */
  async scrapeOrderHistory(page, { accountId, status = 'ALL', maxPages = 10 }) {
    try {
      logger.scraper(`Scraping order history for account: ${accountId}`);

      const orders = [];
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage && currentPage <= maxPages) {
        // Navigate to order history page
        const pageUrl = this.buildOrderHistoryUrl(status, currentPage);
        await page.goto(pageUrl, { waitUntil: 'networkidle0' });

        // Check if user is logged in
        await this.verifyLoginStatus(page);

        // Wait for orders to load
        await page.waitForSelector('.order-list-card, .empty-state', { timeout: 15000 });

        // Check if there are orders
        const hasOrders = await page.$('.order-list-card') !== null;
        if (!hasOrders) {
          logger.scraper('No orders found on this page');
          break;
        }

        // Extract orders from current page
        const pageOrders = await this.extractOrdersFromPage(page);
        orders.push(...pageOrders);

        // Check for next page
        hasNextPage = await this.hasNextPage(page);
        currentPage++;

        logger.scraper(`Page ${currentPage - 1} completed. Orders: ${pageOrders.length}`);
        
        // Add delay between pages
        await this.stealthConfig.randomWait(2000, 4000);
      }

      return {
        accountId,
        status,
        totalOrders: orders.length,
        totalPages: currentPage - 1,
        orders,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape order history for account: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * Extract orders from current page
   */
  async extractOrdersFromPage(page) {
    return await page.evaluate(() => {
      const orderCards = document.querySelectorAll('.order-list-card');
      return Array.from(orderCards).map(card => {
        // Extract basic order info
        const orderIdElement = card.querySelector('.order-id');
        const orderId = orderIdElement ? orderIdElement.textContent.trim() : null;

        const statusElement = card.querySelector('.order-status');
        const status = statusElement ? statusElement.textContent.trim() : null;

        const dateElement = card.querySelector('.order-date');
        const orderDate = dateElement ? dateElement.textContent.trim() : null;

        const totalElement = card.querySelector('.order-total');
        const total = totalElement ? totalElement.textContent.trim() : null;

        // Extract shop info
        const shopElement = card.querySelector('.shop-name');
        const shopName = shopElement ? shopElement.textContent.trim() : null;

        // Extract products
        const productElements = card.querySelectorAll('.order-product-item');
        const products = Array.from(productElements).map(product => {
          const nameElement = product.querySelector('.product-name');
          const priceElement = product.querySelector('.product-price');
          const quantityElement = product.querySelector('.product-quantity');
          const imageElement = product.querySelector('.product-image img');

          return {
            name: nameElement ? nameElement.textContent.trim() : null,
            price: priceElement ? priceElement.textContent.trim() : null,
            quantity: quantityElement ? quantityElement.textContent.trim() : null,
            image: imageElement ? imageElement.src : null,
          };
        });

        // Extract action buttons
        const detailButton = card.querySelector('.order-detail-btn');
        const detailUrl = detailButton ? detailButton.href : null;

        const trackingButton = card.querySelector('.order-tracking-btn');
        const trackingUrl = trackingButton ? trackingButton.href : null;

        return {
          orderId,
          status,
          orderDate,
          total,
          shopName,
          products,
          detailUrl,
          trackingUrl,
          productCount: products.length,
        };
      });
    });
  }

  /**
   * Scrape detailed order information
   */
  async scrapeOrderDetail(page, { orderId, accountId }) {
    try {
      logger.scraper(`Scraping order detail: ${orderId}`);

      // Navigate to order detail page
      const detailUrl = `${this.orderDetailBaseUrl}/${orderId}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle0' });

      // Verify login and order access
      await this.verifyLoginStatus(page);
      await page.waitForSelector('.order-detail-container', { timeout: 15000 });

      // Extract comprehensive order details
      const orderDetail = await page.evaluate(() => {
        const container = document.querySelector('.order-detail-container');
        if (!container) return null;

        // Basic order info
        const orderInfo = {
          orderId: container.querySelector('.order-id')?.textContent?.trim(),
          status: container.querySelector('.order-status')?.textContent?.trim(),
          orderDate: container.querySelector('.order-date')?.textContent?.trim(),
          paymentMethod: container.querySelector('.payment-method')?.textContent?.trim(),
          shippingMethod: container.querySelector('.shipping-method')?.textContent?.trim(),
        };

        // Shop information
        const shopInfo = {
          name: container.querySelector('.shop-name')?.textContent?.trim(),
          location: container.querySelector('.shop-location')?.textContent?.trim(),
          rating: container.querySelector('.shop-rating')?.textContent?.trim(),
        };

        // Shipping address
        const shippingAddress = {
          recipient: container.querySelector('.recipient-name')?.textContent?.trim(),
          phone: container.querySelector('.recipient-phone')?.textContent?.trim(),
          address: container.querySelector('.shipping-address')?.textContent?.trim(),
        };

        // Products
        const productElements = container.querySelectorAll('.order-product-detail');
        const products = Array.from(productElements).map(product => ({
          name: product.querySelector('.product-name')?.textContent?.trim(),
          variant: product.querySelector('.product-variant')?.textContent?.trim(),
          price: product.querySelector('.product-price')?.textContent?.trim(),
          quantity: product.querySelector('.product-quantity')?.textContent?.trim(),
          subtotal: product.querySelector('.product-subtotal')?.textContent?.trim(),
          image: product.querySelector('.product-image img')?.src,
        }));

        // Price breakdown
        const priceBreakdown = {
          subtotal: container.querySelector('.price-subtotal')?.textContent?.trim(),
          shipping: container.querySelector('.price-shipping')?.textContent?.trim(),
          discount: container.querySelector('.price-discount')?.textContent?.trim(),
          total: container.querySelector('.price-total')?.textContent?.trim(),
        };

        // Order timeline
        const timelineElements = container.querySelectorAll('.order-timeline-item');
        const timeline = Array.from(timelineElements).map(item => ({
          status: item.querySelector('.timeline-status')?.textContent?.trim(),
          date: item.querySelector('.timeline-date')?.textContent?.trim(),
          description: item.querySelector('.timeline-description')?.textContent?.trim(),
        }));

        return {
          orderInfo,
          shopInfo,
          shippingAddress,
          products,
          priceBreakdown,
          timeline,
        };
      });

      if (!orderDetail) {
        throw new Error('Failed to extract order detail');
      }

      return {
        orderId,
        accountId,
        ...orderDetail,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape order detail: ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Scrape order tracking information
   */
  async scrapeOrderTracking(page, { orderId, accountId }) {
    try {
      logger.scraper(`Scraping order tracking: ${orderId}`);

      // Navigate to tracking page
      const trackingUrl = `${this.orderDetailBaseUrl}/${orderId}/tracking`;
      await page.goto(trackingUrl, { waitUntil: 'networkidle0' });

      await page.waitForSelector('.tracking-container', { timeout: 15000 });

      const trackingInfo = await page.evaluate(() => {
        const container = document.querySelector('.tracking-container');
        if (!container) return null;

        // Current status
        const currentStatus = {
          status: container.querySelector('.current-status')?.textContent?.trim(),
          description: container.querySelector('.current-description')?.textContent?.trim(),
          estimatedDelivery: container.querySelector('.estimated-delivery')?.textContent?.trim(),
        };

        // Tracking number
        const trackingNumber = container.querySelector('.tracking-number')?.textContent?.trim();
        const courier = container.querySelector('.courier-name')?.textContent?.trim();

        // Tracking history
        const historyElements = container.querySelectorAll('.tracking-history-item');
        const history = Array.from(historyElements).map(item => ({
          date: item.querySelector('.tracking-date')?.textContent?.trim(),
          time: item.querySelector('.tracking-time')?.textContent?.trim(),
          status: item.querySelector('.tracking-status')?.textContent?.trim(),
          location: item.querySelector('.tracking-location')?.textContent?.trim(),
          description: item.querySelector('.tracking-description')?.textContent?.trim(),
        }));

        // Shipping details
        const shippingDetails = {
          origin: container.querySelector('.shipping-origin')?.textContent?.trim(),
          destination: container.querySelector('.shipping-destination')?.textContent?.trim(),
          weight: container.querySelector('.package-weight')?.textContent?.trim(),
          dimensions: container.querySelector('.package-dimensions')?.textContent?.trim(),
        };

        return {
          currentStatus,
          trackingNumber,
          courier,
          history,
          shippingDetails,
        };
      });

      return {
        orderId,
        accountId,
        ...trackingInfo,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape order tracking: ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Scrape payment information
   */
  async scrapePaymentInfo(page, { orderId, accountId }) {
    try {
      logger.scraper(`Scraping payment info: ${orderId}`);

      const paymentUrl = `${this.orderDetailBaseUrl}/${orderId}/payment`;
      await page.goto(paymentUrl, { waitUntil: 'networkidle0' });

      await page.waitForSelector('.payment-container', { timeout: 15000 });

      const paymentInfo = await page.evaluate(() => {
        const container = document.querySelector('.payment-container');
        if (!container) return null;

        // Payment method details
        const paymentMethod = {
          type: container.querySelector('.payment-type')?.textContent?.trim(),
          provider: container.querySelector('.payment-provider')?.textContent?.trim(),
          accountNumber: container.querySelector('.payment-account')?.textContent?.trim(),
        };

        // Payment status
        const paymentStatus = {
          status: container.querySelector('.payment-status')?.textContent?.trim(),
          paidAt: container.querySelector('.payment-date')?.textContent?.trim(),
          amount: container.querySelector('.payment-amount')?.textContent?.trim(),
        };

        // Transaction details
        const transaction = {
          transactionId: container.querySelector('.transaction-id')?.textContent?.trim(),
          referenceNumber: container.querySelector('.reference-number')?.textContent?.trim(),
          paymentDeadline: container.querySelector('.payment-deadline')?.textContent?.trim(),
        };

        // Payment breakdown
        const breakdown = {
          productTotal: container.querySelector('.product-total')?.textContent?.trim(),
          shippingFee: container.querySelector('.shipping-fee')?.textContent?.trim(),
          serviceFee: container.querySelector('.service-fee')?.textContent?.trim(),
          discount: container.querySelector('.discount-amount')?.textContent?.trim(),
          finalAmount: container.querySelector('.final-amount')?.textContent?.trim(),
        };

        return {
          paymentMethod,
          paymentStatus,
          transaction,
          breakdown,
        };
      });

      return {
        orderId,
        accountId,
        ...paymentInfo,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Failed to scrape payment info: ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Build order history URL with filters
   */
  buildOrderHistoryUrl(status = 'ALL', page = 1) {
    const params = new URLSearchParams();
    if (status !== 'ALL') params.append('type', status);
    params.append('page', page.toString());
    
    return `${this.orderHistoryUrl}?${params.toString()}`;
  }

  /**
   * Verify user is logged in
   */
  async verifyLoginStatus(page) {
    const currentUrl = page.url();
    if (currentUrl.includes('/buyer/login')) {
      throw new Error('User not logged in - redirected to login page');
    }

    // Check for login-required elements
    const loginRequired = await page.$('.login-required') !== null;
    if (loginRequired) {
      throw new Error('Login required to access order information');
    }
  }

  /**
   * Check if there's a next page
   */
  async hasNextPage(page) {
    try {
      const nextButton = await page.$('.pagination .next:not(.disabled)');
      return nextButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Bulk scrape order details
   */
  async bulkScrapeOrderDetails(orderIds, accountId) {
    try {
      logger.scraper(`Starting bulk order detail scraping for ${orderIds.length} orders`);

      const tasks = orderIds.map(orderId => ({
        url: `${this.orderDetailBaseUrl}/${orderId}`,
        taskType: 'order-detail',
        orderId,
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

      logger.scraper(`Bulk order scraping completed. Success: ${successfulResults.length}, Failed: ${failedResults.length}`);

      return {
        total: orderIds.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        orders: successfulResults,
        errors: failedResults,
        scrapedAt: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('Bulk order scraping failed:', error);
      throw error;
    }
  }

  /**
   * Monitor order status changes
   */
  async monitorOrderStatus(orderIds, accountId, checkInterval = 3600000) {
    logger.scraper(`Starting order status monitoring for ${orderIds.length} orders`);

    const monitoringResults = [];

    const checkOrders = async () => {
      for (const orderId of orderIds) {
        try {
          const result = await this.addTask({
            url: `${this.orderDetailBaseUrl}/${orderId}`,
            taskType: 'order-detail',
            orderId,
            accountId,
          });

          monitoringResults.push({
            orderId,
            status: result.orderInfo.status,
            checkedAt: new Date().toISOString(),
          });

          logger.scraper(`Order ${orderId} status: ${result.orderInfo.status}`);
          
        } catch (error) {
          logger.error(`Failed to check order ${orderId}:`, error);
        }
      }
    };

    // Initial check
    await checkOrders();

    // Set up periodic monitoring
    const intervalId = setInterval(checkOrders, checkInterval);

    return {
      stop: () => clearInterval(intervalId),
      getResults: () => monitoringResults,
    };
  }
}

module.exports = OrderScraper;
