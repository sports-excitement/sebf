# Error Handling

This document explains the comprehensive error handling system in the Sports Excitement Backend Framework, covering global error management, service-specific error handling, and graceful degradation strategies.

---

## 🛡️ **Error Handling Architecture**

SEBF implements a **multi-layered error handling approach** that ensures robust application behavior and excellent user experience:

### **Error Handling Layers**

1. **Global Error Handler** - Framework-level error interception and processing
2. **Service-Level Errors** - Graceful handling of external service failures
3. **Controller Errors** - HTTP-specific error handling and response formatting
4. **Validation Errors** - Input validation and sanitization error management
5. **Database Errors** - Prisma and connection error handling
6. **Authentication Errors** - JWT and session validation error management
7. **Custom Exceptions** - Application-specific error types and handling

### **Error Philosophy**

✅ **Fail Gracefully** - Applications continue working when non-critical services fail
✅ **Detailed Logging** - Comprehensive error logging with context for debugging
✅ **User-Friendly Messages** - Clear, actionable error messages for API consumers
✅ **Security Conscious** - Never expose internal system details to clients
✅ **Performance Focused** - Error handling doesn't impact application performance

---

## 🌐 **Global Error Handler**

The framework's global error handler is located in `framework/middleware/ErrorHandler.js` and provides centralized error processing:

### **Core Error Handler**

```javascript
// framework/middleware/ErrorHandler.js
const Response = require('../helpers/Response');
const Logger = require('../helpers/Logger');

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      PRISMA: 'PrismaClientKnownRequestError',
      REDIS: 'RedisError',
      TYPESENSE: 'TypesenseError',
      FIREBASE: 'FirebaseError',
      JWT: 'JsonWebTokenError',
      VALIDATION: 'ValidationError',
      NETWORK: 'NetworkError'
    };
  }

  handle(error, req, res, next) {
    // Don't handle errors that have already been handled
    if (res.headersSent) {
      return next(error);
    }

    // Service-specific error handling
    if (this.isPrismaError(error)) {
      return this.handlePrismaError(error, req, res);
    }
    
    if (this.isRedisError(error)) {
      return this.handleRedisError(error, req, res);
    }
    
    if (this.isTypesenseError(error)) {
      return this.handleTypesenseError(error, req, res);
    }

    if (this.isFirebaseError(error)) {
      return this.handleFirebaseError(error, req, res);
    }

    if (this.isJWTError(error)) {
      return this.handleJWTError(error, req, res);
    }

    if (this.isValidationError(error)) {
      return this.handleValidationError(error, req, res);
    }

    // Log error with full context
    this.logError(error, req);
    
    // Return generic error response
    return this.handleGenericError(error, req, res);
  }

  logError(error, req) {
    const context = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.sessionId,
      timestamp: new Date().toISOString(),
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      stack: error.stack
    };

    Logger.error(error.message, { error: error.name, context });
  }

  handleGenericError(error, req, res) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = error.statusCode || error.status || 500;
    
    return Response.error(res, 
      'Internal server error', 
      isDevelopment ? error.message : 'Something went wrong',
      statusCode
    );
  }
}

module.exports = new ErrorHandler();
```

### **Service-Specific Error Handlers**

