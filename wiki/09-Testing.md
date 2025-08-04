# Testing

This document explains the comprehensive testing strategy and implementation in the Sports Excitement Backend Framework, including the advanced dual database testing architecture.

---

## 🧪 **Testing Architecture**

SEBF implements a **sophisticated testing strategy** that ensures reliability, performance, and maintainability:

### **Testing Framework Stack**
- **Jest** - Primary testing framework with advanced configuration
- **Supertest** - HTTP assertion library for API testing
- **Dual Database** - PostgreSQL for integration tests, SQLite for unit tests
- **Service Mocking** - Comprehensive service layer mocking capabilities
- **Test Isolation** - Complete test environment isolation

### **Test Types**

1. **Feature Tests** (`tests/Feature/`) - End-to-end API testing with full database integration
2. **Unit Tests** (`tests/Unit/`) - Isolated component testing with service mocking
3. **Integration Tests** - Service interaction and workflow testing
4. **Health Check Tests** - System monitoring and service availability validation
5. **Performance Tests** - Load testing and performance validation
6. **Security Tests** - Authentication, authorization, and vulnerability testing

---

## 🏗️ **Dual Database Testing Strategy**

### **Architecture Overview**

SEBF uses a revolutionary **dual database approach** that optimizes both test speed and reliability:

```
Testing Architecture:
├── Main Database (PostgreSQL)     # Integration & Feature Tests
│   ├── Full schema compliance
│   ├── Real production scenarios  
│   └── Complex relationship testing
│
└── Test Database (SQLite)         # Unit & Fast Tests
    ├── Lightning-fast execution
    ├── Zero external dependencies
    └── Perfect test isolation
```

### **Automatic Database Switching**

The framework automatically switches databases based on test environment:

```javascript
// tests/setup.js - Enhanced Test Setup
const prismaService = require('../framework/config/prisma');
const RedisService = require('../framework/services/RedisService');

// Global test configuration
process.env.NODE_ENV = 'testing';
process.env.TEST_DATABASE_URL = 'file:./prisma/test.db';
process.env.REDIS_DATABASE = '1'; // Separate Redis DB for tests

module.exports = {
  // Test database setup
  setupDatabase: async () => {
    console.log('🔧 Setting up test environment...');
    
    // Connect to appropriate database (auto-switched by framework)
    await prismaService.connect();
    
    // Reset database for clean state
    await prismaService.resetTestDatabase();
    
    console.log('✅ Test database ready');
  },

  // Database cleanup
  cleanupDatabase: async () => {
    try {
      await prismaService.cleanTestDatabase();
      console.log('🧹 Test database cleaned');
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  },

  // Service setup for tests
  setupServices: async () => {
    // Initialize Redis for tests (separate DB)
    if (process.env.REDIS_ENABLED === 'true') {
      await RedisService.initialize();
    }
  },

  // Complete cleanup
  teardownAll: async () => {
    await prismaService.disconnect();
    if (RedisService.isConnected) {
      await RedisService.disconnect();
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ Test cleanup complete');
  }
};
```

---

## 📋 **Test Structure**

### **Comprehensive Test Organization**

```
tests/
├── Feature/                    # 🎯 End-to-End API Tests
│   ├── HealthCheck.test.js    # System health endpoints
│   ├── UserApi.test.js        # User management API
│   ├── AuthFlow.test.js       # Authentication workflows
│   └── AdminApi.test.js       # Administrative operations
│
├── Unit/                      # 🔬 Isolated Component Tests
│   ├── Services/              # Service layer tests
│   │   ├── UserService.test.js
│   │   ├── RedisService.test.js
│   │   ├── TypesenseService.test.js
│   │   └── FirebaseService.test.js
│   ├── Controllers/           # Controller tests
│   │   └── UserController.test.js
│   └── Helpers/              # Utility tests
│       ├── Response.test.js
│       └── Logger.test.js
│
├── Integration/               # 🔗 Service Integration Tests
│   ├── DatabaseOperations.test.js
│   ├── ServiceInteractions.test.js
│   └── WorkflowTests.test.js
│
├── Performance/              # 🚀 Performance Tests
│   ├── LoadTesting.test.js
│   └── MemoryUsage.test.js
│
├── Security/                 # 🔐 Security Tests
│   ├── AuthSecurity.test.js
│   └── InputValidation.test.js
│
├── setup.js                  # 🔧 Global test setup
├── globalSetup.js           # 🌍 Pre-test environment setup
├── globalTeardown.js        # 🧹 Post-test cleanup
└── fixtures/                # 📊 Test data and utilities
    ├── userData.js
    ├── mockServices.js
    └── testHelpers.js
```

