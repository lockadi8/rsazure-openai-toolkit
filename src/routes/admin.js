const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const rateLimiter = require('../middleware/rateLimiter');
const { body, query, param } = require('express-validator');

// System management
router.get('/system/status', rateLimiter.admin, adminController.getSystemStatus);
router.get('/system/health', rateLimiter.admin, adminController.getSystemHealth);
router.get('/system/metrics', rateLimiter.admin, adminController.getSystemMetrics);
router.post('/system/restart', rateLimiter.admin, adminController.restartSystem);
router.post('/system/maintenance', rateLimiter.admin, adminController.toggleMaintenanceMode);

// User management
router.get('/users', rateLimiter.admin, adminController.getUsers);
router.get('/users/:userId', rateLimiter.admin, adminController.getUserById);
router.put('/users/:userId', rateLimiter.admin, adminController.updateUser);
router.delete('/users/:userId', rateLimiter.admin, adminController.deleteUser);
router.post('/users/:userId/activate', rateLimiter.admin, adminController.activateUser);
router.post('/users/:userId/deactivate', rateLimiter.admin, adminController.deactivateUser);

// Product management
router.get('/products/stats', rateLimiter.admin, adminController.getProductStats);
router.get('/products/duplicates', rateLimiter.admin, adminController.findDuplicateProducts);
router.post('/products/cleanup', rateLimiter.admin, adminController.cleanupProducts);
router.post('/products/reindex', rateLimiter.admin, adminController.reindexProducts);
router.delete('/products/inactive', rateLimiter.admin, adminController.removeInactiveProducts);

module.exports = router;
