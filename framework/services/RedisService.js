const Redis = require('ioredis');
const config = require('../config/services').redis;
const Logger = require('../helpers/Logger');

class RedisService {
  constructor() {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      Logger.info('Redis connection established');
    });

    this.client.on('ready', () => {
      Logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      Logger.error('Redis connection error:', err);
    });

    this.client.on('close', () => {
      Logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      Logger.info('Redis reconnecting...');
    });
  }

  /**
   * Test Redis connection
   */
  async testConnection() {
    const startTime = Date.now();
    try {
      await this.client.ping();
      const responseTime = Date.now() - startTime;
      return { 
        status: 'connected', 
        message: 'Redis connection successful',
        responseTime: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      Logger.error('Redis connection test failed:', error);
      return { 
        status: 'error', 
        message: error.message,
        responseTime: responseTime
      };
    }
  }

  /**
   * Session Management Methods
   */
  async setSession(sessionId, sessionData, ttl = 86400) {
    try {
      await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      Logger.error('Error setting session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const sessionData = await this.client.get(`session:${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      Logger.error('Error getting session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.client.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      Logger.error('Error deleting session:', error);
      throw error;
    }
  }

  async updateSessionTTL(sessionId, ttl = 86400) {
    try {
      await this.client.expire(`session:${sessionId}`, ttl);
      return true;
    } catch (error) {
      Logger.error('Error updating session TTL:', error);
      throw error;
    }
  }

  /**
   * Caching Methods
   */
  async set(key, value, ttl = 3600) {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, JSON.stringify(value));
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      Logger.error('Error setting cache:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      Logger.error('Error getting cache:', error);
      throw error;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      Logger.error('Error deleting cache:', error);
      throw error;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      Logger.error('Error checking key existence:', error);
      throw error;
    }
  }

  /**
   * Advanced Operations
   */
  async setHash(key, hashKey, value) {
    try {
      await this.client.hset(key, hashKey, JSON.stringify(value));
      return true;
    } catch (error) {
      Logger.error('Error setting hash:', error);
      throw error;
    }
  }

  async getHash(key, hashKey) {
    try {
      const value = await this.client.hget(key, hashKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      Logger.error('Error getting hash:', error);
      throw error;
    }
  }

  async getAllHash(key) {
    try {
      const hash = await this.client.hgetall(key);
      const result = {};
      for (const [hashKey, value] of Object.entries(hash)) {
        result[hashKey] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      Logger.error('Error getting all hash values:', error);
      throw error;
    }
  }

  async increment(key, amount = 1) {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      Logger.error('Error incrementing key:', error);
      throw error;
    }
  }

  async addToList(key, value) {
    try {
      await this.client.lpush(key, JSON.stringify(value));
      return true;
    } catch (error) {
      Logger.error('Error adding to list:', error);
      throw error;
    }
  }

  async getFromList(key, start = 0, end = -1) {
    try {
      const list = await this.client.lrange(key, start, end);
      return list.map(item => JSON.parse(item));
    } catch (error) {
      Logger.error('Error getting from list:', error);
      throw error;
    }
  }

  /**
   * Utility Methods
   */
  async flushAll() {
    try {
      await this.client.flushall();
      Logger.info('Redis cache cleared');
      return true;
    } catch (error) {
      Logger.error('Error flushing Redis:', error);
      throw error;
    }
  }

  async getInfo() {
    try {
      const info = await this.client.info();
      return info;
    } catch (error) {
      Logger.error('Error getting Redis info:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.client.disconnect();
      Logger.info('Redis client disconnected');
    } catch (error) {
      Logger.error('Error disconnecting Redis:', error);
    }
  }

  getClient() {
    return this.client;
  }
}

// Create singleton instance
const redisService = new RedisService();

module.exports = redisService; 