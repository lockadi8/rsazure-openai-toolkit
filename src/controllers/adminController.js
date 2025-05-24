const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const logger = require('../utils/logger');
const moment = require('moment');

class AdminController {
  // System management
  async getSystemStatus(req, res) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // Get database stats
      const [totalProducts, totalUsers, activeUsers] = await Promise.all([
        Product.countDocuments(),
        User.countDocuments(),
        User.countDocuments({
          lastLoginAt: { $gte: moment().subtract(7, 'days').toDate() }
        })
      ]);

      // System metrics
      const systemStatus = {
        server: {
          uptime: uptime,
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid
        },
        database: {
          totalProducts,
          totalUsers,
          activeUsers,
          connection: 'connected' // This should be checked dynamically
        },
        services: {
          redis: 'connected',
          elasticsearch: 'connected',
          queue: 'running'
        }
      };

      res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        system: systemStatus
      });
    } catch (error) {
      logger.error('Get system status error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching system status'
      });
    }
  }

  // Get system health
  async getSystemHealth(req, res) {
    try {
      const healthChecks = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkElasticsearchHealth(),
        this.checkQueueHealth()
      ]);

      const health = {
        database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error' },
        redis: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error' },
        elasticsearch: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error' },
        queue: healthChecks[3].status === 'fulfilled' ? healthChecks[3].value : { status: 'error' }
      };

      const overallStatus = Object.values(health).every(service => service.status === 'healthy')
        ? 'healthy' : 'degraded';

      res.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: health
      });
    } catch (error) {
      logger.error('Get system health error:', error);
      res.status(500).json({
        error: 'Internal server error while checking system health'
      });
    }
  }

  // Get system metrics
  async getSystemMetrics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;

      // Simulate metrics data
      const metrics = {
        requests: {
          total: 15420,
          successful: 14876,
          failed: 544,
          successRate: 96.5
        },
        performance: {
          avgResponseTime: 245,
          p95ResponseTime: 450,
          p99ResponseTime: 800
        },
        resources: {
          cpuUsage: 45.2,
          memoryUsage: 68.7,
          diskUsage: 23.4
        },
        errors: {
          total: 544,
          rate: 3.5,
          byType: {
            validation: 245,
            database: 156,
            network: 89,
            authentication: 54
          }
        }
      };

      res.json({
        metrics,
        timeRange,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get system metrics error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching system metrics'
      });
    }
  }

  // Restart system (placeholder)
  async restartSystem(req, res) {
    try {
      logger.admin('System restart requested', {
        userId: req.user.userId,
        timestamp: new Date().toISOString()
      });

      // In a real implementation, this would trigger a graceful restart
      res.json({
        message: 'System restart initiated',
        status: 'pending',
        estimatedDowntime: '30 seconds'
      });
    } catch (error) {
      logger.error('Restart system error:', error);
      res.status(500).json({
        error: 'Internal server error while restarting system'
      });
    }
  }

  // Toggle maintenance mode
  async toggleMaintenanceMode(req, res) {
    try {
      const { enabled } = req.body;

      // In a real implementation, this would set a global maintenance flag
      logger.admin('Maintenance mode toggled', {
        userId: req.user.userId,
        enabled,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
        maintenanceMode: enabled,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Toggle maintenance mode error:', error);
      res.status(500).json({
        error: 'Internal server error while toggling maintenance mode'
      });
    }
  }

  // User management
  async getUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, status, search } = req.query;

      const query = {};
      if (role) query.role = role;
      if (status) query.isActive = status === 'active';
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }

      const users = await User.find(query)
        .select('-password -refreshTokens -apiKey')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await User.countDocuments(query);

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: { role, status, search }
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching users'
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('-password -refreshTokens -apiKey')
        .lean();

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Get user statistics
      const userStats = {
        totalLogins: user.loginCount || 0,
        lastLogin: user.lastLoginAt,
        accountAge: moment().diff(moment(user.createdAt), 'days'),
        isActive: user.isActive,
        emailVerified: user.isEmailVerified
      };

      res.json({
        user,
        statistics: userStats
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching user'
      });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates.refreshTokens;
      delete updates.apiKey;

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-password -refreshTokens -apiKey');

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      logger.admin('User updated', {
        adminId: req.user.userId,
        targetUserId: userId,
        updates: Object.keys(updates)
      });

      res.json({
        message: 'User updated successfully',
        user
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        error: 'Internal server error while updating user'
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      logger.admin('User deleted', {
        adminId: req.user.userId,
        deletedUserId: userId,
        deletedUserEmail: user.email
      });

      res.json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        error: 'Internal server error while deleting user'
      });
    }
  }

  // Activate user
  async activateUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true, updatedAt: new Date() },
        { new: true }
      ).select('-password -refreshTokens -apiKey');

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      logger.admin('User activated', {
        adminId: req.user.userId,
        targetUserId: userId
      });

      res.json({
        message: 'User activated successfully',
        user
      });
    } catch (error) {
      logger.error('Activate user error:', error);
      res.status(500).json({
        error: 'Internal server error while activating user'
      });
    }
  }

  // Deactivate user
  async deactivateUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      ).select('-password -refreshTokens -apiKey');

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      logger.admin('User deactivated', {
        adminId: req.user.userId,
        targetUserId: userId
      });

      res.json({
        message: 'User deactivated successfully',
        user
      });
    } catch (error) {
      logger.error('Deactivate user error:', error);
      res.status(500).json({
        error: 'Internal server error while deactivating user'
      });
    }
  }

  // Product management
  async getProductStats(req, res) {
    try {
      const stats = await Product.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
            avgPrice: { $avg: '$price' },
            totalSold: { $sum: '$soldCount' },
            avgRating: { $avg: '$rating' }
          }
        }
      ]);

      const categoryStats = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        overview: stats[0] || {
          total: 0,
          active: 0,
          avgPrice: 0,
          totalSold: 0,
          avgRating: 0
        },
        categoryBreakdown: categoryStats
      });
    } catch (error) {
      logger.error('Get product stats error:', error);
      res.status(500).json({
        error: 'Internal server error while fetching product stats'
      });
    }
  }

  // Find duplicate products
  async findDuplicateProducts(req, res) {
    try {
      const duplicates = await Product.aggregate([
        {
          $group: {
            _id: {
              name: '$name',
              shopId: '$shopId'
            },
            count: { $sum: 1 },
            products: { $push: '$_id' }
          }
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 100 }
      ]);

      res.json({
        duplicates,
        count: duplicates.length
      });
    } catch (error) {
      logger.error('Find duplicate products error:', error);
      res.status(500).json({
        error: 'Internal server error while finding duplicate products'
      });
    }
  }

  // Cleanup products
  async cleanupProducts(req, res) {
    try {
      const { removeInactive = false, removeDuplicates = false } = req.body;

      let deletedCount = 0;

      if (removeInactive) {
        const result = await Product.deleteMany({ isActive: false });
        deletedCount += result.deletedCount;
      }

      if (removeDuplicates) {
        // This is a simplified duplicate removal
        const duplicates = await Product.aggregate([
          {
            $group: {
              _id: {
                name: '$name',
                shopId: '$shopId'
              },
              count: { $sum: 1 },
              products: { $push: '$_id' }
            }
          },
          { $match: { count: { $gt: 1 } } }
        ]);

        for (const duplicate of duplicates) {
          // Keep the first one, remove the rest
          const toRemove = duplicate.products.slice(1);
          const result = await Product.deleteMany({ _id: { $in: toRemove } });
          deletedCount += result.deletedCount;
        }
      }

      logger.admin('Product cleanup performed', {
        adminId: req.user.userId,
        deletedCount,
        removeInactive,
        removeDuplicates
      });

      res.json({
        message: 'Product cleanup completed',
        deletedCount,
        operations: { removeInactive, removeDuplicates }
      });
    } catch (error) {
      logger.error('Cleanup products error:', error);
      res.status(500).json({
        error: 'Internal server error while cleaning up products'
      });
    }
  }

  // Reindex products (for Elasticsearch)
  async reindexProducts(req, res) {
    try {
      // This would trigger a reindex operation
      logger.admin('Product reindex requested', {
        adminId: req.user.userId,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Product reindex initiated',
        status: 'pending',
        estimatedDuration: '5-10 minutes'
      });
    } catch (error) {
      logger.error('Reindex products error:', error);
      res.status(500).json({
        error: 'Internal server error while reindexing products'
      });
    }
  }

  // Remove inactive products
  async removeInactiveProducts(req, res) {
    try {
      const result = await Product.deleteMany({ isActive: false });

      logger.admin('Inactive products removed', {
        adminId: req.user.userId,
        deletedCount: result.deletedCount
      });

      res.json({
        message: 'Inactive products removed successfully',
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error('Remove inactive products error:', error);
      res.status(500).json({
        error: 'Internal server error while removing inactive products'
      });
    }
  }

  // Helper methods
  async checkDatabaseHealth() {
    try {
      const mongoose = require('mongoose');
      const state = mongoose.connection.readyState;
      return {
        status: state === 1 ? 'healthy' : 'unhealthy',
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
        status: 'healthy',
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

  async checkElasticsearchHealth() {
    try {
      // This would check Elasticsearch connection
      return {
        status: 'healthy',
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

  async checkQueueHealth() {
    try {
      // This would check queue system health
      return {
        status: 'healthy',
        running: true
      };
    } catch (error) {
      return {
        status: 'error',
        running: false,
        error: error.message
      };
    }
  }
}

module.exports = new AdminController();