# Database and Models

This document explains the advanced database architecture, dual Prisma ORM setup, and data modeling patterns used in the Sports Excitement Backend Framework.

---

## 🗄️ **Database Architecture**

SEBF implements a **dual database strategy** that optimizes for both performance and testing efficiency:

### **Primary Architecture**
- **Main Database** - PostgreSQL for production and development
- **Test Database** - SQLite for fast, isolated testing
- **Session Storage** - Redis for distributed session management
- **Search Engine** - Typesense for full-text search and analytics
- **Object Storage** - MinIO for file and media storage
- **Cache Layer** - Redis for performance optimization

### **Dual Database Benefits**

#### **PostgreSQL (Main Database)**
✅ **Production Ready** - Full ACID compliance and reliability
✅ **Advanced Features** - Complex queries, relationships, and constraints
✅ **Scalability** - Horizontal and vertical scaling capabilities
✅ **Rich Ecosystem** - Extensive tooling and extensions

#### **SQLite (Test Database)**
✅ **Lightning Fast** - In-memory database for rapid testing
✅ **Zero Configuration** - No external database server required
✅ **Isolated Testing** - Each test run gets a fresh database
✅ **CI/CD Friendly** - No infrastructure dependencies

---

## 🏗️ **Prisma ORM Integration**

### **Enhanced Prisma Architecture**

The framework provides an advanced Prisma service that automatically switches between databases based on environment:

```javascript
// framework/config/prisma.js - Main Prisma Service
class PrismaService {
  constructor() {
    // Automatically switch to test client in test environment
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
      this.testService = new TestPrismaClient();
      this.isTestMode = true;
    } else {
      this.initializeClient();
      this.isTestMode = false;
    }
  }

  initializeClient() {
    this.client = new PrismaClient({
      log: process.env.LOG_LEVEL === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  // All methods automatically delegate to test service when in test mode
  async connect() {
    if (this.testService) {
      return this.testService.connect();
    }
    return this.connectMainDatabase();
  }

  async healthCheck() {
    if (this.testService) {
      return this.testService.healthCheck();
    }
    return this.mainHealthCheck();
  }

  // Seamless database switching
  get user() {
    return this.testService ? this.testService.client.user : this.client.user;
  }
  
  get systemLog() {
    return this.testService ? this.testService.client.systemLog : this.client.systemLog;
  }
}
```

### **Test Database Service**

```javascript
// framework/config/prisma.test.js - Test-Specific Client
class TestPrismaService {
  constructor() {
    this.client = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || "file:./prisma/test.db"
        }
      },
      log: ['error']
    });
  }

  async connect() {
    try {
      await this.client.$connect();
      return { status: 'connected', message: 'Test database connected' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  async resetDatabase() {
    // Reset all tables for clean test state
    const tables = ['User', 'Session', 'SystemLog'];
    
    for (const table of tables) {
      try {
        await this.client[table.toLowerCase()].deleteMany({});
    } catch (error) {
        // Table might not exist yet, ignore
      }
    }
  }

  async cleanDatabase() {
    // Clean up test data after tests
    try {
      await this.client.systemLog.deleteMany({});
      await this.client.user.deleteMany({});
    } catch (error) {
      // Ignore errors for non-existent tables
    }
  }
}
```

---

## 📊 **Database Schema**

### **Dual Schema Setup**

The framework maintains two Prisma schemas:

```
prisma/
├── schema.prisma          # 📊 Main database schema (PostgreSQL)
├── schema.test.prisma     # 🧪 Test database schema (SQLite)
└── generated/             # 🔄 Generated clients
    ├── client/            # Main Prisma client
    └── test-client/       # Test Prisma client
```

### **Main Schema (`prisma/schema.prisma`)**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "./generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  firstName String?
  lastName  String?
  role      UserRole @default(USER)
  active    Boolean  @default(true)
  verified  Boolean  @default(false)
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLogin DateTime?
  
  // Optional profile fields
  avatar    String?
  phone     String?
  timezone  String?  @default("UTC")
  
  // Relationships
  sessions  Session[]
  apiKeys   ApiKey[]
  
  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    Int
  token     String   @unique
  ipAddress String?
  userAgent String?
  isActive  Boolean  @default(true)
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  // Relationships
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}

model SystemLog {
  id        Int      @id @default(autoincrement())
  level     LogLevel @default(INFO)
  message   String
  meta      Json?
  source    String?
  userId    Int?
  createdAt DateTime @default(now())
  
  @@map("system_logs")
}