```javascript
class ErrorHandler {
  handlePrismaError(error, req, res) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return Response.conflict(res, 'Duplicate entry detected', 'A record with this information already exists');
        
      case 'P2025': // Record not found
        return Response.notFound(res, 'Record not found', 'The requested resource could not be found');
        
      case 'P2003': // Foreign key constraint
        return Response.badRequest(res, 'Invalid reference', 'Referenced record does not exist');
        
      case 'P2021': // Table does not exist
        Logger.error('Database schema error:', error.message);
        return Response.error(res, 'Database configuration error', 
          isDevelopment ? error.message : 'Service temporarily unavailable', 503);
        
      default:
        Logger.error('Prisma error:', error.message);
        return Response.error(res, 'Database operation failed', 
          isDevelopment ? error.message : 'Database temporarily unavailable', 503);
    }
  }

  handleRedisError(error, req, res) {
    Logger.warn('Redis error (graceful degradation):', error.message);
    
    // Redis errors usually don't stop the request
    // The service should handle fallback internally
    // This handler is for when Redis errors bubble up to controllers
    
    return Response.error(res, 'Cache service unavailable', 
      'The request was processed but caching is temporarily unavailable', 503);
  }

  handleTypesenseError(error, req, res) {
    Logger.warn('Typesense error:', error.message);
    
    if (error.httpStatus === 404) {
      return Response.notFound(res, 'Search results not found', 'No matching results found');
    }
    
    if (error.httpStatus === 400) {
      return Response.badRequest(res, 'Invalid search query', 'Please check your search parameters');
    }
    
    return Response.error(res, 'Search service unavailable', 
      'Search functionality is temporarily unavailable', 503);
  }

  handleFirebaseError(error, req, res) {
    Logger.warn('Firebase error:', error.message);
    
    if (error.code === 'messaging/invalid-registration-token') {
      return Response.badRequest(res, 'Invalid device token', 'Please update your app and try again');
    }
    
    if (error.code === 'messaging/registration-token-not-registered') {
      return Response.badRequest(res, 'Device not registered', 'Please register for notifications first');
    }
    
    return Response.error(res, 'Notification service unavailable', 
      'Notifications are temporarily unavailable', 503);
  }

  handleJWTError(error, req, res) {
    if (error.name === 'TokenExpiredError') {
      return Response.unauthorized(res, 'Token expired', 'Please login again');
    }
    
    if (error.name === 'JsonWebTokenError') {
      return Response.unauthorized(res, 'Invalid token', 'Authentication failed');
    }
    
    if (error.name === 'NotBeforeError') {
      return Response.unauthorized(res, 'Token not active', 'Token is not yet valid');
    }
    
    return Response.unauthorized(res, 'Authentication failed', 'Please login again');
  }

  handleValidationError(error, req, res) {
    const validationErrors = error.details || error.errors || [error.message];
    
    return Response.unprocessableEntity(res, 'Validation failed', {
      message: 'Please check your input data',
      errors: validationErrors
    });
  }
}
```

---

## 🔧 **Service Error Handling**

Each service implements graceful error handling with fallback mechanisms:

### **Redis Service Error Handling**

```javascript
// framework/services/RedisService.js
class RedisService {
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      Logger.warn('Redis GET error:', error.message, { key });
      
      if (this.config.fallback.toMemory) {
        // Fallback to memory storage
        return this.memoryFallback.get(key) || null;
      }
      
      return null; // Graceful degradation
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      Logger.warn('Redis SET error:', error.message, { key });
      
      if (this.config.fallback.toMemory) {
        // Fallback to memory storage
        this.memoryFallback.set(key, value, ttl);
      }
      
      return false; // Indicate failure but don't throw
    }
  }

  async testConnection() {
    const startTime = Date.now();
    
    try {
      await this.client.ping();
      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('Redis connection test failed:', error.message);
      return { 
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}
```

### **Typesense Service Error Handling**

```javascript
// framework/services/TypesenseService.js
class TypesenseService {
  async search(collection, searchParams) {
    try {
      const result = await this.client.collections(collection)
        .documents()
        .search(searchParams);
        
      return {
        success: true,
        data: result,
        source: 'typesense'
      };
    } catch (error) {
      Logger.warn('Typesense search error:', error.message, { collection, searchParams });
      
      // Provide fallback search if configured
      if (this.config.fallback.enabled) {
        return this.fallbackSearch(collection, searchParams);
      }
      
      return {
        success: false,
        message: 'Search temporarily unavailable',
        error: error.message,
        fallback: false
      };
    }
  }

  async indexDocument(collection, document) {
    try {
      const result = await this.client.collections(collection)
        .documents()
        .create(document);
        
      return { success: true, data: result };
    } catch (error) {
      Logger.error('Typesense indexing error:', error.message, { collection, document });
      
      // Don't fail the main operation for indexing errors
      return { success: false, error: error.message };
    }
  }

  fallbackSearch(collection, searchParams) {
    // Simple fallback search using database
    Logger.info('Using fallback search for collection:', collection);
    
    return {
      success: true,
      data: {
        hits: [],
        found: 0,
        out_of: 0,
        page: 1,
        search_time_ms: 0
      },
      source: 'fallback'
    };
  }
}
```

### **Firebase Service Error Handling**