---

## ⚙️ **Advanced Jest Configuration**

### **Production-Grade Jest Setup**

```javascript
// jest.config.js - Enhanced Configuration
module.exports = {
  testEnvironment: 'node',
  
  // Test setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Timeout configuration
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.js',
    'framework/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './app/Services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Performance optimization
  maxWorkers: '50%',
  forceExit: true,
  detectOpenHandles: true,
  
  // Module mapping for framework imports
  moduleNameMapping: {
    '^@framework/(.*)$': '<rootDir>/framework/$1',
    '^@app/(.*)$': '<rootDir>/app/$1'
  }
};
```

### **Test Scripts Configuration**

```json
// package.json - Enhanced Test Scripts
{
  "scripts": {
    "test": "NODE_ENV=test jest --maxWorkers=1",
    "test:unit": "NODE_ENV=test jest tests/Unit --maxWorkers=1",
    "test:feature": "NODE_ENV=test jest tests/Feature --maxWorkers=1",
    "test:integration": "NODE_ENV=test jest tests/Integration --maxWorkers=1",
    "test:coverage": "NODE_ENV=test jest --coverage --maxWorkers=1",
    "test:watch": "NODE_ENV=test jest --watch --maxWorkers=1",
    "test:debug": "NODE_ENV=test node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:performance": "NODE_ENV=test jest tests/Performance --maxWorkers=1",
    "test:security": "NODE_ENV=test jest tests/Security --maxWorkers=1"
  }
}
```

---

## 🎯 **Feature Tests - API Testing**

### **Comprehensive API Testing**

```javascript
// tests/Feature/UserApi.test.js
const request = require('supertest');
const app = require('../../bootstrap/app');
const { setupDatabase, cleanupDatabase, createTestUser } = require('../setup');

describe('User API Feature Tests', () => {
  let authToken;
  let adminToken;
  
  beforeAll(async () => {
    await setupDatabase();
    
    // Create test users with authentication
    const user = await createTestUser({
      email: 'user@test.com',
      role: 'USER'
    });
    authToken = user.token;
    
    const admin = await createTestUser({
      email: 'admin@test.com',
      role: 'ADMIN'
    });
    adminToken = admin.token;
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('Authentication Flow', () => {
    test('POST /api/auth/register - should create new user', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('POST /api/auth/login - should authenticate user', async () => {
      const loginData = {
        email: 'user@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    test('POST /api/auth/logout - should logout user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('User Management', () => {
    test('GET /api/users/profile - should return user profile', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    test('PUT /api/users/profile - should update profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
    });

    test('GET /api/users - should require admin role', async () => {
      // Test with regular user token
      await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Test with admin token
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
    });

  describe('Error Handling', () => {
    test('should handle invalid authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication failed');
    });

    test('should handle duplicate email registration', async () => {
      const userData = {
        email: 'user@test.com', // Already exists
        password: 'password123',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });
  });
});
```

---

## 🔬 **Unit Tests - Service Testing**

### **Service Layer Testing with Mocking**