model ApiKey {
  id          Int      @id @default(autoincrement())
  name        String
  key         String   @unique
  userId      Int
  permissions Json?
  isActive    Boolean  @default(true)
  lastUsed    DateTime?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())
  
  // Relationships
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("api_keys")
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
}
```

### **Test Schema (`prisma/schema.test.prisma`)**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "./generated/test-client"
}

datasource db {
  provider = "sqlite"
  url      = env("TEST_DATABASE_URL")
}

// Simplified schema optimized for testing
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  password  String
  firstName String?
  lastName  String?
  role      String   @default("USER")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model SystemLog {
  id        Int      @id @default(autoincrement())
  level     String   @default("INFO")
  message   String
  meta      String?  // JSON as string in SQLite
  createdAt DateTime @default(now())
}
```

---

## 🔧 **Database Operations**

### **Service Integration**

Database operations are performed through service classes that work seamlessly with both databases:

```javascript
// app/Services/UserService.js
const prismaService = require('../../framework/config/prisma');

class UserService {
  constructor() {
    this.prisma = prismaService;
  }

  async createUser(userData) {
    try {
      // Works with both PostgreSQL and SQLite automatically
      const user = await this.prisma.user.create({
        data: {
          email: userData.email,
          password: await bcrypt.hash(userData.password, 12),
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'USER'
        }
      });

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async getAllUsers(options = {}, filters = {}) {
    const { page = 1, limit = 10, sortBy = 'id', sortOrder = 'asc' } = options;
    const { search, role, active } = filters;

    const where = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (active !== undefined) {
      where.active = active;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
          lastLogin: true
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      users,
      total,
        page,
        limit,
        pages: Math.ceil(total / limit)
    };
  }

  async getUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
          select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        verified: true,
        avatar: true,
        phone: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    });
  }

  async updateUser(id, updateData) {
    const data = { ...updateData };
    
    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }
    
    data.updatedAt = new Date();

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        updatedAt: true
      }
    });
  }

  async deleteUser(id) {
    // Revoke all user sessions first
    await this.revokeUserSessions(id);
    
    // Delete the user
    return this.prisma.user.delete({
      where: { id }
    });
  }
}
```

### **Transaction Management**

```javascript
class UserService {
  async transferUserData(fromUserId, toUserId) {
    return this.prisma.transaction(async (tx) => {
      // Transfer user's API keys
      await tx.apiKey.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId }
      });

      // Transfer user's system logs
      await tx.systemLog.updateMany({
        where: { userId: fromUserId },
        data: { userId: toUserId }
      });

      // Deactivate the old user
      await tx.user.update({
        where: { id: fromUserId },
        data: { active: false }
      });

      return { success: true, message: 'User data transferred successfully' };
    });
  }

  async createUserWithProfile(userData, profileData) {
    return this.prisma.transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: userData
      });

      // Create initial system log
      await tx.systemLog.create({
    data: { 
          level: 'INFO',
          message: 'User account created',
          meta: { userId: user.id, email: user.email },
          source: 'UserService'
        }
      });

      return user;
    });
  }
}
```

---

## 🧪 **Testing Database Management**

### **Test Environment Setup**

```javascript
// tests/setup.js
const prismaService = require('../framework/config/prisma');

module.exports = {
  setupDatabase: async () => {
    // Ensure we're in test mode
    process.env.NODE_ENV = 'testing';
    
    // Connect to test database
    await prismaService.connect();
    
    // Reset database for clean test state
    await prismaService.resetTestDatabase();
  },

  cleanupDatabase: async () => {
    try {
      // Clean test data
      await prismaService.cleanTestDatabase();
    } catch (error) {
      console.warn('Database cleanup failed:', error.message);
    }
  },

  createTestUser: async (overrides = {}) => {
    return prismaService.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        active: true,
        ...overrides
      }
    });
  },

  createTestAdmin: async (overrides = {}) => {
    return prismaService.user.create({
      data: {
        email: 'admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        active: true,
        ...overrides
      }
    });
  }
};
```

### **Test Database Operations**

```javascript
// Example test file
describe('User Database Operations', () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prismaService.disconnect();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prismaService.cleanTestDatabase();
  });

  test('should create user in test database', async () => {
    const userData = {
      email: 'newuser@test.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User'
    };

    const user = await UserService.createUser(userData);

    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
    expect(user.firstName).toBe(userData.firstName);
  });

  test('should handle database constraints', async () => {
    // Create first user
    await createTestUser({ email: 'duplicate@test.com' });

    // Try to create duplicate
    await expect(
      UserService.createUser({
        email: 'duplicate@test.com',
        password: 'password123',
        firstName: 'Duplicate',
        lastName: 'User'
      })
    ).rejects.toThrow('Email already exists');
  });
});
```

---

## 📊 **Database Management Commands**

### **Prisma CLI Commands**

