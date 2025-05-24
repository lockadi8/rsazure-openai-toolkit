const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');
const moment = require('moment');

class AnalyticsController {
  // Get dashboard overview
  async getDashboardOverview(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      const startDate = moment().subtract(parseInt(timeRange), 'days').toDate();

      // Get basic stats
      const [
        totalProducts,
        totalUsers,
        activeProducts,
        recentProducts,
        topCategories,
        priceRangeStats
      ] = await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Product.countDocuments({ createdAt: { $gte: startDate } }),
        this.getTopCategories(10),
        this.getPriceRangeStats()
      ]);

      res.json({
        overview: {
          totalProducts,
          totalUsers,
          activeProducts,
          recentProducts,
          inactiveProducts: totalProducts - activeProducts
        },
        topCategories,
        priceRangeStats,
        timeRange,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Dashboard overview error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching dashboard overview'
      });
    }
  }

  // Get product analytics
  async getProductAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, category, groupBy = 'day' } = req.query;

      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (category) {
        matchStage.category = category;
      }

      // Group by time period
      const groupFormat = this.getGroupFormat(groupBy);

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: groupFormat,
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            avgRating: { $avg: '$rating' },
            totalSold: { $sum: '$soldCount' }
          }
        },
        { $sort: { _id: 1 } }
      ];

      const analytics = await Product.aggregate(pipeline);

      // Get category breakdown
      const categoryBreakdown = await Product.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalSold: { $sum: '$soldCount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        analytics,
        categoryBreakdown,
        summary: {
          totalProducts: analytics.reduce((sum, item) => sum + item.count, 0),
          avgPrice: analytics.reduce((sum, item) => sum + item.avgPrice, 0) / analytics.length,
          totalSold: analytics.reduce((sum, item) => sum + item.totalSold, 0)
        },
        filters: { startDate, endDate, category, groupBy }
      });
    } catch (error) {
      logger.error('Product analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching product analytics'
      });
    }
  }

  // Get scraping analytics
  async getScrapingAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate } = req.query;

      // This would typically come from a scraping jobs collection
      // For now, we'll simulate based on product creation dates
      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const dailyStats = await Product.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            productsScraped: { $sum: 1 },
            avgProcessingTime: { $avg: 2.5 }, // Simulated
            successRate: { $avg: 0.95 } // Simulated
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Performance metrics
      const performanceMetrics = {
        totalJobsRun: dailyStats.length,
        avgProductsPerJob: dailyStats.reduce((sum, day) => sum + day.productsScraped, 0) / dailyStats.length,
        avgProcessingTime: 2.5, // Simulated
        successRate: 95.2, // Simulated
        errorRate: 4.8 // Simulated
      };

      res.json({
        dailyStats,
        performanceMetrics,
        filters: { startDate, endDate }
      });
    } catch (error) {
      logger.error('Scraping analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching scraping analytics'
      });
    }
  }

  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate } = req.query;

      const matchStage = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // User registration trends
      const registrationTrends = await User.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // User role distribution
      const roleDistribution = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      // Active users (users who logged in recently)
      const activeUsers = await User.countDocuments({
        lastLoginAt: {
          $gte: moment().subtract(7, 'days').toDate()
        }
      });

      res.json({
        registrationTrends,
        roleDistribution,
        summary: {
          totalUsers: await User.countDocuments(),
          activeUsers,
          newUsersInPeriod: registrationTrends.reduce((sum, day) => sum + day.newUsers, 0)
        },
        filters: { startDate, endDate }
      });
    } catch (error) {
      logger.error('User analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching user analytics'
      });
    }
  }

  // Get system health
  async getSystemHealth(req, res) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Database health check
      const dbHealth = await this.checkDatabaseHealth();

      // Redis health check
      const redisHealth = await this.checkRedisHealth();

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptime,
          human: this.formatUptime(uptime)
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        database: dbHealth,
        redis: redisHealth
      });
    } catch (error) {
      logger.error('System health error:', error);
      res.status(500).json({
        error: 'Internal server error while checking system health'
      });
    }
  }

  // Get system performance
  async getSystemPerformance(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Simulate performance metrics
      const performanceData = {
        responseTime: {
          avg: 245,
          p95: 450,
          p99: 800
        },
        throughput: {
          requestsPerSecond: 125,
          requestsPerMinute: 7500
        },
        errorRates: {
          total: 2.1,
          server: 0.8,
          client: 1.3
        },
        resourceUsage: {
          cpu: 45.2,
          memory: 68.7,
          disk: 23.4
        }
      };

      res.json({
        performance: performanceData,
        filters: { startDate, endDate },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('System performance error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching system performance'
      });
    }
  }

  // Get system errors
  async getSystemErrors(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // This would typically come from error logs
      // For now, we'll simulate error data
      const errorData = {
        totalErrors: 45,
        errorsByType: [
          { type: 'ValidationError', count: 20, percentage: 44.4 },
          { type: 'DatabaseError', count: 12, percentage: 26.7 },
          { type: 'NetworkError', count: 8, percentage: 17.8 },
          { type: 'AuthenticationError', count: 5, percentage: 11.1 }
        ],
        errorsByEndpoint: [
          { endpoint: '/api/scraper/search', count: 15 },
          { endpoint: '/api/products', count: 12 },
          { endpoint: '/api/auth/login', count: 8 },
          { endpoint: '/api/analytics/dashboard', count: 6 },
          { endpoint: '/api/admin/users', count: 4 }
        ],
        recentErrors: [
          {
            timestamp: moment().subtract(2, 'hours').toISOString(),
            type: 'ValidationError',
            endpoint: '/api/scraper/search',
            message: 'Invalid search query parameters'
          },
          {
            timestamp: moment().subtract(4, 'hours').toISOString(),
            type: 'DatabaseError',
            endpoint: '/api/products',
            message: 'Connection timeout to MongoDB'
          }
        ]
      };

      res.json({
        errors: errorData,
        filters: { startDate, endDate },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('System errors error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching system errors'
      });
    }
  }

  // Export analytics data
  async exportProductAnalytics(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      const products = await Product.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).lean();

      if (format === 'csv') {
        const csv = this.convertToCSV(products);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=product-analytics.csv');
        return res.send(csv);
      }

      res.json({
        data: products,
        count: products.length,
        exportedAt: new Date().toISOString(),
        filters: { startDate, endDate, format }
      });
    } catch (error) {
      logger.error('Export product analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting product analytics'
      });
    }
  }

  // Export scraping analytics
  async exportScrapingAnalytics(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      // Simulate scraping job data
      const scrapingData = [
        {
          jobId: 'job_001',
          startTime: moment().subtract(2, 'days').toISOString(),
          endTime: moment().subtract(2, 'days').add(5, 'minutes').toISOString(),
          status: 'completed',
          productsScraped: 150,
          errors: 2
        },
        {
          jobId: 'job_002',
          startTime: moment().subtract(1, 'day').toISOString(),
          endTime: moment().subtract(1, 'day').add(8, 'minutes').toISOString(),
          status: 'completed',
          productsScraped: 200,
          errors: 0
        }
      ];

      if (format === 'csv') {
        const csv = this.convertToCSV(scrapingData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=scraping-analytics.csv');
        return res.send(csv);
      }

      res.json({
        data: scrapingData,
        count: scrapingData.length,
        exportedAt: new Date().toISOString(),
        filters: { startDate, endDate, format }
      });
    } catch (error) {
      logger.error('Export scraping analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting scraping analytics'
      });
    }
  }

  // Export user analytics
  async exportUserAnalytics(req, res) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      const users = await User.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).select('-password -refreshTokens -apiKey').lean();

      if (format === 'csv') {
        const csv = this.convertToCSV(users);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-analytics.csv');
        return res.send(csv);
      }

      res.json({
        data: users,
        count: users.length,
        exportedAt: new Date().toISOString(),
        filters: { startDate, endDate, format }
      });
    } catch (error) {
      logger.error('Export user analytics error:', error);
      res.status(500).json({
        error: 'Internal server error while exporting user analytics'
      });
    }
  }

  // Helper methods
  async getTopCategories(limit = 10) {
    try {
      return await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalSold: { $sum: '$soldCount' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);
    } catch (error) {
      logger.error('Get top categories error:', error);
      return [];
    }
  }

  async getPriceRangeStats() {
    try {
      return await Product.aggregate([
        { $match: { isActive: true } },
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 100000, 500000, 1000000, 5000000, 10000000, Infinity],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              avgPrice: { $avg: '$price' }
            }
          }
        }
      ]);
    } catch (error) {
      logger.error('Get price range stats error:', error);
      return [];
    }
  }

  getGroupFormat(groupBy) {
    switch (groupBy) {
      case 'hour':
        return '%Y-%m-%d %H:00:00';
      case 'day':
        return '%Y-%m-%d';
      case 'week':
        return '%Y-W%U';
      case 'month':
        return '%Y-%m';
      case 'year':
        return '%Y';
      default:
        return '%Y-%m-%d';
    }
  }

  async checkDatabaseHealth() {
    try {
      const mongoose = require('mongoose');
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      return {
        status: states[state] || 'unknown',
        connected: state === 1
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  async checkRedisHealth() {
    try {
      const redis = require('../services/redis');
      await redis.ping();
      return {
        status: 'connected',
        connected: true
      };
    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message
      };
    }
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  convertToCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

module.exports = new AnalyticsController();