```javascript
// tests/Unit/Services/UserService.test.js
const UserService = require('../../../app/Services/UserService');
const prismaService = require('../../../framework/config/prisma');
const JWTSessionService = require('../../../framework/services/JWTSessionService');

// Mock external dependencies
jest.mock('../../../framework/config/prisma');
jest.mock('../../../framework/services/JWTSessionService');

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'plaintext123',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockUser = {
        id: 1,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'USER',
        active: true,
        createdAt: new Date()
      };

      // Mock Prisma client
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await UserService.createUser(userData);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          password: expect.not.stringMatching(userData.password), // Should be hashed
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: 'USER'
        })
      });

      expect(result).toEqual(mockUser);
    });

    test('should handle duplicate email error', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123'
      };

      const duplicateError = new Error('Unique constraint failed');
      duplicateError.code = 'P2002';

      prismaService.user.create.mockRejectedValue(duplicateError);

      await expect(UserService.createUser(userData))
        .rejects
        .toThrow('Email already exists');
    });
  });

  describe('registerUser', () => {
    test('should create user and generate JWT token', async () => {
      const userData = {
        email: 'register@example.com',
        password: 'password123',
        firstName: 'Register',
        lastName: 'Test'
      };

      const mockUser = { id: 1, ...userData, password: 'hashed' };
      const mockToken = 'jwt-token-123';
      const mockSessionId = 'session-123';

      prismaService.user.create.mockResolvedValue(mockUser);
      JWTSessionService.generateToken.mockResolvedValue({
        token: mockToken,
        sessionId: mockSessionId,
        expiresIn: '7d'
      });

      const result = await UserService.registerUser(userData);

      expect(result).toEqual({
        user: expect.objectContaining({
          id: 1,
          email: userData.email
        }),
        token: mockToken,
        sessionId: mockSessionId,
        expiresIn: '7d'
      });

      expect(JWTSessionService.generateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      });
    });
  });

  describe('getAllUsers', () => {
    test('should return paginated users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', firstName: 'User', lastName: 'One' },
        { id: 2, email: 'user2@test.com', firstName: 'User', lastName: 'Two' }
      ];

      prismaService.user.findMany.mockResolvedValue(mockUsers);
      prismaService.user.count.mockResolvedValue(25);

      const options = { page: 1, limit: 10 };
      const filters = { active: true };

      const result = await UserService.getAllUsers(options, filters);

      expect(result).toEqual({
        users: mockUsers,
        total: 25,
        page: 1,
        limit: 10,
        pages: 3
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: { active: true },
        skip: 0,
        take: 10,
        orderBy: { id: 'asc' },
        select: expect.any(Object)
      });
    });
  });
});
```

---

## 🔗 **Integration Tests**

### **Service Integration Testing**

```javascript
// tests/Integration/DatabaseOperations.test.js
const prismaService = require('../../framework/config/prisma');
const RedisService = require('../../framework/services/RedisService');
const UserService = require('../../app/Services/UserService');
const { setupDatabase, cleanupDatabase } = require('../setup');

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('User-Session Integration', () => {
    test('should create user and establish session', async () => {
      // Create user through service
      const userData = {
        email: 'integration@test.com',
        password: 'password123',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const registrationResult = await UserService.registerUser(userData);

      // Verify user in database
      const dbUser = await prismaService.user.findUnique({
        where: { email: userData.email }
      });

      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(userData.email);

      // Verify session in Redis
      const sessionExists = await RedisService.exists(`session:${registrationResult.sessionId}`);
      expect(sessionExists).toBe(true);

      // Login and verify session management
      const loginResult = await UserService.loginUser(userData.email, userData.password);
      expect(loginResult.success).toBe(true);

      // Verify multiple sessions for same user
      const userSessions = await UserService.getUserSessions(dbUser.id);
      expect(userSessions.length).toBeGreaterThan(0);
    });

    test('should handle transaction rollback on error', async () => {
      const userData = {
        email: 'transaction@test.com',
        password: 'password123'
      };

      // Mock an error that occurs after user creation but before session creation
      const originalGenerateToken = UserService.generateToken;
      UserService.generateToken = jest.fn().mockRejectedValue(new Error('Token generation failed'));

      await expect(UserService.registerUser(userData))
        .rejects
        .toThrow('Token generation failed');

      // Verify user was not created due to transaction rollback
      const dbUser = await prismaService.user.findUnique({
        where: { email: userData.email }
      });

      expect(dbUser).toBeNull();

      // Restore original method
      UserService.generateToken = originalGenerateToken;
    });
  });
});
```

