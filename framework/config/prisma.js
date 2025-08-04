const { PrismaClient } = require('@prisma/client');
const Logger = require('../helpers/Logger');

// Import test client conditionally
let TestPrismaClient = null;
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  try {
    const testPrismaModule = require('./prisma.test');
    TestPrismaClient = testPrismaModule.TestPrismaService;
  } catch (error) {
    Logger.warn('Test Prisma client not available:', error.message);
  }
}

class PrismaService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
    
    // Use test client in test environment if available
    if (this.isTestEnvironment && TestPrismaClient) {
      this.testService = new TestPrismaClient();
      Logger.info('Using test Prisma client for testing environment');
    } else {
      this.initializeClient();
    }
  }

  initializeClient() {
    try {
      // Configure logging based on environment
      const logConfig = this.isTestEnvironment ? [
        {
          emit: 'event',
          level: 'error',
        }
      ] : [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ];

      const clientConfig = {
        log: logConfig,
        errorFormat: 'minimal',
        // Reduce connection timeout to prevent hanging
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      };

      // Add connection pooling and timeouts for production
      if (!this.isTestEnvironment) {
        clientConfig.datasources.db.url = `${process.env.DATABASE_URL}?connection_limit=10&pool_timeout=60&connect_timeout=10`;
      }

      this.client = new PrismaClient(clientConfig);

      // Set up event listeners
      this.setupEventListeners();

      Logger.info(`Prisma client initialized for ${this.isTestEnvironment ? 'testing' : 'production'}`);
    } catch (error) {
      Logger.error('Failed to initialize Prisma client:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.client.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development' && process.env.LOG_LEVEL === 'debug') {
        Logger.debug(`Query: ${e.query} Params: ${e.params} Duration: ${e.duration}ms`);
      }
    });

    this.client.$on('error', (e) => {
      Logger.error('Prisma error:', e);
    });

    this.client.$on('info', (e) => {
      Logger.info('Prisma info:', e.message);
    });

    this.client.$on('warn', (e) => {
      Logger.warn('Prisma warning:', e.message);
    });
  }

  async connect() {
    try {
      // Use test service in test environment
      if (this.isTestEnvironment && this.testService) {
        const result = await this.testService.connect();
        this.isConnected = result;
        return result;
      }

      if (!this.client) {
        this.initializeClient();
      }

      // Add connection timeout to prevent hanging
      const connectPromise = this.client.$connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 10000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      this.isConnected = true;
      Logger.info('Database connected successfully');
      
      // Only in development, test the connection with a simple query
      if (process.env.NODE_ENV === 'development') {
        try {
          await this.client.$queryRaw`SELECT 1`;
          Logger.debug('Database query test successful');
        } catch (queryError) {
          Logger.warn('Database connected but query test failed:', queryError.message);
        }
      }
      
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('Database connection failed:', error.message);
      
      // In development, provide helpful error messages
      if (process.env.NODE_ENV === 'development') {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
          Logger.error('💡 Tip: Make sure your database server is running and accessible');
          Logger.error('💡 Check your DATABASE_URL environment variable');
        }
        if (error.message.includes('authentication failed')) {
          Logger.error('💡 Tip: Check your database credentials in DATABASE_URL');
        }
        if (error.message.includes('does not exist')) {
          Logger.error('💡 Tip: Make sure your database exists and migrations are applied');
          Logger.error('💡 Run: npm run db:migrate');
        }
      }
      
      // Don't throw in development to prevent crash loops
      if (process.env.NODE_ENV === 'development') {
        Logger.warn('Database connection failed, continuing without database...');
        return false;
      }
      
      throw error;
    }
  }

  async disconnect() {
    try {
      // Disconnect test service in test environment
      if (this.isTestEnvironment && this.testService) {
        await this.testService.disconnect();
        this.isConnected = false;
        return;
      }

      if (this.client) {
        await this.client.$disconnect();
        this.isConnected = false;
        Logger.info('Database disconnected');
      }
    } catch (error) {
      Logger.error('Error disconnecting from database:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // Use test service health check in test environment
      if (this.isTestEnvironment && this.testService) {
        return await this.testService.healthCheck();
      }

      if (!this.client) {
        throw new Error('Prisma client not initialized');
      }

      await this.client.$queryRaw`SELECT 1`;
      return {
        status: 'connected',
        message: 'Database connection healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Database health check failed:', error);
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getClient() {
    // Return test client in test environment
    if (this.isTestEnvironment && this.testService) {
      return this.testService.getClient();
    }

    if (!this.client) {
      throw new Error('Prisma client not initialized');
    }
    return this.client;
  }

  isHealthy() {
    return this.isConnected && this.client !== null;
  }

  // Transaction wrapper with proper error handling
  async transaction(operations) {
    try {
      const client = this.getClient();
      return await client.$transaction(operations);
    } catch (error) {
      Logger.error('Transaction failed:', error);
      throw error;
    }
  }

  // Safe query execution with error handling
  async safeQuery(operation, errorMessage = 'Database query failed') {
    try {
      const client = this.getClient();
      return await operation(client);
    } catch (error) {
      Logger.error(`${errorMessage}:`, error);
      throw error;
    }
  }

  // Test-specific methods
  async resetTestDatabase() {
    if (this.isTestEnvironment && this.testService) {
      return await this.testService.resetDatabase();
    }
    throw new Error('Reset is only available in test environment');
  }

  async cleanTestDatabase() {
    if (this.isTestEnvironment && this.testService) {
      return await this.testService.cleanDatabase();
    }
    throw new Error('Clean is only available in test environment');
  }
}

// Create singleton instance
const prismaService = new PrismaService();

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prismaService.disconnect();
});

process.on('SIGINT', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

// Export both the service and client for backward compatibility
module.exports = prismaService.getClient();
module.exports.prismaService = prismaService; 