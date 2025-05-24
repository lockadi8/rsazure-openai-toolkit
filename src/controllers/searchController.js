const { validationResult } = require('express-validator');
const searchService = require('../services/searchService');
const dataSyncService = require('../services/dataSyncService');
const elasticsearchService = require('../services/elasticsearch');
const logger = require('../utils/logger');

class SearchController {
  /**
   * Advanced product search
   */
  async searchProducts(req, res) {
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
        shopId,
        priceMin,
        priceMax,
        rating,
        freeShipping,
        inStock,
        location,
        sort = 'popularityScore',
        order = 'desc',
        page = 1,
        limit = 20,
        includeAggregations = false
      } = req.query;

      const filters = {
        category,
        brand,
        shopId,
        priceMin,
        priceMax,
        rating,
        freeShipping: freeShipping === 'true',
        inStock: inStock === 'true',
        location
      };

      const options = {
        from: (page - 1) * limit,
        size: parseInt(limit),
        sort,
        order,
        includeAggregations: includeAggregations === 'true'
      };

      const result = await searchService.searchProducts(q, filters, options);

      // Log search for analytics
      await this.logSearch(req, q, filters, result.total);

      res.json({
        query: q,
        filters,
        results: result.hits,
        total: result.total,
        aggregations: result.aggregations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
        took: result.took
      });

    } catch (error) {
      logger.error('Error in product search:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  }

  /**
   * Autocomplete products
   */
  async autocomplete(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.json({ suggestions: [] });
      }

      const suggestions = await searchService.autocompleteProducts(q, parseInt(limit));

      res.json({
        query: q,
        suggestions
      });

    } catch (error) {
      logger.error('Error in autocomplete:', error);
      res.status(500).json({
        error: 'Autocomplete failed',
        message: error.message
      });
    }
  }

  /**
   * Search with suggestions
   */
  async searchWithSuggestions(req, res) {
    try {
      const { q, ...otherParams } = req.query;

      if (!q) {
        return res.status(400).json({
          error: 'Query parameter is required'
        });
      }

      const filters = {
        category: otherParams.category,
        brand: otherParams.brand,
        priceMin: otherParams.priceMin,
        priceMax: otherParams.priceMax,
        rating: otherParams.rating
      };

      const options = {
        from: ((otherParams.page || 1) - 1) * (otherParams.limit || 20),
        size: parseInt(otherParams.limit || 20),
        sort: otherParams.sort || 'popularityScore',
        order: otherParams.order || 'desc'
      };

      const result = await searchService.searchWithSuggestions(q, filters, options);

      res.json({
        query: q,
        results: result.hits,
        total: result.total,
        suggestions: result.suggestions,
        took: result.took
      });

    } catch (error) {
      logger.error('Error in search with suggestions:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  }

  /**
   * Find similar products
   */
  async findSimilar(req, res) {
    try {
      const { productId } = req.params;
      const { limit = 10 } = req.query;

      const similarProducts = await searchService.findSimilarProducts(productId, parseInt(limit));

      res.json({
        productId,
        similarProducts,
        count: similarProducts.length
      });

    } catch (error) {
      logger.error('Error finding similar products:', error);
      res.status(500).json({
        error: 'Failed to find similar products',
        message: error.message
      });
    }
  }

  /**
   * Get trending products
   */
  async getTrending(req, res) {
    try {
      const { timeRange = '7d', limit = 20 } = req.query;

      const trendingProducts = await searchService.getTrendingProducts(timeRange, parseInt(limit));

      res.json({
        timeRange,
        trendingProducts,
        count: trendingProducts.length
      });

    } catch (error) {
      logger.error('Error getting trending products:', error);
      res.status(500).json({
        error: 'Failed to get trending products',
        message: error.message
      });
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(req, res) {
    try {
      const { timeRange = '30d', category, brand } = req.query;

      const filters = { category, brand };
      const analytics = await searchService.getProductAnalytics(filters, timeRange);

      res.json({
        timeRange,
        filters,
        analytics
      });

    } catch (error) {
      logger.error('Error getting product analytics:', error);
      res.status(500).json({
        error: 'Failed to get analytics',
        message: error.message
      });
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(req, res) {
    try {
      const { timeRange = '30d', category, shopId, paymentMethod } = req.query;

      const filters = { category, shopId, paymentMethod };
      const analytics = await searchService.getOrderAnalytics(filters, timeRange);

      res.json({
        timeRange,
        filters,
        analytics
      });

    } catch (error) {
      logger.error('Error getting order analytics:', error);
      res.status(500).json({
        error: 'Failed to get order analytics',
        message: error.message
      });
    }
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(req, res) {
    try {
      const { timeRange = '90d', interval = 'day' } = req.query;

      const trends = await searchService.getRevenueTrends(timeRange, interval);

      res.json({
        timeRange,
        interval,
        trends
      });

    } catch (error) {
      logger.error('Error getting revenue trends:', error);
      res.status(500).json({
        error: 'Failed to get revenue trends',
        message: error.message
      });
    }
  }

  /**
   * Sync data to Elasticsearch
   */
  async syncData(req, res) {
    try {
      const { type = 'incremental', force = false } = req.body;

      // Check if sync is already in progress
      const syncStatus = dataSyncService.getSyncStatus();
      if (syncStatus.syncInProgress && !force) {
        return res.status(409).json({
          error: 'Sync already in progress',
          status: syncStatus
        });
      }

      let result;
      if (type === 'full') {
        result = await dataSyncService.fullSync();
      } else {
        result = await dataSyncService.incrementalSync();
      }

      res.json({
        message: `${type} sync completed successfully`,
        result
      });

    } catch (error) {
      logger.error('Error syncing data:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(req, res) {
    try {
      const status = dataSyncService.getSyncStatus();
      const validation = await dataSyncService.validateSync();

      res.json({
        status,
        validation
      });

    } catch (error) {
      logger.error('Error getting sync status:', error);
      res.status(500).json({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  }

  /**
   * Get Elasticsearch health
   */
  async getHealth(req, res) {
    try {
      const health = await elasticsearchService.ping();
      const stats = await elasticsearchService.getStats();

      res.json({
        healthy: health,
        connected: elasticsearchService.isHealthy(),
        stats
      });

    } catch (error) {
      logger.error('Error getting Elasticsearch health:', error);
      res.status(500).json({
        error: 'Failed to get health status',
        message: error.message
      });
    }
  }

  /**
   * Log search for analytics
   */
  async logSearch(req, query, filters, resultsCount) {
    try {
      const searchLog = {
        searchId: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        query: query || '',
        filters,
        resultsCount,
        executedAt: new Date().toISOString(),
        duration: 0, // Will be calculated by middleware
        status: 'success',
        userId: req.user?.id || 'anonymous',
        sessionId: req.sessionID || req.headers['x-session-id'],
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      };

      // Index search log asynchronously
      setImmediate(async () => {
        try {
          await elasticsearchService.indexDocument(
            elasticsearchService.indices.searches,
            searchLog,
            searchLog.searchId
          );
        } catch (error) {
          logger.error('Error logging search:', error);
        }
      });

    } catch (error) {
      logger.error('Error in search logging:', error);
    }
  }
}

module.exports = new SearchController();
