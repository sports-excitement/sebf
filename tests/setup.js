/**
 * Jest Test Setup
 * Configures test environment and global test utilities
 */

const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
const testEnvPath = path.resolve(__dirname, '../.env.testing');
dotenv.config({ path: testEnvPath });

// Set NODE_ENV to testing
process.env.NODE_ENV = 'testing';

// Global test utilities
global.testUtils = {
  // Test data helpers
  createTestUser: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    ...overrides
  }),

  createTestSession: (userId) => ({
    userId: userId,
    data: { test: true },
    expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
  }),

  // JWT helpers
  createTestJWT: (payload = {}) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
        ...payload
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },

  // HTTP helpers
  getAuthHeaders: (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }),

  getHealthCheckHeaders: () => ({
    'X-Health-API-Key': process.env.HEALTH_CHECK_API_KEY,
    'Content-Type': 'application/json'
  }),

  // Response validation helpers
  expectSuccess: (response) => {
    expect(response.status).toBeLessThan(400);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
  },

  expectError: (response, statusCode) => {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
  },

  // Database helpers
  cleanupDatabase: async () => {
    const { prismaService } = require('../framework/config/prisma');
    
    try {
      // Use test-specific cleanup method
      if (prismaService.isTestEnvironment) {
        await prismaService.cleanTestDatabase();
      } else {
        // Fallback for non-test environments
        const client = prismaService.getClient();
        await client.systemLog.deleteMany({});
        await client.notification.deleteMany({});
        await client.session.deleteMany({});
        await client.user.deleteMany({});
      }
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  },

  // Redis helpers
  cleanupRedis: async () => {
    const RedisService = require('../framework/services/RedisService');
    if (RedisService.isEnabled) {
      await RedisService.flushTestDb();
    }
  },

  // Wait helper for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock helpers
  mockService: (servicePath, methods = {}) => {
    const originalService = require(servicePath);
    return {
      ...originalService,
      ...methods
    };
  }
};

// Memory optimization for tests
if (global.gc) {
  global.gc();
}

// Global test hooks
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Ensure we're in test environment
  process.env.NODE_ENV = 'testing';
  
  try {
    // Initialize test database
    const { prismaService } = require('../framework/config/prisma');
    await prismaService.connect();
    
    // Reset test database to ensure clean state
    if (prismaService.isTestEnvironment) {
      await prismaService.resetTestDatabase();
    }
    
    // Initialize Redis for testing (with test database)
    const RedisService = require('../framework/services/RedisService');
    if (RedisService.isEnabled && typeof RedisService.initialize === 'function') {
      await RedisService.initialize();
    }
    
    console.log('✅ Test environment ready');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    process.exit(1);
  }
});

beforeEach(async () => {
  // Clean up before each test
  try {
    await global.testUtils.cleanupDatabase();
    await global.testUtils.cleanupRedis();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  } catch (error) {
    console.warn('Test cleanup warning:', error.message);
  }
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Cleanup database
    await global.testUtils.cleanupDatabase();
    
    // Cleanup Redis
    await global.testUtils.cleanupRedis();
    
    // Disconnect services
    const { prismaService } = require('../framework/config/prisma');
    await prismaService.disconnect();
    
    const RedisService = require('../framework/services/RedisService');
    if (RedisService.isEnabled && typeof RedisService.disconnect === 'function') {
      await RedisService.disconnect();
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Test cleanup complete');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, just log
});

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Memory management for tests
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('MaxListenersExceededWarning detected:', warning.message);
  }
});

// Cleanup memory leaks
afterEach(() => {
  // Clear any module cache for test isolation
  // This helps prevent memory leaks in tests
  if (global.gc) {
    global.gc();
  }
}); 