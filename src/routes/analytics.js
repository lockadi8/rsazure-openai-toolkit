const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const rateLimiter = require('../middleware/rateLimiter');
const { query } = require('express-validator');

// Validation rules
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('period')
    .optional()
    .isIn(['1h', '24h', '7d', '30d', '90d', '1y'])
    .withMessage('Period must be one of: 1h, 24h, 7d, 30d, 90d, 1y'),
];

// Dashboard overview
router.get('/dashboard', rateLimiter.general, analyticsController.getDashboardOverview);

// Product analytics
router.get('/products', rateLimiter.general, dateRangeValidation, analyticsController.getProductAnalytics);

// Scraping analytics
router.get('/scraping', rateLimiter.general, dateRangeValidation, analyticsController.getScrapingAnalytics);

// User analytics
router.get('/users', rateLimiter.general, dateRangeValidation, analyticsController.getUserAnalytics);

// System analytics
router.get('/system/health', rateLimiter.general, analyticsController.getSystemHealth);
router.get('/system/performance', rateLimiter.general, dateRangeValidation, analyticsController.getSystemPerformance);
router.get('/system/errors', rateLimiter.general, dateRangeValidation, analyticsController.getSystemErrors);

// Export analytics data
router.get('/export/products', rateLimiter.general, dateRangeValidation, analyticsController.exportProductAnalytics);
router.get('/export/scraping', rateLimiter.general, dateRangeValidation, analyticsController.exportScrapingAnalytics);
router.get('/export/users', rateLimiter.general, dateRangeValidation, analyticsController.exportUserAnalytics);

module.exports = router;
