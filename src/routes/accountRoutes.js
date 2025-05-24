const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const rateLimiter = require('../middleware/rateLimiter');
const { body, param, query } = require('express-validator');

// Validation middleware
const accountValidation = [
  body('username')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

const updateAccountValidation = [
  body('settings.autoSync')
    .optional()
    .isBoolean()
    .withMessage('autoSync must be a boolean'),
  body('settings.syncInterval')
    .optional()
    .isInt({ min: 300, max: 86400 })
    .withMessage('syncInterval must be between 300 and 86400 seconds'),
  body('settings.notifications')
    .optional()
    .isBoolean()
    .withMessage('notifications must be a boolean'),
  body('settings.categories')
    .optional()
    .isArray()
    .withMessage('categories must be an array'),
  body('settings.priceRange.min')
    .optional()
    .isNumeric()
    .withMessage('priceRange.min must be a number'),
  body('settings.priceRange.max')
    .optional()
    .isNumeric()
    .withMessage('priceRange.max must be a number')
];

const accountIdValidation = [
  param('accountId')
    .isString()
    .notEmpty()
    .withMessage('Account ID is required')
];

const syncValidation = [
  body('force')
    .optional()
    .isBoolean()
    .withMessage('force must be a boolean')
];

const statsQueryValidation = [
  query('timeRange')
    .optional()
    .isIn(['7d', '30d', '90d', '180d', '365d'])
    .withMessage('timeRange must be one of: 7d, 30d, 90d, 180d, 365d')
];

/**
 * @route   GET /api/accounts
 * @desc    Get all Shopee accounts for authenticated user
 * @access  Private
 */
router.get('/', rateLimiter.general, accountController.getAccounts);

/**
 * @route   GET /api/accounts/:accountId
 * @desc    Get specific Shopee account by ID
 * @access  Private
 */
router.get('/:accountId', [
  rateLimiter.general,
  ...accountIdValidation
], accountController.getAccountById);

/**
 * @route   POST /api/accounts
 * @desc    Add new Shopee account
 * @access  Private
 */
router.post('/', [
  rateLimiter.general,
  ...accountValidation
], accountController.addAccount);

/**
 * @route   PUT /api/accounts/:accountId
 * @desc    Update Shopee account settings
 * @access  Private
 */
router.put('/:accountId', [
  rateLimiter.general,
  ...accountIdValidation,
  ...updateAccountValidation
], accountController.updateAccount);

/**
 * @route   DELETE /api/accounts/:accountId
 * @desc    Delete Shopee account
 * @access  Private
 */
router.delete('/:accountId', [
  rateLimiter.general,
  ...accountIdValidation
], accountController.deleteAccount);

/**
 * @route   POST /api/accounts/:accountId/verify
 * @desc    Verify Shopee account credentials
 * @access  Private
 */
router.post('/:accountId/verify', [
  rateLimiter.general,
  ...accountIdValidation
], accountController.verifyAccount);

/**
 * @route   POST /api/accounts/:accountId/sync
 * @desc    Trigger manual sync for Shopee account
 * @access  Private
 */
router.post('/:accountId/sync', [
  rateLimiter.scraper,
  ...accountIdValidation,
  ...syncValidation
], accountController.syncAccount);

/**
 * @route   GET /api/accounts/:accountId/sync/status
 * @desc    Get sync status for Shopee account
 * @access  Private
 */
router.get('/:accountId/sync/status', [
  rateLimiter.general,
  ...accountIdValidation
], accountController.getSyncStatus);

/**
 * @route   GET /api/accounts/:accountId/stats
 * @desc    Get statistics for Shopee account
 * @access  Private
 */
router.get('/:accountId/stats', [
  rateLimiter.general,
  ...accountIdValidation,
  ...statsQueryValidation
], accountController.getAccountStats);

module.exports = router;
