const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const elasticsearchService = require('../services/elasticsearch');

class ProductController {
  // Get products with search and filters
  async getProducts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const {
        q,
        category,
        brand,
        priceMin,
        priceMax,
        rating,
        sort = 'createdAt',
        order = 'desc',
        page = 1,
        limit = 20,
      } = req.query;

      // Build query
      const query = { isActive: true };
      
      if (category) query.category = category;
      if (brand) query.brand = brand;
      if (priceMin || priceMax) {
        query.price = {};
        if (priceMin) query.price.$gte = parseFloat(priceMin);
        if (priceMax) query.price.$lte = parseFloat(priceMax);
      }
      if (rating) query.rating = { $gte: parseFloat(rating) };

      // Text search
      if (q) {
        query.$text = { $search: q };
      }

      // Build sort
      const sortObj = {};
      if (q && !sort) {
        sortObj.score = { $meta: 'textScore' };
      } else {
        sortObj[sort] = order === 'asc' ? 1 : -1;
      }

      // Execute query
      const products = await Product.find(query)
        .sort(sortObj)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Product.countDocuments(query);

      res.json({
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          q,
          category,
          brand,
          priceMin,
          priceMax,
          rating,
          sort,
          order,
        },
      });
    } catch (error) {
      logger.error('Get products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching products',
      });
    }
  }

  // Get product by ID
  async getProductById(req, res) {
    try {
      const { productId } = req.params;

      const product = await Product.findOne({
        $or: [
          { _id: productId },
          { productId: productId },
        ],
        isActive: true,
      }).lean();

      if (!product) {
        return res.status(404).json({
          error: 'Product not found',
        });
      }

      res.json({ product });
    } catch (error) {
      logger.error('Get product by ID error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching product',
      });
    }
  }

  // Get product price history
  async getPriceHistory(req, res) {
    try {
      const { productId } = req.params;
      const { days = 30 } = req.query;

      // TODO: Implement price history tracking
      // This is a placeholder implementation
      
      const history = [
        { date: '2024-01-01', price: 1500000 },
        { date: '2024-01-02', price: 1450000 },
        { date: '2024-01-03', price: 1400000 },
        { date: '2024-01-04', price: 1350000 },
        { date: '2024-01-05', price: 1300000 },
      ];

      res.json({
        productId,
        days: parseInt(days),
        history,
        currentPrice: history[history.length - 1]?.price,
        lowestPrice: Math.min(...history.map(h => h.price)),
        highestPrice: Math.max(...history.map(h => h.price)),
      });
    } catch (error) {
      logger.error('Get price history error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching price history',
      });
    }
  }

  // Get similar products
  async getSimilarProducts(req, res) {
    try {
      const { productId } = req.params;
      const { limit = 10 } = req.query;

      const product = await Product.findOne({
        $or: [
          { _id: productId },
          { productId: productId },
        ],
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          error: 'Product not found',
        });
      }

      // Find similar products by category and price range
      const priceRange = product.price * 0.3; // 30% price range
      
      const similarProducts = await Product.find({
        _id: { $ne: product._id },
        category: product.category,
        price: {
          $gte: product.price - priceRange,
          $lte: product.price + priceRange,
        },
        isActive: true,
      })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        productId,
        similarProducts,
        count: similarProducts.length,
      });
    } catch (error) {
      logger.error('Get similar products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching similar products',
      });
    }
  }

  // Get product reviews summary
  async getProductReviews(req, res) {
    try {
      const { productId } = req.params;

      // TODO: Implement reviews scraping and storage
      // This is a placeholder implementation
      
      const reviewsSummary = {
        totalReviews: 1250,
        averageRating: 4.3,
        ratingDistribution: {
          5: 650,
          4: 400,
          3: 150,
          2: 30,
          1: 20,
        },
        recentReviews: [
          {
            rating: 5,
            comment: 'Produk sangat bagus, sesuai deskripsi',
            date: '2024-01-05',
            verified: true,
          },
          {
            rating: 4,
            comment: 'Kualitas oke, pengiriman cepat',
            date: '2024-01-04',
            verified: true,
          },
        ],
      };

      res.json({
        productId,
        reviews: reviewsSummary,
      });
    } catch (error) {
      logger.error('Get product reviews error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching product reviews',
      });
    }
  }

  // Get products by category
  async getProductsByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 20, sort = 'rating', order = 'desc' } = req.query;

      const products = await Product.findByCategory(category, {
        sort: { [sort]: order === 'asc' ? 1 : -1 },
        limit: limit * 1,
        skip: (page - 1) * limit,
      });

      const total = await Product.countDocuments({ category, isActive: true });

      res.json({
        category,
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get products by category error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching products by category',
      });
    }
  }

  // Get products by shop
  async getProductsByShop(req, res) {
    try {
      const { shopId } = req.params;
      const { page = 1, limit = 20, sort = 'soldCount', order = 'desc' } = req.query;

      const products = await Product.findByShop(shopId, {
        sort: { [sort]: order === 'asc' ? 1 : -1 },
        limit: limit * 1,
        skip: (page - 1) * limit,
      });

      const total = await Product.countDocuments({ shopId, isActive: true });

      // Get shop info from first product
      const shopInfo = products.length > 0 ? {
        shopId: products[0].shopId,
        shopName: products[0].shopName,
        shopLocation: products[0].shopLocation,
        shopRating: products[0].shopRating,
      } : null;

      res.json({
        shopId,
        shopInfo,
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get products by shop error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching products by shop',
      });
    }
  }

  // Get top rated products
  async getTopRatedProducts(req, res) {
    try {
      const { limit = 20, category } = req.query;
      
      const query = { isActive: true, reviewCount: { $gte: 10 } };
      if (category) query.category = category;

      const products = await Product.find(query)
        .sort({ rating: -1, reviewCount: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        products,
        count: products.length,
        category: category || 'all',
      });
    } catch (error) {
      logger.error('Get top rated products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching top rated products',
      });
    }
  }

  // Get best selling products
  async getBestSellingProducts(req, res) {
    try {
      const { limit = 20, category } = req.query;
      
      const query = { isActive: true, soldCount: { $gte: 1 } };
      if (category) query.category = category;

      const products = await Product.find(query)
        .sort({ soldCount: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        products,
        count: products.length,
        category: category || 'all',
      });
    } catch (error) {
      logger.error('Get best selling products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching best selling products',
      });
    }
  }

  // Get trending products
  async getTrendingProducts(req, res) {
    try {
      const { limit = 20, category } = req.query;
      
      // TODO: Implement trending algorithm based on recent activity
      // For now, use a combination of recent sales and rating
      
      const query = { isActive: true };
      if (category) query.category = category;

      const products = await Product.find(query)
        .sort({ 
          'metadata.lastUpdated': -1,
          soldCount: -1,
          rating: -1,
        })
        .limit(parseInt(limit))
        .lean();

      res.json({
        products,
        count: products.length,
        category: category || 'all',
      });
    } catch (error) {
      logger.error('Get trending products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching trending products',
      });
    }
  }

  // Get discounted products
  async getDiscountedProducts(req, res) {
    try {
      const { limit = 20, minDiscount = 10 } = req.query;
      
      const products = await Product.find({
        isActive: true,
        discount: { $gte: parseInt(minDiscount) },
        originalPrice: { $exists: true },
      })
        .sort({ discount: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        products,
        count: products.length,
        minDiscount: parseInt(minDiscount),
      });
    } catch (error) {
      logger.error('Get discounted products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching discounted products',
      });
    }
  }

  // Get new arrivals
  async getNewArrivals(req, res) {
    try {
      const { limit = 20, days = 7 } = req.query;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      const products = await Product.find({
        isActive: true,
        'metadata.scrapedAt': { $gte: cutoffDate },
      })
        .sort({ 'metadata.scrapedAt': -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        products,
        count: products.length,
        days: parseInt(days),
      });
    } catch (error) {
      logger.error('Get new arrivals error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching new arrivals',
      });
    }
  }

  // Get product statistics
  async getProductStats(req, res) {
    try {
      const stats = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$rating' },
            totalSoldCount: { $sum: '$soldCount' },
            categoriesCount: { $addToSet: '$category' },
            brandsCount: { $addToSet: '$brand' },
            shopsCount: { $addToSet: '$shopId' },
          },
        },
        {
          $project: {
            _id: 0,
            totalProducts: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            averageRating: { $round: ['$averageRating', 2] },
            totalSoldCount: 1,
            categoriesCount: { $size: '$categoriesCount' },
            brandsCount: { $size: '$brandsCount' },
            shopsCount: { $size: '$shopsCount' },
          },
        },
      ]);

      res.json({
        stats: stats[0] || {
          totalProducts: 0,
          averagePrice: 0,
          averageRating: 0,
          totalSoldCount: 0,
          categoriesCount: 0,
          brandsCount: 0,
          shopsCount: 0,
        },
      });
    } catch (error) {
      logger.error('Get product stats error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching product statistics',
      });
    }
  }

  // Get categories with product counts
  async getCategories(req, res) {
    try {
      const categories = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$rating' },
          },
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            averageRating: { $round: ['$averageRating', 2] },
          },
        },
        { $sort: { count: -1 } },
      ]);

      res.json({ categories });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching categories',
      });
    }
  }

  // Get brands with product counts
  async getBrands(req, res) {
    try {
      const brands = await Product.aggregate([
        { $match: { isActive: true, brand: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$brand',
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$rating' },
          },
        },
        {
          $project: {
            _id: 0,
            brand: '$_id',
            count: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            averageRating: { $round: ['$averageRating', 2] },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);

      res.json({ brands });
    } catch (error) {
      logger.error('Get brands error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching brands',
      });
    }
  }

  // Get shops with product counts
  async getShops(req, res) {
    try {
      const shops = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: {
              shopId: '$shopId',
              shopName: '$shopName',
              shopLocation: '$shopLocation',
            },
            count: { $sum: 1 },
            averagePrice: { $avg: '$price' },
            averageRating: { $avg: '$rating' },
            totalSoldCount: { $sum: '$soldCount' },
          },
        },
        {
          $project: {
            _id: 0,
            shopId: '$_id.shopId',
            shopName: '$_id.shopName',
            shopLocation: '$_id.shopLocation',
            count: 1,
            averagePrice: { $round: ['$averagePrice', 2] },
            averageRating: { $round: ['$averageRating', 2] },
            totalSoldCount: 1,
          },
        },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);

      res.json({ shops });
    } catch (error) {
      logger.error('Get shops error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching shops',
      });
    }
  }

  // Get search suggestions
  async getSearchSuggestions(req, res) {
    try {
      const { q } = req.query;
      
      // TODO: Implement search suggestions using Elasticsearch
      // This is a placeholder implementation
      
      const suggestions = [
        `${q} murah`,
        `${q} original`,
        `${q} terbaru`,
        `${q} berkualitas`,
        `${q} terlaris`,
      ].filter(suggestion => suggestion.length > q.length);

      res.json({
        query: q,
        suggestions: suggestions.slice(0, 5),
      });
    } catch (error) {
      logger.error('Get search suggestions error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching search suggestions',
      });
    }
  }

  // Advanced search with Elasticsearch
  async advancedSearch(req, res) {
    try {
      const { query, filters = {}, options = {} } = req.body;
      
      // TODO: Implement Elasticsearch advanced search
      // This is a placeholder implementation
      
      res.json({
        message: 'Advanced search feature coming soon',
        query,
        filters,
        options,
      });
    } catch (error) {
      logger.error('Advanced search error:', error);
      res.status(500).json({
        error: 'Internal server error during advanced search',
      });
    }
  }

  // Compare products
  async compareProducts(req, res) {
    try {
      const { ids } = req.query;
      const productIds = ids.split(',');

      const products = await Product.find({
        $or: [
          { _id: { $in: productIds } },
          { productId: { $in: productIds } },
        ],
        isActive: true,
      }).lean();

      if (products.length < 2) {
        return res.status(400).json({
          error: 'At least 2 products are required for comparison',
        });
      }

      // Calculate comparison metrics
      const comparison = {
        products,
        metrics: {
          priceRange: {
            min: Math.min(...products.map(p => p.price)),
            max: Math.max(...products.map(p => p.price)),
          },
          ratingRange: {
            min: Math.min(...products.map(p => p.rating || 0)),
            max: Math.max(...products.map(p => p.rating || 0)),
          },
          bestValue: products.reduce((best, current) => 
            (current.rating / current.price) > (best.rating / best.price) ? current : best
          ),
        },
      };

      res.json({ comparison });
    } catch (error) {
      logger.error('Compare products error:', error);
      res.status(500).json({
        error: 'Internal server error while comparing products',
      });
    }
  }

  // Get product availability
  async getProductAvailability(req, res) {
    try {
      const { productId } = req.params;

      const product = await Product.findOne({
        $or: [
          { _id: productId },
          { productId: productId },
        ],
      }).lean();

      if (!product) {
        return res.status(404).json({
          error: 'Product not found',
        });
      }

      res.json({
        productId,
        isAvailable: product.isAvailable,
        isActive: product.isActive,
        stock: product.stock,
        lastChecked: product.metadata.lastUpdated,
      });
    } catch (error) {
      logger.error('Get product availability error:', error);
      res.status(500).json({
        error: 'Internal server error while checking product availability',
      });
    }
  }

  // Track product price
  async trackProduct(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      // TODO: Implement price tracking
      
      res.json({
        message: 'Product price tracking enabled',
        productId,
        userId,
      });
    } catch (error) {
      logger.error('Track product error:', error);
      res.status(500).json({
        error: 'Internal server error while enabling price tracking',
      });
    }
  }

  // Untrack product price
  async untrackProduct(req, res) {
    try {
      const { productId } = req.params;
      const userId = req.user.userId;

      // TODO: Implement price untracking
      
      res.json({
        message: 'Product price tracking disabled',
        productId,
        userId,
      });
    } catch (error) {
      logger.error('Untrack product error:', error);
      res.status(500).json({
        error: 'Internal server error while disabling price tracking',
      });
    }
  }

  // Get user's tracked products
  async getTrackedProducts(req, res) {
    try {
      const userId = req.user.userId;

      // TODO: Implement tracked products retrieval
      
      res.json({
        trackedProducts: [],
        count: 0,
      });
    } catch (error) {
      logger.error('Get tracked products error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching tracked products',
      });
    }
  }

  // Export products as CSV
  async exportProductsCSV(req, res) {
    try {
      // TODO: Implement CSV export
      
      res.json({
        message: 'CSV export feature coming soon',
      });
    } catch (error) {
      logger.error('Export products CSV error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting products as CSV',
      });
    }
  }

  // Export products as JSON
  async exportProductsJSON(req, res) {
    try {
      // TODO: Implement JSON export
      
      res.json({
        message: 'JSON export feature coming soon',
      });
    } catch (error) {
      logger.error('Export products JSON error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting products as JSON',
      });
    }
  }
}

module.exports = new ProductController();
