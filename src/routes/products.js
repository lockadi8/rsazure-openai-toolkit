const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const rateLimiter = require('../middleware/rateLimiter');
const { query, param } = require('express-validator');

// Validation rules
const searchQueryValidation = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be less than 200 characters')
    .trim(),
  query('category')
    .optional()
    .isString()
    .trim(),
  query('brand')
    .optional()
    .isString()
    .trim(),
  query('priceMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('priceMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  query('sort')
    .optional()
    .isIn(['price', 'rating', 'soldCount', 'createdAt', 'relevance'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const productIdValidation = [
  param('productId')
    .isString()
    .notEmpty()
    .withMessage('Product ID is required'),
];

// Get all products with search and filters
router.get('/', rateLimiter.search, searchQueryValidation, productController.getProducts);

// Get product by ID
router.get('/:productId', productIdValidation, productController.getProductById);

// Get product price history
router.get('/:productId/price-history', productIdValidation, productController.getPriceHistory);

// Get similar products
router.get('/:productId/similar', productIdValidation, productController.getSimilarProducts);

// Get product reviews summary
router.get('/:productId/reviews', productIdValidation, productController.getProductReviews);

// Get products by category
router.get('/category/:category', [
  param('category')
    .isString()
    .notEmpty()
    .withMessage('Category is required'),
  ...searchQueryValidation,
], productController.getProductsByCategory);

// Get products by shop
router.get('/shop/:shopId', [
  param('shopId')
    .isString()
    .notEmpty()
    .withMessage('Shop ID is required'),
  ...searchQueryValidation,
], productController.getProductsByShop);

// Get top rated products
router.get('/top/rated', searchQueryValidation, productController.getTopRatedProducts);

// Get best selling products
router.get('/top/bestsellers', searchQueryValidation, productController.getBestSellingProducts);

// Get trending products
router.get('/top/trending', searchQueryValidation, productController.getTrendingProducts);

// Get products with discounts
router.get('/deals/discounts', searchQueryValidation, productController.getDiscountedProducts);

// Get new arrivals
router.get('/new/arrivals', searchQueryValidation, productController.getNewArrivals);

// Get product statistics
router.get('/stats/overview', productController.getProductStats);

// Get categories with product counts
router.get('/categories/list', productController.getCategories);

// Get brands with product counts
router.get('/brands/list', productController.getBrands);

// Get shops with product counts
router.get('/shops/list', productController.getShops);

// Search suggestions
router.get('/search/suggestions', [
  query('q')
    .isLength({ min: 1, max: 100 })
    .withMessage('Query is required and must be less than 100 characters')
    .trim(),
], productController.getSearchSuggestions);

// Advanced search with Elasticsearch
router.post('/search/advanced', rateLimiter.search, productController.advancedSearch);

// Compare products
router.post('/compare', [
  query('ids')
    .isString()
    .custom((value) => {
      const ids = value.split(',');
      if (ids.length < 2 || ids.length > 5) {
        throw new Error('Must compare between 2 and 5 products');
      }
      return true;
    }),
], productController.compareProducts);

// Get product availability
router.get('/:productId/availability', productIdValidation, productController.getProductAvailability);

// Track product price
router.post('/:productId/track', productIdValidation, productController.trackProduct);

// Untrack product price
router.delete('/:productId/track', productIdValidation, productController.untrackProduct);

// Get user's tracked products
router.get('/user/tracked', productController.getTrackedProducts);

// Export products data
router.get('/export/csv', productController.exportProductsCSV);
router.get('/export/json', productController.exportProductsJSON);

module.exports = router;
