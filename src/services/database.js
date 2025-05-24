const mongoose = require('mongoose');
const config = require('../../config');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      logger.info('Connecting to MongoDB...');
      
      this.connection = await mongoose.connect(config.database.mongodb.uri, {
        ...config.database.mongodb.options,
        dbName: config.database.mongodb.dbName,
      });

      this.isConnected = true;
      
      // Event listeners
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        logger.info('MongoDB disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isHealthy() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async ping() {
    try {
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('MongoDB ping failed:', error);
      return false;
    }
  }

  async getStats() {
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
      };
    } catch (error) {
      logger.error('Failed to get MongoDB stats:', error);
      return null;
    }
  }
}

module.exports = new DatabaseService();
