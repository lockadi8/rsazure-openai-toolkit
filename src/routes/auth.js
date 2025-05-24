const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { body } = require('express-validator');

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters')
    .trim(),
  body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters')
    .trim(),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

// Public routes (with rate limiting)
router.post('/register', rateLimiter.auth, registerValidation, authController.register);
router.post('/login', rateLimiter.auth, auth.limitLoginAttempts, loginValidation, authController.login);
router.post('/refresh', rateLimiter.auth, auth.validateRefreshToken, authController.refreshToken);
router.post('/forgot-password', rateLimiter.auth, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', rateLimiter.auth, resetPasswordValidation, authController.resetPassword);
router.get('/verify-email/:token', rateLimiter.auth, authController.verifyEmail);

// Protected routes
router.get('/me', auth.authenticate, authController.getProfile);
router.put('/me', auth.authenticate, authController.updateProfile);
router.post('/change-password', auth.authenticate, changePasswordValidation, authController.changePassword);
router.post('/logout', auth.authenticate, authController.logout);
router.post('/logout-all', auth.authenticate, authController.logoutAll);

// API key management
router.post('/generate-api-key', auth.authenticate, authController.generateApiKey);
router.delete('/revoke-api-key', auth.authenticate, authController.revokeApiKey);

// Admin routes
router.get('/users', auth.authenticate, auth.requireRole('admin'), authController.getUsers);
router.get('/users/:userId', auth.authenticate, auth.requireRole('admin'), authController.getUserById);
router.put('/users/:userId', auth.authenticate, auth.requireRole('admin'), authController.updateUser);
router.delete('/users/:userId', auth.authenticate, auth.requireRole('admin'), authController.deleteUser);
router.post('/users/:userId/activate', auth.authenticate, auth.requireRole('admin'), authController.activateUser);
router.post('/users/:userId/deactivate', auth.authenticate, auth.requireRole('admin'), authController.deactivateUser);

module.exports = router;
