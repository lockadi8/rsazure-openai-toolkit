const express = require('express');
const { query, body } = require('express-validator');
const searchController = require('../controllers/searchController');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @route   GET /api/search/products
 * @desc    Advanced product search with filters
 * @access  Public
 */
router.get(
  '/products',
  [
    rateLimiter.search,
    query('q').optional().isString().trim().isLength({ max: 200 }),
    query('category').optional().isString().trim(),
    query('brand').optional().isString().trim(),
    query('shopId').optional().isString().trim(),
    query('priceMin').optional().isFloat({ min: 0 }),
    query('priceMax').optional().isFloat({ min: 0 }),
    query('rating').optional().isFloat({ min: 0, max: 5 }),
    query('freeShipping').optional().isBoolean(),
    query('inStock').optional().isBoolean(),
    query('location').optional().isString().trim(),
    query('sort').optional().isIn(['price', 'rating', 'soldCount', 'reviewCount', 'popularityScore', 'createdAt']),
    query('order').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeAggregations').optional().isBoolean(),
  ],
  searchController.searchProducts
);

/**
 * @route   GET /api/search/autocomplete
 * @desc    Product name autocomplete
 * @access  Public
 */
router.get(
  '/autocomplete',
  [
    rateLimiter.autocomplete,
    query('q').notEmpty().isString().trim().isLength({ min: 2, max: 100 }),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  searchController.autocomplete
);

/**
 * @route   GET /api/search/suggestions
 * @desc    Search with spell correction and suggestions
 * @access  Public
 */
router.get(
  '/suggestions',
  [
    rateLimiter.search,
    query('q').notEmpty().isString().trim().isLength({ max: 200 }),
    query('category').optional().isString().trim(),
    query('brand').optional().isString().trim(),
    query('priceMin').optional().isFloat({ min: 0 }),
    query('priceMax').optional().isFloat({ min: 0 }),
    query('rating').optional().isFloat({ min: 0, max: 5 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  searchController.searchWithSuggestions
);

/**
 * @route   GET /api/search/similar/:productId
 * @desc    Find similar products
 * @access  Public
 */
router.get(
  '/similar/:productId',
  [rateLimiter.search, query('limit').optional().isInt({ min: 1, max: 20 })],
  searchController.findSimilar
);

/**
 * @route   GET /api/search/trending
 * @desc    Get trending products
 * @access  Public
 */
router.get(
  '/trending',
  [
    rateLimiter.search,
    query('timeRange').optional().isIn(['1d', '3d', '7d', '14d', '30d']),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  searchController.getTrending
);

/**
 * @route   GET /api/search/analytics/products
 * @desc    Get product analytics and insights
 * @access  Private (Admin/Analyst)
 */
router.get(
  '/analytics/products',
  [
    auth.authenticate,
    auth.requireRole('admin'),
    rateLimiter.analytics,
    query('timeRange').optional().isIn(['7d', '14d', '30d', '90d', '180d', '365d']),
    query('category').optional().isString().trim(),
    query('brand').optional().isString().trim(),
  ],
  searchController.getProductAnalytics
);

/**
 * @route   GET /api/search/analytics/orders
 * @desc    Get order analytics and reporting
 * @access  Private (Admin/Analyst)
 */
router.get(
  '/analytics/orders',
  [
    auth.authenticate,
    auth.requireRole('admin'),
    rateLimiter.analytics,
    query('timeRange').optional().isIn(['7d', '14d', '30d', '90d', '180d', '365d']),
    query('category').optional().isString().trim(),
    query('shopId').optional().isString().trim(),
    query('paymentMethod').optional().isString().trim(),
  ],
  searchController.getOrderAnalytics
);

/**
 * @route   GET /api/search/analytics/revenue
 * @desc    Get revenue trends analysis
 * @access  Private (Admin/Analyst)
 */
router.get(
  '/analytics/revenue',
  [
    auth.authenticate,
    auth.requireRole('admin'),
    rateLimiter.analytics,
    query('timeRange').optional().isIn(['30d', '90d', '180d', '365d']),
    query('interval').optional().isIn(['day', 'week', 'month']),
  ],
  searchController.getRevenueTrends
);

/**
 * @route   POST /api/search/sync
 * @desc    Sync data from MongoDB to Elasticsearch
 * @access  Private (Admin only)
 */
router.post(
  '/sync',
  [
    auth.authenticate,
    auth.requireRole('admin'),
    body('type').optional().isIn(['full', 'incremental']),
    body('force').optional().isBoolean(),
  ],
  searchController.syncData
);

/**
 * @route   GET /api/search/sync/status
 * @desc    Get data sync status
 * @access  Private (Admin/Analyst)
 */
router.get('/sync/status', [auth.authenticate, auth.requireRole('admin')], searchController.getSyncStatus);

/**
 * @route   GET /api/search/health
 * @desc    Get Elasticsearch health status
 * @access  Private (Admin only)
 */
router.get('/health', [auth.authenticate, auth.requireRole('admin')], searchController.getHealth);

module.exports = router;
