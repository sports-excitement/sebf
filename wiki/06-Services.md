# Services

This document explains the service layer architecture and the comprehensive service ecosystem available in the Sports Excitement Backend Framework.

---

## 🏗️ **Service Architecture**

SEBF implements a **service-oriented architecture** where services are self-contained, reusable components that handle specific infrastructure concerns. Each service provides a consistent interface with health monitoring, connection management, and graceful degradation.

### **Service Design Philosophy**

- **Single Responsibility** - Each service handles one infrastructure concern
- **Dynamic Loading** - Services are loaded based on environment configuration
- **Health Monitoring** - Every service provides health check capabilities
- **Graceful Degradation** - Applications continue working when optional services fail
- **Consistent Interface** - All services follow the same pattern for reliability

### **Service Types**

1. **Framework Services** (`framework/services/`) - Infrastructure services provided by the framework
2. **Application Services** (`app/Services/`) - Business logic services specific to your application

---

## 🔧 **Framework Services**

These services are provided by the framework core and handle infrastructure concerns:

### **📊 Database Service (Prisma) - Required**
**Location**: `framework/config/prisma.js`

PostgreSQL database access with automatic test database switching:

```javascript
const prismaService = require('../framework/config/prisma');

// Automatic health check
const health = await prismaService.healthCheck();

// Database operations - automatically uses test DB in test environment
const user = await prismaService.user.findUnique({
  where: { id: 1 }
});

// Transactions
const result = await prismaService.transaction(async (tx) => {
  const user = await tx.user.create({ data: { email: 'test@example.com' } });
  const profile = await tx.profile.create({ data: { userId: user.id } });
  return { user, profile };
});
```

**Features:**
- **Dual Database Support** - PostgreSQL for main, SQLite for testing
- **Automatic Connection Management** - Connection pooling and retry logic
- **Health Monitoring** - Real-time connection status
- **Test Environment** - Automatic test database switching
- **Transaction Support** - Safe transaction handling

### **🔴 Redis Service - Required**
**Location**: `framework/services/RedisService.js`

High-performance caching and session storage:

```javascript
const RedisService = require('../framework/services/RedisService');

// Caching
await RedisService.set('user:123', userData, 3600); // 1 hour TTL
const user = await RedisService.get('user:123');

// Session management
await RedisService.setSession(sessionId, sessionData);
const session = await RedisService.getSession(sessionId);

// Pub/Sub
await RedisService.publish('notifications', { userId: 123, message: 'Hello' });
```

**Features:**
- **Session Storage** - Distributed session management for clustering
- **Caching Layer** - High-performance data caching
- **Pub/Sub** - Real-time messaging capabilities
- **Connection Pooling** - Efficient connection management
- **Fallback Support** - Memory fallback when Redis unavailable

### **🔍 Typesense Service - Optional**
**Location**: `framework/services/TypesenseService.js`

Modern search engine with typo tolerance and real-time indexing:

```javascript
const TypesenseService = require('../framework/services/TypesenseService');

// Search operations
const results = await TypesenseService.search('users', {
  q: 'john doe',
  query_by: 'name,email',
  filter_by: 'status:active'
});

// Index management
await TypesenseService.indexDocument('users', {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active'
});

// Bulk operations
await TypesenseService.bulkIndex('users', usersArray);
```

**Features:**
- **Typo Tolerance** - Intelligent search with spelling corrections
- **Real-time Indexing** - Instant search updates
- **Faceted Search** - Advanced filtering capabilities
- **Analytics** - Built-in search analytics
- **High Performance** - Sub-millisecond search responses

### **🔥 Firebase Service - Optional**
**Location**: `framework/services/FirebaseService.js`

Push notifications and real-time analytics:

```javascript
const FirebaseService = require('../framework/services/FirebaseService');

// Push notifications
await FirebaseService.sendNotification({
  token: deviceToken,
  title: 'New Message',
  body: 'You have a new message from John',
  data: { userId: '123', type: 'message' }
});

// Batch notifications
await FirebaseService.sendBatchNotifications([
  { token: token1, title: 'Title 1', body: 'Body 1' },
  { token: token2, title: 'Title 2', body: 'Body 2' }
]);

// Analytics events
await FirebaseService.logEvent('user_action', {
  userId: '123',
  action: 'purchase',
  value: 29.99
});
```

