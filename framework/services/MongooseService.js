const mongoose = require('mongoose');
const config = require('../config/services').mongodb;
const Logger = require('../helpers/Logger');

/**
 * MongoDB Service using Mongoose ODM
 * 
 * Handles MongoDB connections, database operations, and health monitoring
 * Supports multiple database connections for different datasets
 */
class MongooseService {
  constructor() {
    this.connections = new Map();
    this.isConnected = false;
    this.connectionOptions = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
      family: 4, // Use IPv4, skip trying IPv6
      bufferMaxEntries: 0,
      bufferCommands: false,
      retryWrites: true,
      w: 'majority',
      readPreference: 'primary'
    };

    // Setup connection event handlers
    this.setupGlobalEventHandlers();
  }

  /**
   * Setup global MongoDB event handlers
   */
  setupGlobalEventHandlers() {
    mongoose.connection.on('connecting', () => {
      Logger.info('🔗 MongoDB connecting...');
    });

    mongoose.connection.on('connected', () => {
      Logger.info('✅ MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('open', () => {
      Logger.info('📂 MongoDB connection opened');
    });

    mongoose.connection.on('disconnecting', () => {
      Logger.warn('🔌 MongoDB disconnecting...');
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('❌ MongoDB disconnected');
      this.isConnected = false;
    });

    mongoose.connection.on('close', () => {
      Logger.info('🔒 MongoDB connection closed');
    });

    mongoose.connection.on('error', (error) => {
      Logger.error('💥 MongoDB connection error:', error.message);
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      Logger.info('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    mongoose.connection.on('timeout', () => {
      Logger.warn('⏱️ MongoDB connection timeout');
    });
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (!config || !config.enabled) {
      Logger.info('MongoDB service is disabled');
      return { status: 'disabled', message: 'MongoDB service is disabled in configuration' };
    }

    try {
      // Primary database connection
      const primaryUri = this.buildConnectionString(config.primary);
      Logger.info(`🔗 Connecting to primary MongoDB: ${this.maskCredentials(primaryUri)}`);
      
      await mongoose.connect(primaryUri, {
        ...this.connectionOptions,
        dbName: config.primary.database
      });

      this.connections.set('primary', mongoose.connection);

      // Secondary database connection (if configured)
      if (config.secondary && config.secondary.enabled) {
        try {
          const secondaryUri = this.buildConnectionString(config.secondary);
          Logger.info(`🔗 Connecting to secondary MongoDB: ${this.maskCredentials(secondaryUri)}`);
          
          const secondaryConnection = mongoose.createConnection(secondaryUri, {
            ...this.connectionOptions,
            dbName: config.secondary.database
          });

          this.connections.set('secondary', secondaryConnection);
          Logger.info('✅ Secondary MongoDB connection established');
        } catch (secondaryError) {
          Logger.warn('⚠️ Failed to connect to secondary MongoDB:', secondaryError.message);
          // Continue with primary connection only
        }
      }

      Logger.info(`✅ MongoDB service initialized with ${this.connections.size} connection(s)`);
      
      return {
        status: 'connected',
        message: 'MongoDB connection successful',
        connections: this.connections.size,
        databases: Array.from(this.connections.keys())
      };

    } catch (error) {
      Logger.error('❌ Failed to connect to MongoDB:', error.message);
      this.isConnected = false;
      
      // Provide helpful error messages
      if (error.message.includes('ECONNREFUSED')) {
        Logger.error('💡 Tip: Make sure MongoDB server is running and accessible');
      }
      if (error.message.includes('Authentication failed')) {
        Logger.error('💡 Tip: Check your MongoDB credentials');
      }
      if (error.message.includes('Server selection timeout')) {
        Logger.error('💡 Tip: Check your MongoDB connection string and network connectivity');
      }

      return { status: 'error', message: error.message };
    }
  }

  /**
   * Build MongoDB connection string
   */
  buildConnectionString(dbConfig) {
    const { host, port, username, password, database, options = {} } = dbConfig;
    
    let uri = 'mongodb://';
    
    // Add authentication if provided
    if (username && password) {
      uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
    }
    
    // Add host and port
    uri += `${host}:${port}`;
    
    // Add database name
    if (database) {
      uri += `/${database}`;
    }
    
    // Add connection options
    const optionParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      optionParams.append(key, value);
    });
    
    if (optionParams.toString()) {
      uri += `?${optionParams.toString()}`;
    }
    
    return uri;
  }

  /**
   * Mask credentials in connection string for logging
   */
  maskCredentials(uri) {
    return uri.replace(/:\/\/[^@]+@/, '://***:***@');
  }

  /**
   * Get connection by name
   */
  getConnection(name = 'primary') {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`MongoDB connection '${name}' not found`);
    }
    return connection;
  }

  /**
   * Get primary connection (default)
   */
  getClient() {
    return this.getConnection('primary');
  }

  /**
   * Test MongoDB connection
   */
  async testConnection(connectionName = 'primary') {
    const startTime = Date.now();
    
    try {
      const connection = this.getConnection(connectionName);
      
      // Test with a simple ping
      await connection.db.admin().ping();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        message: `MongoDB ${connectionName} connection successful`,
        responseTime: responseTime,
        database: connection.name,
        readyState: connection.readyState
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      Logger.error(`MongoDB ${connectionName} connection test failed:`, error.message);
      
      return {
        status: 'error',
        message: error.message,
        responseTime: responseTime,
        connectionName
      };
    }
  }

  /**
   * Health check for all connections
   */
  async healthCheck() {
    try {
      const healthResults = {};
      
      for (const [name, connection] of this.connections.entries()) {
        try {
          await connection.db.admin().ping();
          healthResults[name] = {
            status: 'healthy',
            readyState: connection.readyState,
            database: connection.name,
            host: connection.host,
            port: connection.port
          };
        } catch (error) {
          healthResults[name] = {
            status: 'unhealthy',
            error: error.message,
            readyState: connection.readyState
          };
        }
      }

      const allHealthy = Object.values(healthResults).every(result => result.status === 'healthy');
      
      return {
        status: allHealthy ? 'connected' : 'partial',
        message: allHealthy ? 'All MongoDB connections healthy' : 'Some MongoDB connections have issues',
        connections: healthResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('MongoDB health check failed:', error.message);
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(connectionName = 'primary') {
    try {
      const connection = this.getConnection(connectionName);
      const stats = await connection.db.stats();
      
      return {
        database: connection.name,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      Logger.error(`Failed to get stats for ${connectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Create a model for a specific connection
   */
  createModel(modelName, schema, connectionName = 'primary') {
    try {
      const connection = this.getConnection(connectionName);
      return connection.model(modelName, schema);
    } catch (error) {
      Logger.error(`Failed to create model ${modelName} on ${connectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Execute transaction on a specific connection
   */
  async transaction(operations, connectionName = 'primary') {
    const connection = this.getConnection(connectionName);
    const session = await connection.startSession();
    
    try {
      return await session.withTransaction(async () => {
        return await operations(session);
      });
    } catch (error) {
      Logger.error(`Transaction failed on ${connectionName}:`, error.message);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Close idle connections (for memory optimization)
   */
  closeIdleConnections() {
    // MongoDB driver handles connection pooling automatically
    // We can force collection of unused connections
    this.connections.forEach((connection, name) => {
      if (connection.readyState === 1) { // Connected
        // Force connection pool cleanup
        connection.db.topology?.close?.();
        Logger.info(`🧹 Cleaned up idle connections for ${name}`);
      }
    });
  }

  /**
   * Cleanup caches (for memory optimization)
   */
  cleanupCache() {
    // Clear mongoose model cache if needed
    mongoose.connection.models = {};
    Logger.info('🧹 MongoDB model cache cleared');
  }

  /**
   * Check if service is healthy
   */
  isHealthy() {
    return this.isConnected && this.connections.size > 0;
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      Logger.info('🔌 Disconnecting from MongoDB...');
      
      // Close all named connections
      for (const [name, connection] of this.connections.entries()) {
        if (name !== 'primary') {
          await connection.close();
          Logger.info(`✅ ${name} MongoDB connection closed`);
        }
      }
      
      // Close default connection
      await mongoose.disconnect();
      
      this.connections.clear();
      this.isConnected = false;
      
      Logger.info('✅ All MongoDB connections closed');
    } catch (error) {
      Logger.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: 'MongoDB (Mongoose)',
      version: mongoose.version,
      connections: Array.from(this.connections.keys()),
      isConnected: this.isConnected,
      totalConnections: this.connections.size,
      readyStates: Object.fromEntries(
        Array.from(this.connections.entries()).map(([name, conn]) => [name, conn.readyState])
      )
    };
  }
}

// Create singleton instance
const mongooseService = new MongooseService();

module.exports = mongooseService;