---

## 🚀 **Performance Tests**

### **Load Testing and Performance Validation**

```javascript
// tests/Performance/LoadTesting.test.js
const request = require('supertest');
const app = require('../../bootstrap/app');
const { setupDatabase, cleanupDatabase, createTestUser } = require('../setup');

describe('Performance Tests', () => {
  let authToken;

  beforeAll(async () => {
    await setupDatabase();
    const user = await createTestUser();
    authToken = user.token;
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  test('should handle concurrent user creation', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array.from({ length: concurrentRequests }, (_, index) => 
      request(app)
        .post('/api/auth/register')
        .send({
          email: `concurrent${index}@test.com`,
          password: 'password123',
          firstName: 'Concurrent',
          lastName: `User${index}`
        })
    );

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All requests should succeed
    const successfulRequests = results.filter(result => 
      result.status === 'fulfilled' && result.value.status === 201
    );

    expect(successfulRequests.length).toBe(concurrentRequests);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

    console.log(`✅ ${concurrentRequests} concurrent registrations completed in ${duration}ms`);
  });

  test('should maintain response time under load', async () => {
    const requestCount = 50;
    const responseTimes = [];

    for (let i = 0; i < requestCount; i++) {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    expect(averageResponseTime).toBeLessThan(100); // Average under 100ms
    expect(maxResponseTime).toBeLessThan(500); // Max under 500ms

    console.log(`📊 Average response time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`📊 Max response time: ${maxResponseTime}ms`);
  });
});
```

---

## 🔐 **Security Tests**

### **Security and Vulnerability Testing**

```javascript
// tests/Security/AuthSecurity.test.js
const request = require('supertest');
const app = require('../../bootstrap/app');
const { setupDatabase, cleanupDatabase } = require('../setup');

describe('Security Tests', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
  });

  describe('Authentication Security', () => {
    test('should prevent SQL injection in login', async () => {
      const maliciousInput = {
        email: "admin@test.com'; DROP TABLE users; --",
        password: "password123"
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(401); // Should fail authentication, not crash

      expect(response.body.success).toBe(false);
    });

    test('should rate limit login attempts', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const results = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(result => result.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('should sanitize user input', async () => {
      const maliciousInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: '<script>alert("XSS")</script>',
        lastName: '<?php echo "PHP injection"; ?>'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput)
        .expect(201);

      expect(response.body.data.user.firstName).not.toContain('<script>');
      expect(response.body.data.user.lastName).not.toContain('<?php');
    });
  });

  describe('Authorization Security', () => {
    test('should prevent privilege escalation', async () => {
      // Create regular user
      const userData = {
        email: 'regular@test.com',
        password: 'password123',
        firstName: 'Regular',
        lastName: 'User'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const userToken = registerResponse.body.data.token;

      // Try to access admin endpoint
        const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('admin');
    });
  });
});
```

---

## 📊 **Test Utilities and Fixtures**

### **Test Helper Functions**

```javascript
// tests/fixtures/testHelpers.js
const bcrypt = require('bcryptjs');
const prismaService = require('../../framework/config/prisma');
const JWTSessionService = require('../../framework/services/JWTSessionService');

class TestHelpers {
  static async createTestUser(overrides = {}) {
    const defaultUserData = {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 12),
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      active: true,
      ...overrides
    };

    const user = await prismaService.user.create({
      data: defaultUserData
    });

    // Generate token for the user
    const tokenData = await JWTSessionService.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      ...user,
      token: tokenData.token,
      sessionId: tokenData.sessionId
    };
  }

  static async createTestAdmin(overrides = {}) {
    return this.createTestUser({
      email: 'admin@example.com',
      role: 'ADMIN',
      ...overrides
    });
  }

  static async cleanAllTestData() {
    // Clean in order to respect foreign key constraints
    await prismaService.systemLog.deleteMany({});
    await prismaService.session.deleteMany({});
    await prismaService.user.deleteMany({});
  }

  static generateMockServiceError(serviceName, errorType = 'CONNECTION_ERROR') {
    const error = new Error(`Mock ${serviceName} error`);
    error.code = errorType;
    error.service = serviceName;
    return error;
  }

  static async waitForAsyncOperations(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static createMockRequest(overrides = {}) {
    return {
      method: 'GET',
      url: '/api/test',
      headers: {},
      body: {},
      params: {},
      query: {},
      user: null,
      ...overrides
    };
  }

  static createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      headersSent: false
    };
    return res;
  }
}