**Features:**
- **Push Notifications** - Cross-platform mobile notifications
- **Device Management** - Token registration and management
- **Analytics Integration** - User behavior tracking
- **Real-time Database** - Live data synchronization
- **Batch Operations** - Efficient bulk notification sending

### **🎫 JWT Session Service - Framework Core**
**Location**: `framework/services/JWTSessionService.js`

Advanced JWT token management with Redis-backed sessions:

```javascript
const JWTSessionService = require('../framework/services/JWTSessionService');

// Token generation
const { token, sessionId } = await JWTSessionService.generateToken({
  userId: 123,
  email: 'user@example.com',
  role: 'user'
});

// Token validation
const decoded = await JWTSessionService.verifyToken(token);

// Session management
await JWTSessionService.revokeSession(sessionId);
const sessions = await JWTSessionService.getUserSessions(userId);
await JWTSessionService.revokeAllUserSessions(userId);

// Token refresh
const { newToken, newSessionId } = await JWTSessionService.refreshToken(oldToken);
```

**Features:**
- **Distributed Sessions** - Redis-backed session storage for clustering
- **Token Revocation** - Immediate token invalidation
- **Session Management** - Per-user session tracking
- **Refresh Tokens** - Secure token renewal
- **Security Features** - IP tracking, device fingerprinting

### **🧠 Memory Service - Optional**
**Location**: `framework/services/MemoryService.js`

Node.js memory monitoring and optimization:

```javascript
const MemoryService = require('../framework/services/MemoryService');

// Memory usage
const usage = await MemoryService.getMemoryUsage();
console.log(`Heap used: ${usage.heapUsed}MB`);

// Memory optimization
await MemoryService.forceGarbageCollection();

// Memory monitoring
MemoryService.startMonitoring({
  interval: 60000, // Check every minute
  threshold: 80,   // Alert at 80% usage
  callback: (usage) => {
    if (usage.percentage > 80) {
      console.warn('High memory usage detected:', usage);
    }
  }
});
```

**Features:**
- **Real-time Monitoring** - Continuous memory usage tracking
- **Garbage Collection** - Manual GC triggering for optimization
- **Leak Detection** - Memory leak identification
- **Performance Metrics** - Detailed V8 engine statistics
- **Alerting** - Configurable memory usage alerts

### **📡 SSE Service - Optional**
**Location**: `framework/services/SSEService.js`

Server-Sent Events for real-time communication:

```javascript
const SSEService = require('../framework/services/SSEService');

// Send to all clients
await SSEService.broadcast('notification', {
  title: 'System Update',
  message: 'New features available'
});

// Send to specific user
await SSEService.sendToUser(userId, 'message', {
  from: 'John',
  content: 'Hello there!'
});

// Send to channel
await SSEService.sendToChannel('admin', 'alert', {
  level: 'warning',
  message: 'High CPU usage detected'
});

// Connection management
const connections = SSEService.getActiveConnections();
const userConnections = SSEService.getUserConnections(userId);
```

**Features:**
- **Real-time Broadcasting** - Live updates to all connected clients
- **User-specific Messaging** - Targeted messages to individual users
- **Channel Support** - Topic-based message routing
- **Connection Management** - Active connection tracking
- **Automatic Reconnection** - Client-side reconnection handling

### **🪣 MinIO Service - Optional**
**Location**: `framework/services/MinioService.js`

S3-compatible object storage:

```javascript
const MinioService = require('../framework/services/MinioService');

// File upload
const uploadResult = await MinioService.uploadFile('images', 'profile.jpg', fileBuffer);

// Generate presigned URL
const downloadUrl = await MinioService.getPresignedUrl('images', 'profile.jpg', 3600);

// File operations
const fileExists = await MinioService.fileExists('images', 'profile.jpg');
await MinioService.deleteFile('images', 'profile.jpg');

// Bucket management
await MinioService.createBucket('new-bucket');
const buckets = await MinioService.listBuckets();
```

**Features:**
- **S3 Compatibility** - Standard S3 API compatibility
- **Presigned URLs** - Secure direct upload/download URLs
- **Bucket Management** - Dynamic bucket creation and management
- **File Operations** - Complete file lifecycle management
- **Metadata Support** - Custom file metadata storage

### **🌐 Supabase Service - Optional**
**Location**: `framework/services/SupabaseService.js`

Alternative backend-as-a-service integration:

