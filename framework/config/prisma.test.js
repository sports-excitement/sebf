const { PrismaClient } = require('../../prisma/testing/generated/client');
const Logger = require('../helpers/Logger');
const path = require('path');

class TestPrismaService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.testDbPath = path.join(__dirname, '../../prisma/testing/test.db');
    this.initializeClient();
  }

  initializeClient() {
    try {
      this.client = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'error',
          }
        ],
        errorFormat: 'minimal',
        datasources: {
          db: {
            url: `file:${this.testDbPath}`
          }
        }
      });

      // Set up event listeners (minimal for testing)
      this.setupEventListeners();

      Logger.info('Test Prisma client initialized');
    } catch (error) {
      Logger.error('Failed to initialize Test Prisma client:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.client.$on('error', (e) => {
      Logger.error('Test Prisma error:', e);
    });
  }

  async connect() {
    try {
      if (!this.client) {
        this.initializeClient();
      }

      await this.client.$connect();
      this.isConnected = true;
      Logger.info('Test database connected successfully');
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('Test database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.$disconnect();
        this.isConnected = false;
        Logger.info('Test database disconnected');
      }
    } catch (error) {
      Logger.error('Error disconnecting from test database:', error);
      throw error;
    }
  }

  async resetDatabase() {
    try {
      // For SQLite, we can recreate the database by pushing the schema
      if (this.client) {
        await this.client.$disconnect();
      }

      // Remove the test database file if it exists
      const fs = require('fs');
      if (fs.existsSync(this.testDbPath)) {
        fs.unlinkSync(this.testDbPath);
      }

      // Push schema to create tables - this is the key step that was missing!
      await this.pushSchema();

      // Reinitialize client after schema is pushed
      this.initializeClient();
      await this.connect();

      Logger.info('Test database reset completed with schema');
    } catch (error) {
      Logger.error('Test database reset failed:', error);
      throw error;
    }
  }

  async pushSchema() {
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      
      // Run prisma db push for the test schema
      const prismaCmd = spawn('npx', [
        'prisma', 'db', 'push', 
        '--schema=prisma/testing/schema.prisma',
        '--accept-data-loss'
      ], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe'
      });

      return new Promise((resolve, reject) => {
        let output = '';
        let errorOutput = '';

        prismaCmd.stdout.on('data', (data) => {
          output += data.toString();
        });

        prismaCmd.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        prismaCmd.on('close', (code) => {
          if (code === 0) {
            Logger.debug('Schema pushed successfully');
            resolve();
          } else {
            Logger.error('Schema push failed:', errorOutput);
            reject(new Error(`Schema push failed with code ${code}: ${errorOutput}`));
          }
        });
      });
    } catch (error) {
      Logger.error('Failed to push schema:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        throw new Error('Test Prisma client not initialized');
      }

      await this.client.$queryRaw`SELECT 1`;
      return {
        status: 'connected',
        message: 'Test database connection healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Test database health check failed:', error);
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Test Prisma client not initialized');
    }
    return this.client;
  }

  isHealthy() {
    return this.isConnected && this.client !== null;
  }

  // Transaction wrapper with proper error handling
  async transaction(operations) {
    try {
      return await this.client.$transaction(operations);
    } catch (error) {
      Logger.error('Test transaction failed:', error);
      throw error;
    }
  }

  // Safe query execution with error handling
  async safeQuery(operation, errorMessage = 'Test database query failed') {
    try {
      return await operation(this.client);
    } catch (error) {
      Logger.error(`${errorMessage}:`, error);
      throw error;
    }
  }

  // Helper method to clean all tables
  async cleanDatabase() {
    try {
      // Clean tables in reverse dependency order
      await this.client.systemLog.deleteMany({});
      await this.client.notification.deleteMany({});
      await this.client.session.deleteMany({});
      await this.client.user.deleteMany({});

      Logger.debug('Test database cleaned successfully');
    } catch (error) {
      Logger.error('Failed to clean test database:', error);
      throw error;
    }
  }
}

// Create singleton instance for testing
let testPrismaService = null;

// Only create the test service in test environment
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  testPrismaService = new TestPrismaService();
}

module.exports = {
  testPrismaService,
  TestPrismaService
};