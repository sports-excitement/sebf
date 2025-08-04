const { Client } = require('typesense');
const config = require('../config/services').typesense;
const Logger = require('../helpers/Logger');

class TypesenseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.enabled = config.enabled;
    
    if (this.enabled) {
      this.initializeClient();
    } else {
      Logger.warn('Typesense is disabled - check TYPESENSE_HOST environment variable');
    }
  }

  initializeClient() {
    try {
      this.client = new Client({
        nodes: [
          {
            host: config.host,
            port: config.port,
            protocol: config.protocol
          }
        ],
        apiKey: config.apiKey,
        connectionTimeoutSeconds: config.connectionTimeout,
        healthcheckIntervalSeconds: config.healthcheckInterval,
        numRetries: config.numRetries,
        retryIntervalSeconds: config.retryInterval,
        logLevel: config.logLevel
      });

      Logger.info('Typesense client initialized');
    } catch (error) {
      Logger.error('Failed to initialize Typesense client:', error);
      this.enabled = false;
    }
  }

  async connect() {
    if (!this.enabled) {
      Logger.warn('Typesense is disabled, skipping connection');
      return false;
    }

    try {
      const health = await this.client.health.retrieve();
      this.isConnected = true;
      Logger.info('Typesense connected successfully:', health);
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('Typesense connection failed:', error);
      return false;
    }
  }

  async testConnection() {
    const startTime = Date.now();
    
    if (!this.enabled) {
      return { 
        status: 'disabled', 
        message: 'Typesense is disabled',
        responseTime: Date.now() - startTime
      };
    }

    try {
      if (!this.client) {
        return { 
          status: 'error', 
          message: 'Typesense client not initialized',
          responseTime: Date.now() - startTime
        };
      }

      const health = await this.client.health.retrieve();
      const responseTime = Date.now() - startTime;
      this.isConnected = true;
      return { 
        status: 'connected', 
        message: 'Typesense connection successful',
        health: health,
        responseTime: responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.isConnected = false;
      Logger.error('Typesense connection test failed:', error);
      return { 
        status: 'error', 
        message: error.message,
        responseTime: responseTime
      };
    }
  }

  async getClusterHealth() {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const health = await this.client.health.retrieve();
      return health;
    } catch (error) {
      Logger.error('Failed to get cluster health:', error);
      throw error;
    }
  }

  async createCollection(name, schema) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const collection = await this.client.collections().create({
        name: name,
        fields: schema.fields,
        default_sorting_field: schema.default_sorting_field
      });

      Logger.info(`Collection ${name} created successfully`);
      return { created: true, collection };
    } catch (error) {
      if (error.httpStatus === 409) {
        Logger.info(`Collection ${name} already exists`);
        return { created: false, message: 'Collection already exists' };
      }
      Logger.error(`Failed to create collection ${name}:`, error);
      throw error;
    }
  }

  async deleteCollection(name) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      await this.client.collections(name).delete();
      Logger.info(`Collection ${name} deleted successfully`);
      return { deleted: true };
    } catch (error) {
      if (error.httpStatus === 404) {
        return { deleted: false, message: 'Collection does not exist' };
      }
      Logger.error(`Failed to delete collection ${name}:`, error);
      throw error;
    }
  }

  async indexDocument(collectionName, document, options = {}) {
    if (!this.enabled || !this.client) {
      Logger.warn('Typesense not available, skipping document indexing');
      return null;
    }

    try {
      const documentWithTimestamp = {
        ...document,
        created_at: Math.floor(Date.now() / 1000)
      };

      const result = await this.client.collections(collectionName).documents().create(documentWithTimestamp, options);
      Logger.debug(`Document indexed in ${collectionName}:`, result.id);
      return result;
    } catch (error) {
      Logger.error(`Failed to index document in ${collectionName}:`, error);
      throw error;
    }
  }

  async searchDocuments(collectionName, searchParameters) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const results = await this.client.collections(collectionName).documents().search(searchParameters);
      return {
        total: results.found,
        hits: results.hits,
        facet_counts: results.facet_counts,
        search_time_ms: results.search_time_ms
      };
    } catch (error) {
      Logger.error(`Search failed in ${collectionName}:`, error);
      throw error;
    }
  }

  async getDocument(collectionName, id) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const document = await this.client.collections(collectionName).documents(id).retrieve();
      return document;
    } catch (error) {
      if (error.httpStatus === 404) {
        return null;
      }
      Logger.error(`Failed to get document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName, id, document) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const updatedDocument = {
        ...document,
        updated_at: Math.floor(Date.now() / 1000)
      };

      const result = await this.client.collections(collectionName).documents(id).update(updatedDocument);
      return result;
    } catch (error) {
      Logger.error(`Failed to update document ${id} in ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName, id) {
    if (!this.enabled || !this.client) {
      throw new Error('Typesense not available');
    }

    try {
      const result = await this.client.collections(collectionName).documents(id).delete();
      return result;
    } catch (error) {
      if (error.httpStatus === 404) {
        return { found: false };
      }
      Logger.error(`Failed to delete document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  async bulkImport(collectionName, documents, options = {}) {
    if (!this.enabled || !this.client) {
      Logger.warn('Typesense not available, skipping bulk import');
      return null;
    }

    try {
      const documentsWithTimestamp = documents.map(doc => ({
        ...doc,
        created_at: Math.floor(Date.now() / 1000)
      }));

      const result = await this.client.collections(collectionName).documents().import(documentsWithTimestamp, options);
      
      if (result.some(item => item.success === false)) {
        Logger.warn('Bulk import completed with errors:', result.filter(item => !item.success));
      }

      return result;
    } catch (error) {
      Logger.error('Bulk import failed:', error);
      throw error;
    }
  }

  // Utility methods for common operations

  async logEvent(event, level = 'info', context = {}) {
    if (!this.enabled) {
      return null;
    }

    try {
      const logEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        level,
        message: event.message || event,
        context: JSON.stringify(context),
        source: event.source || 'application',
        timestamp: Math.floor(Date.now() / 1000),
        environment: process.env.NODE_ENV || 'development'
      };

      return await this.indexDocument(config.collections.logs, logEntry);
    } catch (error) {
      Logger.error('Failed to log event to Typesense:', error);
      // Don't throw here to prevent logging failures from crashing the app
      return null;
    }
  }

  async indexUser(user) {
    if (!this.enabled) {
      return null;
    }

    try {
      const userDocument = {
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        isActive: user.isActive,
        createdAt: Math.floor(new Date(user.createdAt).getTime() / 1000),
        updatedAt: Math.floor(new Date(user.updatedAt).getTime() / 1000)
      };

      return await this.indexDocument(config.collections.users, userDocument);
    } catch (error) {
      Logger.error('Failed to index user:', error);
      return null;
    }
  }

  async searchUsers(query, options = {}) {
    if (!this.enabled) {
      throw new Error('Typesense not available');
    }

    const searchParameters = {
      q: query,
      query_by: 'fullName,email',
      sort_by: options.sort || 'createdAt:desc',
      per_page: options.limit || 10,
      page: Math.floor((options.offset || 0) / (options.limit || 10)) + 1,
      highlight_full_fields: 'fullName,email'
    };

    return await this.searchDocuments(config.collections.users, searchParameters);
  }

  async setupDefaultCollections() {
    if (!this.enabled) {
      return;
    }

    try {
      // Users collection
      await this.createCollection('users', {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string', facet: true },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'fullName', type: 'string' },
          { name: 'role', type: 'string', facet: true },
          { name: 'isActive', type: 'bool', facet: true },
          { name: 'createdAt', type: 'int64' },
          { name: 'updatedAt', type: 'int64' }
        ],
        default_sorting_field: 'createdAt'
      });

      // Logs collection
      await this.createCollection('logs', {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'level', type: 'string', facet: true },
          { name: 'message', type: 'string' },
          { name: 'context', type: 'string', optional: true },
          { name: 'source', type: 'string', facet: true, optional: true },
          { name: 'timestamp', type: 'int64' },
          { name: 'environment', type: 'string', facet: true }
        ],
        default_sorting_field: 'timestamp'
      });

      Logger.info('Default Typesense collections created successfully');
    } catch (error) {
      Logger.error('Failed to setup default collections:', error);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  isHealthy() {
    return this.enabled && this.isConnected;
  }

  getClient() {
    return this.client;
  }

  async disconnect() {
    // Typesense client doesn't require explicit disconnect
    this.isConnected = false;
    Logger.info('Typesense service disconnected');
  }
}

// Create singleton instance
const typesenseService = new TypesenseService();

module.exports = typesenseService;