```javascript
const SupabaseService = require('../framework/services/SupabaseService');

// Database operations
const { data, error } = await SupabaseService.query('users')
  .select('*')
  .eq('status', 'active');

// Real-time subscriptions
const subscription = SupabaseService.subscribe('users', (payload) => {
  console.log('User updated:', payload.new);
});

// Authentication
const user = await SupabaseService.getCurrentUser();
const session = await SupabaseService.getSession();

// Storage operations
const fileUrl = await SupabaseService.uploadFile('avatars', file);
```

**Features:**
- **Real-time Database** - Live data synchronization
- **Authentication** - Built-in auth services
- **Storage Integration** - File storage and management
- **API Generation** - Auto-generated REST APIs
- **Dashboard Access** - Web-based administration

---

## 💼 **Application Services**

These are business logic services specific to your application:

### **👤 User Service**
**Location**: `app/Services/UserService.js`

Comprehensive user management and authentication:

```javascript
const UserService = require('../app/Services/UserService');

// User registration
const user = await UserService.registerUser({
  email: 'user@example.com',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe'
});

// Authentication
const authResult = await UserService.loginUser('email@example.com', 'password');
const { user, token, sessionId } = authResult;

// Session management
await UserService.logoutUser(sessionId);
const sessions = await UserService.getUserSessions(userId);
await UserService.revokeUserSessions(userId);

// User operations
const users = await UserService.getAllUsers({ page: 1, limit: 10 });
const user = await UserService.getUserById(123);
await UserService.updateUser(123, { firstName: 'Jane' });
await UserService.deactivateUser(123);
```

**Features:**
- **Complete Auth Workflow** - Registration, login, logout, session management
- **Password Security** - bcrypt hashing with high salt rounds
- **Session Integration** - JWT session management with Redis
- **User Management** - CRUD operations with pagination and filtering
- **Role Management** - User roles and permissions
- **Account Security** - Password changes, account activation/deactivation

---

## 🎛️ **Dynamic Service Loading**

Services are dynamically loaded based on environment configuration:

```javascript
// bootstrap/app.js - Service loading
const serviceLoader = {
  async loadService(serviceName) {
    const serviceConfig = servicesConfig.getServiceConfig(serviceName);
    if (!serviceConfig || !serviceConfig.enabled) {
      return null;
    }
    
    try {
      switch (serviceName) {
        case 'redis': return require('../framework/services/RedisService');
        case 'typesense': return require('../framework/services/TypesenseService');
        case 'firebase': return require('../framework/services/FirebaseService');
        case 'minio': return require('../framework/services/MinioService');
        case 'supabase': return require('../framework/services/SupabaseService');
        case 'sse': return require('../framework/services/SSEService');
        case 'memory': return require('../framework/services/MemoryService');
        default: return null;
      }
    } catch (error) {
      Logger.error(`Failed to load service ${serviceName}:`, error.message);
      return null;
    }
  }
};
```

---

## 🔍 **Service Management**

### **CLI Commands**

```bash
# Service status
npm run control services status

# Test specific service
npm run control services test redis
npm run control services test typesense
npm run control services test all

# Service information
npm run control services list
npm run control services dependencies
```

### **API Endpoints**

```bash
# Service management API
GET /api/admin/services              # List all services
GET /api/admin/services/:name        # Service details
GET /api/admin/services/dependencies # Service dependencies

# Health monitoring
GET /api/health/services/:service    # Specific service health
GET /api/health/detailed             # All services health
```

### **Configuration Management**

```javascript
// Check service status
const servicesConfig = require('../framework/config/services');

// Get all services
const allServices = servicesConfig.getAllServices();

// Check if service is enabled
const isRedisEnabled = servicesConfig.redis.enabled;

// Get enabled services only
const enabledServices = servicesConfig.getEnabledServices();

// Validate configuration
const errors = servicesConfig.validateConfig();
```

---

## 🧪 **Service Testing**

### **Health Checks**

Every service implements a `testConnection()` method:

```javascript
// Test individual service
const redisHealth = await RedisService.testConnection();
console.log(redisHealth);
// Output: { status: 'connected', responseTime: 15, timestamp: '...' }

// Test all services
const healthChecks = await Promise.allSettled([
  RedisService.testConnection(),
  TypesenseService.testConnection(),
  FirebaseService.testConnection()
]);
```