```bash
# Main database operations
npm run prisma:generate       # Generate main Prisma client
npm run prisma:push          # Push schema to main database
npm run prisma:migrate       # Run database migrations
npm run prisma:studio        # Open Prisma Studio
npm run prisma:reset         # Reset main database

# Test database operations
npm run prisma:test:generate # Generate test Prisma client
npm run prisma:test:push     # Push schema to test database
npm run prisma:test:reset    # Reset test database

# Database seeding
npm run db:seed              # Seed main database
npm run setup:test           # Setup test environment
```

### **Control CLI Database Commands**

```bash
# Database health and management
npm run control db:health            # Check database connection
npm run control db:migrate           # Run migrations
npm run control db:seed              # Seed database
npm run control db:reset             # Reset database (dangerous!)

# Test database management
npm run control test:setup           # Setup test environment
npm run control test:reset           # Reset test database
npm run control test:clean           # Clean test data
```

---

## 🚀 **Database Performance**

### **Connection Optimization**

```javascript
// framework/config/prisma.js - Enhanced connection management
class PrismaService {
  async connectMainDatabase() {
    const connectionString = this.buildConnectionString();
    
    try {
      // Use connection pooling and timeout settings
      await Promise.race([
        this.client.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);

      this.isConnected = true;
      Logger.info('✅ Database connected successfully');
      
      return { status: 'connected', message: 'Database connected successfully' };
    } catch (error) {
      Logger.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  buildConnectionString() {
    const baseUrl = process.env.DATABASE_URL;
    const params = new URLSearchParams({
      'connection_limit': '10',
      'pool_timeout': '10',
      'connect_timeout': '10'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
}
```

### **Query Optimization**

```javascript
class UserService {
  async getUsersWithCounts() {
    // Efficient aggregate query
    const [users, totalUsers, activeUsers] = await Promise.all([
      prismaService.user.findMany({
        take: 10,
  select: {
    id: true,
    email: true,
    firstName: true,
          lastName: true,
          role: true,
          active: true,
          _count: {
            select: {
              sessions: true,
              apiKeys: true
            }
          }
        }
      }),
      prismaService.user.count(),
      prismaService.user.count({ where: { active: true } })
    ]);

    return { users, totalUsers, activeUsers };
  }

  async searchUsers(query) {
    // Optimized search with index usage
    return prismaService.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: 20,
      orderBy: [
        { active: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }
}
```

---

## 🔒 **Database Security**

### **Data Validation**

```javascript
class UserService {
  async createUser(userData) {
    // Input validation before database operation
    const validatedData = this.validateUserData(userData);
    
    // Sanitize sensitive data
    const sanitizedData = {
      ...validatedData,
      email: validatedData.email.toLowerCase().trim(),
      password: await this.hashPassword(validatedData.password)
    };

    return prismaService.user.create({
      data: sanitizedData,
      select: this.safeUserSelect // Exclude sensitive fields
    });
  }

  get safeUserSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true
      // Exclude: password, sensitive meta data
    };
  }
}
```

### **Access Control**

```javascript
class UserService {
  async getUserById(id, requestingUser) {
    // Check if user can access this data
    if (requestingUser.role !== 'ADMIN' && requestingUser.id !== id) {
      throw new Error('Unauthorized access to user data');
    }

    const selectFields = requestingUser.role === 'ADMIN' 
      ? this.adminUserSelect 
      : this.safeUserSelect;

    return prismaService.user.findUnique({
      where: { id },
      select: selectFields
    });
  }
}
```

---

## 📚 **Best Practices**

### **Database Design**

1. **Dual Schema Strategy** - Separate schemas for different environments
2. **Automatic Environment Detection** - Framework handles database switching
3. **Transaction Safety** - Use transactions for multi-step operations
4. **Connection Pooling** - Optimize connection management
5. **Query Optimization** - Use selective fields and proper indexing

### **Testing Strategy**

1. **Isolated Test Database** - SQLite for fast, independent tests
2. **Clean State** - Reset database between tests
3. **Test Utilities** - Helper functions for common test operations
4. **Mock Data Generation** - Consistent test data creation
5. **Performance Testing** - Test database operations under load

### **Security Guidelines**

1. **Input Validation** - Always validate data before database operations
2. **SQL Injection Prevention** - Use Prisma's built-in parameterization
3. **Access Control** - Implement proper authorization checks
4. **Data Sanitization** - Clean and sanitize input data
5. **Audit Logging** - Log all sensitive database operations

### **Performance Optimization**

1. **Selective Queries** - Only fetch required fields
2. **Efficient Indexing** - Proper database indexing strategy
3. **Connection Management** - Optimize connection pooling
4. **Query Batching** - Use Promise.all for parallel operations
5. **Caching Strategy** - Cache frequently accessed data

The dual database architecture provides a robust, scalable foundation for data management while maintaining excellent testing capabilities and development efficiency.