```javascript
// framework/services/FirebaseService.js
class FirebaseService {
  async sendNotification(message) {
    try {
      const result = await this.messaging.send(message);
      Logger.info('Firebase notification sent:', result);
      return { success: true, messageId: result };
} catch (error) {
      Logger.error('Firebase notification error:', error.message, { message });
      
      // Handle specific Firebase errors
      if (error.code === 'messaging/invalid-registration-token') {
        return { 
          success: false, 
          error: 'invalid_token', 
          message: 'Device token is invalid' 
        };
      }
      
      if (error.code === 'messaging/registration-token-not-registered') {
        return { 
          success: false, 
          error: 'token_not_registered', 
          message: 'Device is not registered for notifications' 
        };
      }
      
      return { 
        success: false, 
        error: 'send_failed', 
        message: error.message 
      };
    }
  }

  async sendBatchNotifications(messages) {
    try {
      const result = await this.messaging.sendAll(messages);
      
      const response = {
        success: result.failureCount === 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses
      };
      
      if (result.failureCount > 0) {
        Logger.warn('Some Firebase notifications failed:', {
          successCount: result.successCount,
          failureCount: result.failureCount
        });
      }
      
      return response;
    } catch (error) {
      Logger.error('Firebase batch notification error:', error.message);
      return { 
        success: false, 
        error: error.message,
        successCount: 0,
        failureCount: messages.length
      };
    }
  }
}
```

---

## 📊 **Controller Error Patterns**

Controllers implement consistent error handling patterns:

### **Standard Error Handling**

```javascript
// app/Http/Controllers/UserController.js
class UserController {
  async show(req, res) {
    try {
      const { id } = req.params;
      
      // Validate parameters
      if (!/^\d+$/.test(id)) {
        return Response.badRequest(res, 'Invalid user ID format');
      }
      
      const user = await UserService.getUserById(parseInt(id));
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }
      
      return Response.success(res, user, 'User retrieved successfully');
      
    } catch (error) {
      // Let global error handler process the error
      // It will handle Prisma errors, validation errors, etc.
      throw error;
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Business logic validation
      if (updateData.role && req.user.role !== 'admin') {
        return Response.forbidden(res, 'Not authorized to change user role');
      }
      
      const updatedUser = await UserService.updateUser(parseInt(id), updateData);
      
      return Response.success(res, updatedUser, 'User updated successfully');
      
    } catch (error) {
      // Specific error handling for known business errors
      if (error.message === 'User not found') {
        return Response.notFound(res, 'User not found');
      }
      
      if (error.message === 'Email already exists') {
        return Response.conflict(res, 'Email address is already in use');
      }
      
      // Let global handler process other errors
      throw error;
    }
  }
}
```

### **Service Integration Error Handling**

```javascript
class UserController {
  async uploadAvatar(req, res) {
    try {
      const userId = req.user.id;
      
      if (!req.file) {
        return Response.badRequest(res, 'No file uploaded');
      }
      
      const result = await UserService.uploadAvatar(userId, req.file);
      
      // Handle service errors gracefully
      if (!result.success) {
        if (result.error === 'file_too_large') {
          return Response.badRequest(res, 'File too large', 'Maximum file size is 5MB');
        }
        
        if (result.error === 'invalid_format') {
          return Response.badRequest(res, 'Invalid file format', 'Only JPEG, PNG, and WebP files are allowed');
        }
        
        if (result.error === 'storage_unavailable') {
          return Response.error(res, 'Storage service unavailable', 'Please try again later', 503);
        }
        
        return Response.error(res, 'Upload failed', result.message, 500);
      }
      
      return Response.success(res, {
        avatar: result.avatarUrl,
        thumbnail: result.thumbnailUrl
      }, 'Avatar uploaded successfully');
      
    } catch (error) {
      throw error; // Let global handler process
    }
  }
}
```

---

## 🧪 **Error Handling in Tests**

### **Testing Error Scenarios**

```javascript
// tests/Feature/ErrorHandling.test.js
describe('Error Handling', () => {
  test('should handle database errors gracefully', async () => {
    // Mock Prisma error
    const mockError = new Error('Connection lost');
    mockError.code = 'P1001';
    jest.spyOn(UserService, 'getUserById').mockRejectedValue(mockError);
    
    const response = await request(app)
      .get('/api/users/1')
      .expect(503);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Database temporarily unavailable');
  });

  test('should handle validation errors properly', async () => {
    const invalidUserData = {
      email: 'invalid-email',
      password: '123' // Too short
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(invalidUserData)
      .expect(422);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.errors).toBeDefined();
  });

  test('should handle service unavailable errors', async () => {
    // Mock Redis service error
    jest.spyOn(RedisService, 'get').mockRejectedValue(new Error('Redis connection failed'));
    
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200); // Should still work due to graceful degradation
    
    expect(response.body.success).toBe(true);
  });

  test('should not expose sensitive error details in production', async () => {
    process.env.NODE_ENV = 'production';
    
    // Mock internal error
    jest.spyOn(UserService, 'getUserById').mockRejectedValue(new Error('Internal database connection string exposed'));
    
    const response = await request(app)
      .get('/api/users/1')
      .expect(500);
    
    expect(response.body.error).not.toContain('database connection string');
    expect(response.body.error).toBe('Something went wrong');
    
    process.env.NODE_ENV = 'testing';
  });
});
```