module.exports = TestHelpers;
```

### **Mock Service Factory**

```javascript
// tests/fixtures/mockServices.js
class MockServiceFactory {
  static createMockRedisService() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      setSession: jest.fn(),
      getSession: jest.fn(),
      testConnection: jest.fn().mockResolvedValue({ status: 'connected' }),
      isConnected: true
    };
  }

  static createMockTypesenseService() {
    return {
      search: jest.fn().mockResolvedValue({
        success: true,
        data: { hits: [], found: 0 }
      }),
      indexDocument: jest.fn().mockResolvedValue({ success: true }),
      testConnection: jest.fn().mockResolvedValue({ status: 'connected' })
    };
  }

  static createMockFirebaseService() {
    return {
      sendNotification: jest.fn().mockResolvedValue({ success: true }),
      sendBatchNotifications: jest.fn().mockResolvedValue({ 
        success: true, 
        successCount: 1, 
        failureCount: 0 
      }),
      testConnection: jest.fn().mockResolvedValue({ status: 'connected' })
    };
  }
}

module.exports = MockServiceFactory;
```

---

## 🎯 **Testing Best Practices**

### **Test Organization Guidelines**

1. **Clear Test Structure** - Organize tests by feature and functionality
2. **Descriptive Test Names** - Use clear, descriptive test descriptions
3. **Test Isolation** - Each test should be independent and idempotent
4. **Setup and Teardown** - Proper test environment setup and cleanup
5. **Mock External Dependencies** - Mock external services and APIs

### **Performance Testing Guidelines**

1. **Realistic Load Testing** - Test with realistic user loads and data volumes
2. **Response Time Monitoring** - Set and monitor acceptable response times
3. **Memory Usage Testing** - Monitor memory consumption during tests
4. **Concurrent Testing** - Test concurrent operations and race conditions
5. **Database Performance** - Test database operations under load

### **Security Testing Guidelines**

1. **Input Validation Testing** - Test all input validation and sanitization
2. **Authentication Testing** - Test all authentication and authorization flows
3. **Injection Testing** - Test for SQL injection, XSS, and other injection attacks
4. **Session Security** - Test session management and token security
5. **Rate Limiting** - Test rate limiting and abuse prevention

### **Test Data Management**

1. **Test Fixtures** - Use consistent test data across tests
2. **Database Seeding** - Seed test databases with representative data
3. **Data Cleanup** - Always clean up test data after tests
4. **Test Isolation** - Ensure tests don't interfere with each other
5. **Realistic Data** - Use realistic test data that matches production patterns

---

## 📈 **Test Coverage and Quality**

### **Coverage Requirements**

- **Overall Coverage**: Minimum 75% for all metrics
- **Service Layer**: Minimum 85% coverage (critical business logic)
- **Controller Layer**: Minimum 80% coverage (API endpoints)
- **Utility Functions**: Minimum 90% coverage (helper functions)

### **Quality Metrics**

```bash
# Generate detailed coverage report
npm run test:coverage

# Coverage output example:
# ========================= Coverage summary =========================
# Statements   : 82.45% ( 450/546 )
# Branches     : 78.33% ( 235/300 )
# Functions    : 85.71% ( 180/210 )
# Lines        : 83.12% ( 445/535 )
# ================================================================
```

The comprehensive testing strategy ensures that SEBF applications are reliable, secure, and performant while maintaining high code quality and developer confidence.