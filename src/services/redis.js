// const Redis = require('ioredis'); // Original
const config = require('../../config');
const logger = require('../utils/logger');

let Redis;
if (process.env.NODE_ENV === 'test') {
  Redis = require('ioredis-mock');
  logger.info('Using ioredis-mock for testing.');
} else {
  Redis = require('ioredis');
}

class RedisService {
  constructor() {
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      logger.info('Connecting to Redis...');
      
      const redisConfig = {
        ...config.database.redis,
        // lazyConnect: true, // Removed
        retryDelayOnFailover: 100, // This is already in config.database.redis, but explicit here
        enableReadyCheck: config.database.redis.enableReadyCheck, // Ensure this is used from config
        maxRetriesPerRequest: config.database.redis.maxRetriesPerRequest, // Ensure this is used from config
      };
      
      // Filter out undefined keys from redisConfig that ioredis might complain about
      const cleanRedisConfig = Object.entries(redisConfig).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});


      // Main client
      this.client = new Redis(cleanRedisConfig);
      
      // Subscriber client for pub/sub
      this.subscriber = new Redis(cleanRedisConfig);
      
      // Publisher client for pub/sub
      this.publisher = new Redis(cleanRedisConfig);

      // Given that lazyConnect is now false, clients attempt to connect on instantiation.
      // We need to wait for them to be ready.
      const readyPromises = [this.client, this.subscriber, this.publisher].map(client => {
        return new Promise((resolve, reject) => {
          // If already ready, resolve immediately
          if (client.status === 'ready') {
            return resolve();
          }
          // Listen for ready and error events
          const readyListener = () => {
            client.removeListener('error', errorListener); // Clean up error listener
            resolve();
          };
          const errorListener = (err) => {
            client.removeListener('ready', readyListener); // Clean up ready listener
            logger.error('Redis client connection error during initial connection:', err);
            reject(err);
          };
          client.once('ready', readyListener);
          client.once('error', errorListener); // Or handle 'close' if more appropriate for non-connection errors
        });
      });

      if (process.env.NODE_ENV === 'test' && Redis.name === 'RedisMock') {
        // ioredis-mock connects synchronously and is always 'ready'
        // No need for explicit ready event waiting with the mock.
        this.isConnected = true;
        logger.info('ioredis-mock clients assumed ready.');
      } else {
        // Original logic for real ioredis
        await Promise.all(readyPromises);
        this.isConnected = true; // If Promise.all resolves, all are connected
      }

      // Event listeners
      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.client.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      logger.info('Redis service initialized successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      
      this.isConnected = false;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  getSubscriber() {
    return this.subscriber;
  }

  getPublisher() {
    return this.publisher;
  }

  isHealthy() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Cache methods
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error(`Error setting expiry for key ${key}:`, error);
      return false;
    }
  }

  // List methods
  async lpush(key, ...values) {
    try {
      const serialized = values.map(v => JSON.stringify(v));
      await this.client.lpush(key, ...serialized);
      return true;
    } catch (error) {
      logger.error(`Error lpush to key ${key}:`, error);
      return false;
    }
  }

  async rpop(key) {
    try {
      const value = await this.client.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error rpop from key ${key}:`, error);
      return null;
    }
  }

  async llen(key) {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error(`Error getting length of key ${key}:`, error);
      return 0;
    }
  }

  // Set methods
  async sadd(key, ...members) {
    try {
      const serialized = members.map(m => JSON.stringify(m));
      await this.client.sadd(key, ...serialized);
      return true;
    } catch (error) {
      logger.error(`Error sadd to key ${key}:`, error);
      return false;
    }
  }

  async smembers(key) {
    try {
      const members = await this.client.smembers(key);
      return members.map(m => JSON.parse(m));
    } catch (error) {
      logger.error(`Error getting members of key ${key}:`, error);
      return [];
    }
  }

  // Hash methods
  async hset(key, field, value) {
    try {
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Error hset key ${key} field ${field}:`, error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error hget key ${key} field ${field}:`, error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error(`Error hgetall key ${key}:`, error);
      return {};
    }
  }

  // Pub/Sub methods
  async publish(channel, message) {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsed = JSON.parse(message);
            callback(parsed);
          } catch (error) {
            logger.error('Error parsing pub/sub message:', error);
          }
        }
      });
      return true;
    } catch (error) {
      logger.error(`Error subscribing to channel ${channel}:`, error);
      return false;
    }
  }

  async getStats() {
    try {
      const info = await this.client.info();
      const memory = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      return {
        info,
        memory,
        stats,
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      return null;
    }
  }
}

module.exports = new RedisService();
