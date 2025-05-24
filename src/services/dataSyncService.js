const elasticsearchService = require('./elasticsearch');
const Product = require('../models/Product');
const logger = require('../utils/logger');

class DataSyncService {
  constructor() {
    this.es = elasticsearchService;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSynced: 0,
      errors: 0,
      lastSync: null
    };
  }

  /**
   * Full sync dari MongoDB ke Elasticsearch
   */
  async fullSync(options = {}) {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    try {
      this.syncInProgress = true;
      const startTime = Date.now();
      
      logger.info('Starting full sync from MongoDB to Elasticsearch...');

      // Get total count
      const totalProducts = await Product.countDocuments({ isActive: true });
      logger.info(`Total products to sync: ${totalProducts}`);

      const batchSize = options.batchSize || 1000;
      let synced = 0;
      let errors = 0;

      // Process in batches
      for (let skip = 0; skip < totalProducts; skip += batchSize) {
        try {
          const products = await Product.find({ isActive: true })
            .skip(skip)
            .limit(batchSize)
            .lean();

          if (products.length === 0) break;

          // Bulk index to Elasticsearch
          const result = await this.es.bulkIndex(
            this.es.indices.products,
            products,
            {
              batchSize: batchSize,
              refresh: false,
              stopOnError: false
            }
          );

          synced += products.length;
          
          // Log progress
          const progress = Math.round((synced / totalProducts) * 100);
          logger.info(`Sync progress: ${progress}% (${synced}/${totalProducts})`);

        } catch (error) {
          errors++;
          logger.error(`Error syncing batch starting at ${skip}:`, error);
          
          if (options.stopOnError) {
            throw error;
          }
        }
      }

      // Refresh index
      await this.es.client.indices.refresh({ index: this.es.indices.products });

      const duration = Date.now() - startTime;
      this.lastSyncTime = new Date();
      this.syncStats = {
        totalSynced: synced,
        errors: errors,
        lastSync: this.lastSyncTime,
        duration: duration
      };

      logger.info(`Full sync completed: ${synced} products synced, ${errors} errors, took ${duration}ms`);
      
      return this.syncStats;

    } catch (error) {
      logger.error('Full sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Incremental sync - hanya sync products yang berubah
   */
  async incrementalSync(since = null) {
    try {
      const sinceDate = since || this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24 hours
      
      logger.info(`Starting incremental sync since ${sinceDate.toISOString()}`);

      // Find updated products
      const updatedProducts = await Product.find({
        $or: [
          { updatedAt: { $gte: sinceDate } },
          { 'metadata.lastUpdated': { $gte: sinceDate } }
        ]
      }).lean();

      if (updatedProducts.length === 0) {
        logger.info('No products to sync');
        return { synced: 0, errors: 0 };
      }

      logger.info(`Found ${updatedProducts.length} products to sync`);

      // Bulk index updated products
      const result = await this.es.bulkIndex(
        this.es.indices.products,
        updatedProducts,
        {
          batchSize: 500,
          refresh: true
        }
      );

      this.lastSyncTime = new Date();
      
      logger.info(`Incremental sync completed: ${updatedProducts.length} products synced`);
      
      return {
        synced: updatedProducts.length,
        errors: result.results.reduce((acc, batch) => acc + (batch.body.errors ? 1 : 0), 0),
        lastSync: this.lastSyncTime
      };

    } catch (error) {
      logger.error('Incremental sync failed:', error);
      throw error;
    }
  }

  /**
   * Real-time indexing setelah scraping
   */
  async indexProduct(product) {
    try {
      const prepared = this.es.prepareDocumentForIndex(product);
      
      const result = await this.es.indexDocument(
        this.es.indices.products,
        prepared,
        product.productId
      );

      logger.debug(`Product indexed: ${product.productId}`);
      return result;

    } catch (error) {
      logger.error(`Error indexing product ${product.productId}:`, error);
      throw error;
    }
  }

  /**
   * Batch indexing untuk multiple products
   */
  async indexProducts(products) {
    try {
      if (!Array.isArray(products) || products.length === 0) {
        return { synced: 0, errors: 0 };
      }

      const result = await this.es.bulkIndex(
        this.es.indices.products,
        products,
        {
          batchSize: 500,
          refresh: false
        }
      );

      logger.info(`Batch indexed ${products.length} products`);
      return {
        synced: products.length,
        batches: result.batches,
        errors: result.results.reduce((acc, batch) => acc + (batch.body.errors ? 1 : 0), 0)
      };

    } catch (error) {
      logger.error('Error batch indexing products:', error);
      throw error;
    }
  }

  /**
   * Update product di Elasticsearch
   */
  async updateProduct(productId, updates) {
    try {
      const prepared = this.es.prepareDocumentForIndex(updates);
      
      const result = await this.es.updateDocument(
        this.es.indices.products,
        productId,
        prepared
      );

      logger.debug(`Product updated: ${productId}`);
      return result;

    } catch (error) {
      logger.error(`Error updating product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete product dari Elasticsearch
   */
  async deleteProduct(productId) {
    try {
      const result = await this.es.deleteDocument(
        this.es.indices.products,
        productId
      );

      logger.debug(`Product deleted: ${productId}`);
      return result;

    } catch (error) {
      logger.error(`Error deleting product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Sync inactive products (soft delete)
   */
  async syncInactiveProducts() {
    try {
      logger.info('Syncing inactive products...');

      // Find products that are inactive in MongoDB
      const inactiveProducts = await Product.find({ isActive: false })
        .select('productId')
        .lean();

      if (inactiveProducts.length === 0) {
        logger.info('No inactive products found');
        return { deleted: 0 };
      }

      // Delete from Elasticsearch
      const productIds = inactiveProducts.map(p => p.productId);
      const result = await this.es.bulkDelete(
        this.es.indices.products,
        productIds
      );

      logger.info(`Deleted ${productIds.length} inactive products from Elasticsearch`);
      
      return {
        deleted: productIds.length,
        batches: result.batches
      };

    } catch (error) {
      logger.error('Error syncing inactive products:', error);
      throw error;
    }
  }

  /**
   * Validate sync integrity
   */
  async validateSync() {
    try {
      logger.info('Validating sync integrity...');

      // Count documents in MongoDB
      const mongoCount = await Product.countDocuments({ isActive: true });

      // Count documents in Elasticsearch
      const esResult = await this.es.client.count({
        index: this.es.indices.products,
        body: {
          query: {
            term: { isActive: true }
          }
        }
      });
      const esCount = esResult.body.count;

      const difference = Math.abs(mongoCount - esCount);
      const syncAccuracy = ((Math.min(mongoCount, esCount) / Math.max(mongoCount, esCount)) * 100).toFixed(2);

      const validation = {
        mongoCount,
        esCount,
        difference,
        syncAccuracy: `${syncAccuracy}%`,
        isValid: difference <= (mongoCount * 0.01) // Allow 1% difference
      };

      logger.info(`Sync validation: MongoDB=${mongoCount}, ES=${esCount}, Accuracy=${syncAccuracy}%`);

      return validation;

    } catch (error) {
      logger.error('Error validating sync:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats
    };
  }

  /**
   * Schedule automatic incremental sync
   */
  startAutoSync(intervalMinutes = 30) {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      try {
        if (!this.syncInProgress) {
          await this.incrementalSync();
        }
      } catch (error) {
        logger.error('Auto sync failed:', error);
      }
    }, intervalMinutes * 60 * 1000);

    logger.info(`Auto sync started with ${intervalMinutes} minute interval`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      logger.info('Auto sync stopped');
    }
  }

  /**
   * Cleanup old data
   */
  async cleanup(daysToKeep = 30) {
    try {
      const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
      
      logger.info(`Cleaning up data older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`);

      // Delete old search logs
      const deleteQuery = {
        query: {
          range: {
            executedAt: {
              lt: cutoffDate.toISOString()
            }
          }
        }
      };

      const result = await this.es.client.deleteByQuery({
        index: this.es.indices.searches,
        body: deleteQuery,
        refresh: true
      });

      logger.info(`Cleanup completed: deleted ${result.body.deleted} old search records`);
      
      return {
        deleted: result.body.deleted,
        cutoffDate
      };

    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }
}

module.exports = new DataSyncService();
