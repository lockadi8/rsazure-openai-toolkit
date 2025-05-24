const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const rateLimiter = require('../middleware/rateLimiter');
const { param, query } = require('express-validator');

// Validation middleware
const orderQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status value'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('minAmount')
    .optional()
    .isNumeric()
    .withMessage('minAmount must be a number'),
  query('maxAmount')
    .optional()
    .isNumeric()
    .withMessage('maxAmount must be a number'),
  query('accountId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('accountId must be a non-empty string'),
  query('sort')
    .optional()
    .isIn(['orderDate', 'finalAmount', 'status', 'orderId'])
    .withMessage('sort must be one of: orderDate, finalAmount, status, orderId'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('order must be either asc or desc')
];

const orderIdValidation = [
  param('orderId')
    .isString()
    .notEmpty()
    .withMessage('Order ID is required')
];

const analyticsQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('groupBy')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('groupBy must be one of: hour, day, week, month')
];

const exportQueryValidation = [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('format must be either json or csv'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'])
    .withMessage('Invalid status value')
];

/**
 * @route   GET /api/orders
 * @desc    Get orders with filters and pagination
 * @access  Private
 */
router.get('/', [
  rateLimiter.general,
  ...orderQueryValidation
], orderController.getOrders);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get specific order by ID
 * @access  Private
 */
router.get('/:orderId', [
  rateLimiter.general,
  ...orderIdValidation
], orderController.getOrderById);

/**
 * @route   GET /api/orders/analytics/summary
 * @desc    Get order analytics and trends
 * @access  Private
 */
router.get('/analytics/summary', [
  rateLimiter.general,
  ...analyticsQueryValidation
], orderController.getOrderAnalytics);

/**
 * @route   GET /api/orders/export/data
 * @desc    Export orders data in JSON or CSV format
 * @access  Private
 */
router.get('/export/data', [
  rateLimiter.general,
  ...exportQueryValidation
], orderController.exportOrders);

module.exports = router;
