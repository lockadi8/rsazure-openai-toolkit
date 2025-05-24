const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const rateLimiter = require('../middleware/rateLimiter');
const { body, query } = require('express-validator');

// Validation rules
const searchValidation = [
  body('query')
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query is required and must be less than 200 characters')
    .trim(),
  body('maxPages')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max pages must be between 1 and 50'),
  body('filters')
    .optional()
    .isObject()
    .withMessage('Filters must be an object'),
  body('filters.category')
    .optional()
    .isString()
    .trim(),
  body('filters.priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  body('filters.priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  body('filters.location')
    .optional()
    .isString()
    .trim(),
  body('filters.rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
];

const productValidation = [
  body('url')
    .isURL()
    .withMessage('Valid product URL is required')
    .custom((value) => {
      if (!value.includes('shopee.co.id')) {
        throw new Error('URL must be from Shopee Indonesia');
      }
      return true;
    }),
];

const bulkProductValidation = [
  body('urls')
    .isArray({ min: 1, max: 100 })
    .withMessage('URLs array is required and must contain 1-100 URLs'),
  body('urls.*')
    .isURL()
    .withMessage('Each URL must be valid')
    .custom((value) => {
      if (!value.includes('shopee.co.id')) {
        throw new Error('All URLs must be from Shopee Indonesia');
      }
      return true;
    }),
];

const shopValidation = [
  body('shopUrl')
    .isURL()
    .withMessage('Valid shop URL is required')
    .custom((value) => {
      if (!value.includes('shopee.co.id')) {
        throw new Error('Shop URL must be from Shopee Indonesia');
      }
      return true;
    }),
  body('maxProducts')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max products must be between 1 and 1000'),
];

const categoryValidation = [
  body('categoryUrl')
    .isURL()
    .withMessage('Valid category URL is required')
    .custom((value) => {
      if (!value.includes('shopee.co.id')) {
        throw new Error('Category URL must be from Shopee Indonesia');
      }
      return true;
    }),
  body('maxPages')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max pages must be between 1 and 20'),
];

// Search and scrape products
router.post('/search', rateLimiter.scraper, searchValidation, scraperController.searchProducts);

// Scrape single product
router.post('/product', rateLimiter.scraper, productValidation, scraperController.scrapeProduct);

// Scrape multiple products
router.post('/products/bulk', rateLimiter.scraper, bulkProductValidation, scraperController.scrapeProductsBulk);

// Scrape shop products
router.post('/shop', rateLimiter.scraper, shopValidation, scraperController.scrapeShop);

// Scrape category products
router.post('/category', rateLimiter.scraper, categoryValidation, scraperController.scrapeCategory);

// Get scraping job status
router.get('/jobs/:jobId', scraperController.getJobStatus);

// Get user's scraping jobs
router.get('/jobs', scraperController.getUserJobs);

// Cancel scraping job
router.delete('/jobs/:jobId', scraperController.cancelJob);

// Get scraping statistics
router.get('/stats', scraperController.getStats);

// Get scraping queue status
router.get('/queue/status', scraperController.getQueueStatus);

// Retry failed job
router.post('/jobs/:jobId/retry', scraperController.retryJob);

// Export scraped data
router.get('/export/:jobId', scraperController.exportData);

// Get available categories
router.get('/categories', scraperController.getCategories);

// Get trending searches
router.get('/trending', scraperController.getTrendingSearches);

// Validate URL before scraping
router.post('/validate-url', [
  body('url')
    .isURL()
    .withMessage('Valid URL is required'),
], scraperController.validateUrl);

module.exports = router;