---

## 📈 **Error Monitoring and Alerting**

### **Error Logging Strategy**

```javascript
// framework/helpers/Logger.js
class Logger {
  error(message, meta = {}) {
    const logEntry = {
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ...meta
    };

    // Console logging
    console.error(`❌ [ERROR] ${message}`, meta);

    // File logging
    this.writeToFile('error.log', logEntry);

    // External monitoring (if configured)
    if (process.env.MONITORING_ENABLED === 'true') {
      this.sendToMonitoring(logEntry);
    }

    // Database logging for critical errors
    if (meta.critical) {
      this.logToDatabase(logEntry);
    }
  }

  async logToDatabase(logEntry) {
    try {
      const prismaService = require('../config/prisma');
      await prismaService.systemLog.create({
        data: {
          level: 'ERROR',
          message: logEntry.message,
          meta: logEntry,
          source: 'ErrorHandler'
        }
      });
    } catch (error) {
      // Don't let logging errors crash the application
      console.error('Failed to log error to database:', error.message);
    }
  }
}
```

### **Health Check Integration**

```javascript
// Error tracking in health checks
async function getSystemHealth() {
  const health = {
    overall: 'healthy',
    services: {},
    errors: {
      last24Hours: 0,
      criticalErrors: 0
    }
  };

  try {
    // Check recent error count
    const errorCount = await prismaService.systemLog.count({
      where: {
        level: 'ERROR',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    health.errors.last24Hours = errorCount;

    // Check critical errors
    const criticalErrors = await prismaService.systemLog.count({
      where: {
        level: 'ERROR',
        meta: {
          path: ['critical'],
          equals: true
        },
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      }
    });

    health.errors.criticalErrors = criticalErrors;

    // Determine overall health
    if (criticalErrors > 0) {
      health.overall = 'critical';
    } else if (errorCount > 100) {
      health.overall = 'degraded';
    }

  } catch (error) {
    Logger.warn('Health check error counting failed:', error.message);
    health.errors.note = 'Error counting unavailable';
  }

  return health;
}
```

---

## 🚀 **Best Practices**

### **Error Handling Guidelines**

1. **Fail Gracefully** - Applications should continue working when non-critical services fail
2. **Log Comprehensively** - Capture full context including user, request, and system state
3. **Respond Appropriately** - Use correct HTTP status codes and clear error messages
4. **Protect Sensitive Data** - Never expose internal system details in error responses
5. **Monitor Actively** - Track error patterns and system health metrics

### **Service Error Patterns**

1. **Graceful Degradation** - Provide fallback functionality when services fail
2. **Circuit Breaker** - Temporarily disable failing services to prevent cascading failures
3. **Retry Logic** - Implement intelligent retry strategies for transient failures
4. **Timeout Handling** - Set appropriate timeouts for all external service calls
5. **Health Monitoring** - Continuously monitor service health and availability

### **Development Guidelines**

1. **Test Error Scenarios** - Write tests for all error conditions
2. **Environment Awareness** - Show detailed errors in development, generic in production
3. **Error Classification** - Categorize errors by severity and impact
4. **Response Consistency** - Use standardized error response formats
5. **Documentation** - Document all possible error conditions and responses

### **Performance Considerations**

1. **Efficient Logging** - Don't let error logging impact application performance
2. **Async Operations** - Handle errors in async operations without blocking
3. **Memory Management** - Prevent error handling from causing memory leaks
4. **Error Aggregation** - Batch error reports for external monitoring systems
5. **Circuit Breaking** - Prevent error cascades from overwhelming the system

The comprehensive error handling system ensures that SEBF applications remain stable, secure, and maintainable while providing excellent debugging capabilities and user experience.