### **Mocking Services in Tests**

```javascript
// tests/setup.js
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  testConnection: jest.fn().mockResolvedValue({ status: 'connected' })
};

jest.mock('../framework/services/RedisService', () => mockRedisService);
```

### **Integration Testing**

```javascript
// Test service integration
describe('User Service Integration', () => {
  beforeAll(async () => {
    await prismaService.connect();
    await RedisService.initialize();
  });

  afterAll(async () => {
    await prismaService.disconnect();
    await RedisService.shutdown();
  });

  test('should create user with session', async () => {
    const user = await UserService.registerUser({
      email: 'test@example.com',
      password: 'password'
    });
    
    expect(user.id).toBeDefined();
    
    // Verify session was created in Redis
    const sessions = await UserService.getUserSessions(user.id);
    expect(sessions).toHaveLength(1);
  });
});
```

---

## 🎯 **Creating Custom Services**

### **Service Template**

```javascript
// app/Services/CustomService.js
const Logger = require('../../framework/helpers/Logger');

class CustomService {
  constructor() {
    this.config = require('../../framework/config/services').custom || {};
    this.client = null;
    this.isEnabled = this.config.enabled || false;
  }

  async initialize() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'Custom service is disabled' };
    }

    try {
      // Initialize your service connection
      this.client = new YourServiceClient(this.config);
      await this.client.connect();
      
      Logger.info('Custom service initialized successfully');
      return { status: 'connected', message: 'Custom service ready' };
    } catch (error) {
      Logger.error('Custom service initialization failed:', error);
      throw error;
    }
  }

  async testConnection() {
    const startTime = Date.now();
    
    try {
      if (!this.client) {
        throw new Error('Service not initialized');
      }

      // Test your service connection
      await this.client.ping();
      
      return { 
        status: 'connected', 
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async shutdown() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    Logger.info('Custom service shut down');
  }
}

module.exports = new CustomService();
```

### **Service Configuration**

Add to `framework/config/services.js`:

```javascript
const config = {
  // ... existing services
  
  custom: {
    enabled: isServiceEnabled('custom', !!process.env.CUSTOM_SERVICE_URL),
    required: false,
    url: process.env.CUSTOM_SERVICE_URL,
    apiKey: process.env.CUSTOM_SERVICE_API_KEY,
    timeout: parseInt(process.env.CUSTOM_SERVICE_TIMEOUT) || 5000
  }
};
```

---

## 🚀 **Best Practices**

### **Service Design**

1. **Single Responsibility** - Each service handles one concern
2. **Consistent Interface** - All services follow the same pattern
3. **Error Handling** - Graceful degradation and proper error logging
4. **Health Monitoring** - Always implement `testConnection()`
5. **Configuration** - Use environment variables for all settings

### **Performance Optimization**

1. **Connection Pooling** - Reuse connections when possible
2. **Caching** - Cache frequently accessed data
3. **Lazy Loading** - Load services only when needed
4. **Graceful Degradation** - Continue operating when optional services fail

### **Security**

1. **Credential Management** - Use environment variables for secrets
2. **Connection Security** - Use TLS/SSL for external connections
3. **Input Validation** - Validate all service inputs
4. **Error Disclosure** - Don't expose internal errors to clients

### **Testing**

1. **Health Checks** - Test service connectivity regularly
2. **Mocking** - Mock services in unit tests
3. **Integration Tests** - Test service interactions
4. **Error Scenarios** - Test failure conditions

---

## 📊 **Service Monitoring**

### **Health Dashboard**

Monitor all services in real-time:

```bash
# View service status
curl http://localhost:3000/api/health/detailed

# Monitor specific service
curl http://localhost:3000/api/health/services/redis
```

### **Service Metrics**

Each service provides detailed metrics:

```javascript
{
  "status": "connected",
  "responseTime": 15,
  "uptime": 3600,
  "connections": 5,
  "errors": 0,
  "lastCheck": "2024-01-01T12:00:00Z"
}
```

### **Alerting**

Set up monitoring alerts:

```env
# Memory service alerts
MEMORY_ENABLED=true
MEMORY_THRESHOLD=80

# Service health monitoring
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_ALERTS=true
```

The service layer provides a robust, scalable foundation for building complex applications with multiple infrastructure dependencies while maintaining clean separation of concerns and comprehensive monitoring capabilities.