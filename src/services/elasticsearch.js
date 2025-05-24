const { Client } = require('@elastic/elasticsearch');
const config = require('../../config');
const logger = require('../utils/logger');

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    this.indices = {
      products: `${config.database.elasticsearch.indexPrefix}_products`,
      orders: `${config.database.elasticsearch.indexPrefix}_orders`,
      searches: `${config.database.elasticsearch.indexPrefix}_searches`,
      analytics: `${config.database.elasticsearch.indexPrefix}_analytics`,
      logs: `${config.database.elasticsearch.indexPrefix}_logs`,
    };

    // Analyzers untuk optimasi search
    this.analyzers = {
      product_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'stop', 'snowball']
      },
      autocomplete_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase', 'edge_ngram_filter']
      },
      search_analyzer: {
        type: 'custom',
        tokenizer: 'keyword',
        filter: ['lowercase']
      }
    };

    this.filters = {
      edge_ngram_filter: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 20
      }
    };
  }

  async connect() {
    try {
      logger.info('Connecting to Elasticsearch...');

      this.client = new Client({
        node: config.database.elasticsearch.node,
        maxRetries: config.database.elasticsearch.maxRetries,
        requestTimeout: config.database.elasticsearch.requestTimeout,
        sniffOnStart: config.database.elasticsearch.sniffOnStart,
        auth: config.database.elasticsearch.auth || undefined,
        ssl: config.database.elasticsearch.ssl || undefined,
      });

      // Test connection dengan retry mechanism
      await this.connectWithRetry();
      this.isConnected = true;

      // Initialize indices
      await this.initializeIndices();

      logger.info('Elasticsearch connected successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  async connectWithRetry() {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.client.ping();
        this.retryCount = 0;
        return;
      } catch (error) {
        this.retryCount++;
        logger.warn(`Elasticsearch connection attempt ${i + 1} failed:`, error.message);

        if (i === this.maxRetries - 1) {
          throw error;
        }

        await this.sleep(this.retryDelay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        logger.info('Elasticsearch disconnected successfully');
      }
    } catch (error) {
      logger.error('Error disconnecting from Elasticsearch:', error);
      throw error;
    }
  }

  async initializeIndices() {
    try {
      // Products index dengan optimasi search
      await this.createIndexIfNotExists(this.indices.products, {
        settings: {
          analysis: {
            analyzer: this.analyzers,
            filter: this.filters
          },
          number_of_shards: 2,
          number_of_replicas: 1,
          refresh_interval: '5s'
        },
        mappings: {
          properties: {
            productId: {
              type: 'keyword',
              index: true
            },
            name: {
              type: 'text',
              analyzer: 'product_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                autocomplete: {
                  type: 'text',
                  analyzer: 'autocomplete_analyzer',
                  search_analyzer: 'search_analyzer'
                }
              }
            },
            description: {
              type: 'text',
              analyzer: 'product_analyzer'
            },
            price: {
              type: 'double',
              index: true
            },
            originalPrice: {
              type: 'double',
              index: true
            },
            discount: {
              type: 'integer',
              index: true
            },
            rating: {
              type: 'float',
              index: true
            },
            reviewCount: {
              type: 'integer',
              index: true
            },
            soldCount: {
              type: 'integer',
              index: true
            },
            category: {
              type: 'keyword',
              index: true,
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            subcategory: {
              type: 'keyword',
              index: true
            },
            brand: {
              type: 'keyword',
              index: true,
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            shopName: {
              type: 'keyword',
              index: true,
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            shopId: {
              type: 'keyword',
              index: true
            },
            shopRating: {
              type: 'float',
              index: true
            },
            shopLocation: {
              type: 'keyword',
              index: true
            },
            images: {
              type: 'keyword',
              index: false
            },
            specifications: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                value: { type: 'text', analyzer: 'standard' }
              }
            },
            variants: {
              type: 'nested',
              properties: {
                name: { type: 'keyword' },
                options: { type: 'keyword' }
              }
            },
            url: {
              type: 'keyword',
              index: false
            },
            isActive: {
              type: 'boolean',
              index: true
            },
            isAvailable: {
              type: 'boolean',
              index: true
            },
            stock: {
              type: 'integer',
              index: true
            },
            weight: {
              type: 'float',
              index: true
            },
            dimensions: {
              properties: {
                length: { type: 'float' },
                width: { type: 'float' },
                height: { type: 'float' }
              }
            },
            shipping: {
              properties: {
                freeShipping: { type: 'boolean', index: true },
                estimatedDays: {
                  properties: {
                    min: { type: 'integer' },
                    max: { type: 'integer' }
                  }
                }
              }
            },
            tags: {
              type: 'keyword',
              index: true
            },
            metadata: {
              properties: {
                scrapedAt: { type: 'date', index: true },
                lastUpdated: { type: 'date', index: true },
                scrapeCount: { type: 'integer', index: true },
                source: { type: 'keyword', index: true },
                quality: { type: 'keyword', index: true }
              }
            },
            createdAt: { type: 'date', index: true },
            updatedAt: { type: 'date', index: true },
            // Computed fields untuk analytics
            discountPercentage: { type: 'float', index: true },
            priceRange: { type: 'keyword', index: true }, // low, medium, high
            popularityScore: { type: 'float', index: true }
          },
        },
      });

      // Orders index untuk analisa transaksi
      await this.createIndexIfNotExists(this.indices.orders, {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          refresh_interval: '10s'
        },
        mappings: {
          properties: {
            orderId: { type: 'keyword', index: true },
            productId: { type: 'keyword', index: true },
            productName: {
              type: 'text',
              analyzer: 'standard',
              fields: { keyword: { type: 'keyword' } }
            },
            shopId: { type: 'keyword', index: true },
            shopName: { type: 'keyword', index: true },
            category: { type: 'keyword', index: true },
            brand: { type: 'keyword', index: true },
            price: { type: 'double', index: true },
            quantity: { type: 'integer', index: true },
            totalAmount: { type: 'double', index: true },
            discount: { type: 'double', index: true },
            finalAmount: { type: 'double', index: true },
            orderDate: { type: 'date', index: true },
            orderStatus: { type: 'keyword', index: true },
            paymentMethod: { type: 'keyword', index: true },
            shippingMethod: { type: 'keyword', index: true },
            customerLocation: { type: 'keyword', index: true },
            customerAge: { type: 'integer', index: true },
            customerGender: { type: 'keyword', index: true },
            rating: { type: 'float', index: true },
            review: { type: 'text', analyzer: 'standard' },
            isReturned: { type: 'boolean', index: true },
            returnReason: { type: 'keyword', index: true },
            metadata: {
              properties: {
                source: { type: 'keyword' },
                scrapedAt: { type: 'date' },
                quality: { type: 'keyword' }
              }
            }
          }
        }
      });

      // Searches index
      await this.createIndexIfNotExists(this.indices.searches, {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s'
        },
        mappings: {
          properties: {
            searchId: { type: 'keyword', index: true },
            query: {
              type: 'text',
              analyzer: 'standard',
              fields: { keyword: { type: 'keyword' } }
            },
            filters: {
              type: 'object',
              enabled: false // Tidak perlu diindex, hanya disimpan
            },
            resultsCount: { type: 'integer', index: true },
            executedAt: { type: 'date', index: true },
            duration: { type: 'integer', index: true },
            status: { type: 'keyword', index: true },
            userId: { type: 'keyword', index: true },
            sessionId: { type: 'keyword', index: true },
            userAgent: { type: 'keyword', index: false },
            ipAddress: { type: 'ip', index: true },
            clickedResults: { type: 'keyword', index: true },
            conversionRate: { type: 'float', index: true }
          },
        },
      });

      // Analytics index
      await this.createIndexIfNotExists(this.indices.analytics, {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s'
        },
        mappings: {
          properties: {
            eventType: { type: 'keyword', index: true },
            productId: { type: 'keyword', index: true },
            userId: { type: 'keyword', index: true },
            sessionId: { type: 'keyword', index: true },
            timestamp: { type: 'date', index: true },
            category: { type: 'keyword', index: true },
            action: { type: 'keyword', index: true },
            value: { type: 'double', index: true },
            duration: { type: 'integer', index: true },
            userAgent: { type: 'keyword', index: false },
            ipAddress: { type: 'ip', index: true },
            referrer: { type: 'keyword', index: false },
            data: {
              type: 'object',
              enabled: false // Flexible storage tanpa indexing
            },
          },
        },
      });

      // Logs index untuk monitoring dan debugging
      await this.createIndexIfNotExists(this.indices.logs, {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '60s',
          'index.lifecycle.name': 'logs-policy', // ILM policy
          'index.lifecycle.rollover_alias': this.indices.logs
        },
        mappings: {
          properties: {
            level: { type: 'keyword', index: true },
            message: {
              type: 'text',
              analyzer: 'standard',
              fields: { keyword: { type: 'keyword' } }
            },
            timestamp: { type: 'date', index: true },
            service: { type: 'keyword', index: true },
            module: { type: 'keyword', index: true },
            function: { type: 'keyword', index: true },
            line: { type: 'integer', index: false },
            error: {
              properties: {
                name: { type: 'keyword' },
                message: { type: 'text' },
                stack: { type: 'text', index: false }
              }
            },
            request: {
              properties: {
                method: { type: 'keyword' },
                url: { type: 'keyword' },
                userAgent: { type: 'keyword', index: false },
                ip: { type: 'ip' },
                duration: { type: 'integer' }
              }
            },
            metadata: {
              type: 'object',
              enabled: false
            },
          },
        },
      });

      logger.info('Elasticsearch indices initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch indices:', error);
      throw error;
    }
  }

  async createIndexIfNotExists(indexName, settings) {
    try {
      const exists = await this.client.indices.exists({ index: indexName });

      if (!exists) {
        await this.client.indices.create({
          index: indexName,
          body: settings,
        });
        logger.info(`Created Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      logger.error(`Failed to create index ${indexName}:`, error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isHealthy() {
    return this.isConnected;
  }

  async ping() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Elasticsearch ping failed:', error);
      return false;
    }
  }

  // Document operations
  async indexDocument(index, document, id = null) {
    try {
      const params = {
        index,
        body: document,
      };

      if (id) {
        params.id = id;
      }

      const result = await this.client.index(params);
      return result;
    } catch (error) {
      logger.error(`Error indexing document in ${index}:`, error);
      throw error;
    }
  }

  async getDocument(index, id) {
    try {
      const result = await this.client.get({
        index,
        id,
      });
      return result.body._source;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error(`Error getting document ${id} from ${index}:`, error);
      throw error;
    }
  }

  async updateDocument(index, id, document) {
    try {
      const result = await this.client.update({
        index,
        id,
        body: {
          doc: document,
        },
      });
      return result;
    } catch (error) {
      logger.error(`Error updating document ${id} in ${index}:`, error);
      throw error;
    }
  }

  async deleteDocument(index, id) {
    try {
      const result = await this.client.delete({
        index,
        id,
      });
      return result;
    } catch (error) {
      logger.error(`Error deleting document ${id} from ${index}:`, error);
      throw error;
    }
  }

  // Search operations
  async search(index, query, options = {}) {
    try {
      const params = {
        index,
        body: query,
        ...options,
      };

      const result = await this.client.search(params);
      return {
        hits: result.body.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
        })),
        total: result.body.hits.total.value,
        aggregations: result.body.aggregations,
      };
    } catch (error) {
      logger.error(`Error searching in ${index}:`, error);
      throw error;
    }
  }

  async bulkIndex(index, documents, options = {}) {
    try {
      const batchSize = options.batchSize || 1000;
      const results = [];

      // Process documents in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const body = batch.flatMap(doc => [
          {
            index: {
              _index: index,
              _id: doc.id || doc.productId || doc.orderId,
              ...(options.routing && { _routing: doc[options.routing] })
            }
          },
          this.prepareDocumentForIndex(doc),
        ]);

        const result = await this.retryOperation(async () => {
          return await this.client.bulk({
            body,
            refresh: options.refresh || false,
            timeout: options.timeout || '30s'
          });
        });

        if (result.body.errors) {
          const errors = result.body.items.filter(item => item.index && item.index.error);
          logger.error(`Bulk index errors in batch ${Math.floor(i/batchSize) + 1}:`, errors);

          if (options.stopOnError) {
            throw new Error(`Bulk indexing failed with ${errors.length} errors`);
          }
        }

        results.push(result);

        // Log progress
        logger.info(`Bulk indexed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)} (${batch.length} documents)`);
      }

      return {
        batches: results.length,
        totalDocuments: documents.length,
        results
      };
    } catch (error) {
      logger.error(`Error bulk indexing to ${index}:`, error);
      throw error;
    }
  }

  async bulkUpdate(index, updates, options = {}) {
    try {
      const batchSize = options.batchSize || 1000;
      const results = [];

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        const body = batch.flatMap(update => [
          {
            update: {
              _index: index,
              _id: update.id,
              ...(options.routing && { _routing: update[options.routing] })
            }
          },
          {
            doc: this.prepareDocumentForIndex(update.doc),
            doc_as_upsert: update.upsert || false
          },
        ]);

        const result = await this.retryOperation(async () => {
          return await this.client.bulk({
            body,
            refresh: options.refresh || false,
            timeout: options.timeout || '30s'
          });
        });

        if (result.body.errors) {
          const errors = result.body.items.filter(item => item.update && item.update.error);
          logger.error(`Bulk update errors in batch ${Math.floor(i/batchSize) + 1}:`, errors);
        }

        results.push(result);
      }

      return {
        batches: results.length,
        totalUpdates: updates.length,
        results
      };
    } catch (error) {
      logger.error(`Error bulk updating in ${index}:`, error);
      throw error;
    }
  }

  async bulkDelete(index, ids, options = {}) {
    try {
      const batchSize = options.batchSize || 1000;
      const results = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const body = batch.flatMap(id => [
          { delete: { _index: index, _id: id } }
        ]);

        const result = await this.retryOperation(async () => {
          return await this.client.bulk({
            body,
            refresh: options.refresh || false,
            timeout: options.timeout || '30s'
          });
        });

        if (result.body.errors) {
          const errors = result.body.items.filter(item => item.delete && item.delete.error);
          logger.error(`Bulk delete errors in batch ${Math.floor(i/batchSize) + 1}:`, errors);
        }

        results.push(result);
      }

      return {
        batches: results.length,
        totalDeletes: ids.length,
        results
      };
    } catch (error) {
      logger.error(`Error bulk deleting from ${index}:`, error);
      throw error;
    }
  }

  prepareDocumentForIndex(doc) {
    const prepared = { ...doc };

    // Remove MongoDB specific fields
    delete prepared._id;
    delete prepared.__v;

    // Ensure dates are properly formatted
    if (prepared.createdAt) prepared.createdAt = new Date(prepared.createdAt).toISOString();
    if (prepared.updatedAt) prepared.updatedAt = new Date(prepared.updatedAt).toISOString();
    if (prepared.metadata?.scrapedAt) prepared.metadata.scrapedAt = new Date(prepared.metadata.scrapedAt).toISOString();
    if (prepared.metadata?.lastUpdated) prepared.metadata.lastUpdated = new Date(prepared.metadata.lastUpdated).toISOString();

    // Calculate computed fields for products
    if (prepared.price && prepared.originalPrice) {
      prepared.discountPercentage = Math.round(((prepared.originalPrice - prepared.price) / prepared.originalPrice) * 100);
    }

    // Calculate price range
    if (prepared.price) {
      if (prepared.price < 50000) prepared.priceRange = 'low';
      else if (prepared.price < 200000) prepared.priceRange = 'medium';
      else prepared.priceRange = 'high';
    }

    // Calculate popularity score
    if (prepared.soldCount && prepared.reviewCount && prepared.rating) {
      prepared.popularityScore = (prepared.soldCount * 0.4) + (prepared.reviewCount * 0.3) + (prepared.rating * 20 * 0.3);
    }

    return prepared;
  }

  async retryOperation(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        logger.warn(`Operation failed, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await this.sleep(delay);
      }
    }
  }

  // Product-specific methods
  async indexProduct(product) {
    return this.indexDocument(this.indices.products, product, product.productId);
  }

  async searchProducts(query, filters = {}, options = {}) {
    const searchQuery = {
      query: {
        bool: {
          must: [],
          filter: [],
        },
      },
    };

    // Text search
    if (query) {
      searchQuery.query.bool.must.push({
        multi_match: {
          query,
          fields: ['name^2', 'description', 'brand', 'category'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Filters
    if (filters.priceMin || filters.priceMax) {
      const priceRange = {};
      if (filters.priceMin) priceRange.gte = filters.priceMin;
      if (filters.priceMax) priceRange.lte = filters.priceMax;

      searchQuery.query.bool.filter.push({
        range: { price: priceRange },
      });
    }

    if (filters.category) {
      searchQuery.query.bool.filter.push({
        term: { category: filters.category },
      });
    }

    if (filters.brand) {
      searchQuery.query.bool.filter.push({
        term: { brand: filters.brand },
      });
    }

    if (filters.rating) {
      searchQuery.query.bool.filter.push({
        range: { rating: { gte: filters.rating } },
      });
    }

    // Sorting
    if (options.sort) {
      searchQuery.sort = [{ [options.sort]: { order: options.order || 'desc' } }];
    }

    return this.search(this.indices.products, searchQuery, {
      from: options.from || 0,
      size: options.size || 20,
    });
  }

  async getStats() {
    try {
      const health = await this.client.cluster.health();
      const stats = await this.client.cluster.stats();

      return {
        health: health.body,
        stats: stats.body,
      };
    } catch (error) {
      logger.error('Failed to get Elasticsearch stats:', error);
      return null;
    }
  }
}

module.exports = new ElasticsearchService();
