# Routing

This document explains the comprehensive routing system of the Sports Excitement Backend Framework, including the clean separation between framework routes and application routes.

---

## 🛤️ **Route Architecture**

SEBF implements a **dual routing system** that separates framework infrastructure routes from application business logic routes:

- **Framework Routes** (`framework/routes/`) - System routes (health, admin, SSE)
- **Application Routes** (`routes/`) - Business logic routes (users, products, etc.)

This separation ensures that framework-level routes remain stable while application routes can evolve with business requirements.

### **Route Organization**

```
├── framework/routes/           # 🏗️ Framework Infrastructure Routes
│   ├── kernel.js              # System routes (health, admin)
│   └── services.js            # Service management API
│
└── routes/                    # 🎯 Application Business Routes
    ├── api.js                 # Business logic routes
    └── README.md              # Routing documentation
```

---

## 🏗️ **Framework Routes (`framework/routes/`)**

These routes are provided by the framework core and handle system-level concerns:

### **System Routes (`framework/routes/kernel.js`)**

#### **🏠 Root & API Information**
```bash
GET /                          # API welcome and information
GET /api                       # API documentation and endpoints
```

**Example Response:**
```json
{
  "success": true,
  "message": "Welcome to Sports Excitement Backend Framework",
  "data": {
    "name": "Your Application Name",
    "version": "1.0.0",
    "environment": "development",
    "framework": "SEBF",
    "documentation": "/api",
    "health": "/api/health"
  }
}
```

#### **🏥 Health Monitoring Routes**
```bash
GET /api/health                # Basic health check
GET /api/health/detailed       # All services health status
GET /api/health/services/:service  # Specific service health
GET /api/health/version        # Version and build information
GET /api/health/ready          # Readiness probe (K8s compatible)
GET /api/health/live           # Liveness probe (K8s compatible)
```

**Detailed Health Response:**
```json
{
  "success": true,
  "message": "System health check completed",
  "data": {
    "overall": "healthy",
    "services": {
      "database": { 
        "status": "connected", 
        "responseTime": 5,
        "connections": 3 
      },
      "redis": { 
        "status": "connected", 
        "responseTime": 2,
        "memory": "2.1MB" 
      },
      "typesense": { 
        "status": "connected", 
        "responseTime": 15,
        "collections": 3 
      },
      "firebase": { 
        "status": "connected", 
        "responseTime": 45,
        "projects": 1 
      }
    },
    "system": {
      "uptime": 3600,
      "memory": "512MB",
      "cpu": "15%",
      "pid": 12345
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### **📡 Real-time Communication Routes**
```bash
GET /api/sse                   # Server-sent events connection
GET /api/sse/subscribe/:channel # Subscribe to specific channel
```

#### **🧪 Development & Testing Routes** (Development Only)
```bash
GET /api/test/reset            # Reset test environment
POST /api/test/seed            # Seed test data
GET /api/test/cleanup          # Cleanup test artifacts
```

### **Service Management Routes (`framework/routes/services.js`)**

Mounted under `/api/admin` for administrative access:

#### **🔧 Service Administration**
```bash
GET /api/admin/services        # List all services and status
GET /api/admin/services/:name  # Get specific service details
GET /api/admin/services/dependencies  # Service dependency tree
GET /api/admin/services/help/configuration  # Configuration help
```

**Service List Response:**
```json
{
  "success": true,
  "data": {
    "services": {
      "database": {
        "enabled": true,
        "required": true,
        "status": "connected",
        "configured": true
      },
      "redis": {
        "enabled": true,
        "required": true,
        "status": "connected",
        "configured": true
      },
      "typesense": {
        "enabled": false,
        "required": false,
        "status": "disabled",
        "configured": false
      },
      "firebase": {
        "enabled": true,
        "required": false,
        "status": "connected",
        "configured": true
      }
    },
    "summary": {
      "total": 9,
      "enabled": 4,
      "connected": 3,
      "required": 2
    }
  }
}
```

---

## 🎯 **Application Routes (`routes/api.js`)**

These routes contain your business logic and can be customized for your application:

### **👥 User Management Routes**

#### **🔓 Public Routes (No Authentication)**
```bash
POST /api/auth/register        # User registration
POST /api/auth/login          # User login
```

**Registration Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

#### **🔒 Protected Routes (Authentication Required)**
```bash
POST /api/auth/logout         # User logout
POST /api/auth/refresh        # Refresh JWT token
POST /api/auth/change-password # Change user password

GET /api/users/profile        # Get current user profile
PUT /api/users/profile        # Update current user profile
GET /api/users/:id/sessions   # Get user sessions
DELETE /api/users/:id/sessions # Revoke user sessions
```

#### **👑 Admin Routes (Admin Role Required)**
```bash
GET /api/users                # List all users
GET /api/users/:id            # Get user details
PUT /api/users/:id            # Update user
DELETE /api/users/:id         # Delete user
POST /api/users/:id/activate  # Activate user
POST /api/users/:id/deactivate # Deactivate user
```

**User List Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "active": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

## 🔧 **Route Implementation Patterns**

### **Framework Route Pattern**

Framework routes use consistent patterns for system-level concerns:

```javascript
// framework/routes/kernel.js
const express = require('express');
const router = express.Router();
const Response = require('../helpers/Response');
const { healthAuth } = require('../../app/Http/Middleware');

// Health check with optional authentication
router.get('/api/health/detailed', healthAuth, async (req, res) => {
  try {
    const healthData = await getSystemHealth();
    return Response.success(res, healthData, 'System health check completed');
  } catch (error) {
    return Response.error(res, 'Health check failed', error.message, 503);
  }
});

module.exports = router;
```

### **Application Route Pattern**

Application routes focus on business logic with proper middleware chains:

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();
const UserController = require('../app/Http/Controllers/UserController');
const { 
  authenticate, 
  optionalAuth, 
  requireRole, 
  adminOnly,
  userRateLimit 
} = require('../app/Http/Middleware');
const { middlewares: validate } = require('../app/Http/Middleware/Validation');

// Public routes
router.post('/auth/register', validate.userRegistration, UserController.register);
router.post('/auth/login', validate.userLogin, UserController.login);

// Protected routes
router.post('/auth/logout', authenticate, UserController.logout);
router.post('/auth/refresh', authenticate, UserController.refreshToken);

// Profile routes
router.get('/users/profile', authenticate, UserController.getProfile);
router.put('/users/profile', authenticate, validate.profileUpdate, UserController.updateProfile);

// Admin routes
router.get('/users', authenticate, adminOnly, UserController.index);
router.get('/users/:id', authenticate, adminOnly, UserController.show);
router.put('/users/:id', authenticate, adminOnly, validate.userUpdate, UserController.update);
router.delete('/users/:id', authenticate, adminOnly, UserController.destroy);

module.exports = router;
```

---

## 🔐 **Middleware Integration**

### **Authentication Middleware Chain**

Routes use middleware chains for proper request processing:

```javascript
// Example: Admin-only route with validation
router.put('/users/:id', 
  authenticate,           // Verify JWT token
  adminOnly,             // Check admin role
  validate.userUpdate,   // Validate request data
  UserController.update  // Business logic
);

// Example: Optional authentication
router.get('/users/:id',
  optionalAuth,          // Optional JWT verification
  UserController.show    // Public or enhanced private view
);

// Example: Rate limited public route
router.post('/auth/login',
  userRateLimit,         // Rate limiting
  validate.userLogin,    // Input validation
  UserController.login   // Authentication logic
);
```

### **Middleware Types**

1. **Framework Middleware** (`framework/middleware/`):
   - Core authentication (`Auth.js`)
   - Error handling (`ErrorHandler.js`)
   - Session management (`Session.js`)

2. **Application Middleware** (`app/Http/Middleware/`):
   - Role-based access control
   - Business-specific validation
   - Application rate limiting

---

## 🎯 **Route Configuration**

### **Route Mounting in Bootstrap**

Routes are mounted in the application bootstrap:

```javascript
// bootstrap/app.js
const kernelRoutes = require('../framework/routes/kernel');
const apiRoutes = require('../routes/api');

class Application extends CoreApplication {
  setupRoutes() {
    // Framework routes (health, admin, SSE)
    this.app.use('/', kernelRoutes);
    
    // Application routes (business logic)
    this.app.use('/api', apiRoutes);
    
    // Root route handler
    this.app.get('/', (req, res) => {
      Response.success(res, {
        name: config.name,
        version: config.version,
        environment: config.environment,
        framework: 'SEBF',
        documentation: '/api'
      }, 'Welcome to Sports Excitement Backend Framework');
    });
  }
}
```

### **Dynamic Route Loading**

Routes can be conditionally loaded based on service availability:

```javascript
// Conditional SSE routes
if (servicesConfig.sse.enabled) {
  router.get('/api/sse', SSEController.connect);
  router.get('/api/sse/subscribe/:channel', SSEController.subscribe);
}

// Development-only routes
if (process.env.NODE_ENV === 'development') {
  router.get('/api/test/reset', TestController.reset);
  router.post('/api/test/seed', TestController.seed);
}
```

---

## 📊 **Route Testing**

### **Framework Route Testing**

```javascript
// tests/Feature/HealthCheck.test.js
describe('Health Check Routes', () => {
  test('GET /api/health should return basic health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('uptime');
  });

  test('GET /api/health/detailed should require authentication', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
```

### **Application Route Testing**

```javascript
// tests/Feature/UserApi.test.js
describe('User API Routes', () => {
  test('POST /api/auth/register should create new user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('token');
  });

  test('GET /api/users should require admin role', async () => {
    const userToken = await getUserToken('user');
    
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('admin');
  });
});
```

---

## 🚀 **Route Performance**

### **Caching Strategies**

```javascript
// Cache headers for static routes
router.get('/api/health/version', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  next();
}, VersionController.getVersion);

// No cache for dynamic routes
router.get('/api/users/profile', authenticate, (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
}, UserController.getProfile);
```

### **Route Optimization**

```javascript
// Efficient parameter validation
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) {
    return Response.badRequest(res, 'Invalid ID format');
  }
  req.params.id = parseInt(id);
  next();
});

// Middleware ordering for performance
router.use('/api/admin', [
  authenticate,     // Fast JWT check first
  adminOnly,       // Role check second
  rateLimit,       // Rate limiting last
]);
```

---

## 🛡️ **Route Security**

### **Security Middleware**

```javascript
// Security headers
router.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
});

// CORS configuration
router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

### **Input Validation**

```javascript
// Comprehensive request validation
const validate = {
  userRegistration: [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Za-z])(?=.*\d)/),
    body('firstName').trim().isLength({ min: 1, max: 50 }),
    body('lastName').trim().isLength({ min: 1, max: 50 }),
    validationErrorHandler
  ],
  
  userLogin: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validationErrorHandler
  ]
};
```

---

## 📚 **Route Documentation**

### **API Documentation Generation**

The framework provides automatic API documentation:

```javascript
// GET /api returns comprehensive API documentation
{
  "endpoints": {
    "authentication": [
      { "method": "POST", "path": "/api/auth/register", "description": "User registration" },
      { "method": "POST", "path": "/api/auth/login", "description": "User login" }
    ],
    "users": [
      { "method": "GET", "path": "/api/users", "description": "List users", "auth": "admin" },
      { "method": "GET", "path": "/api/users/profile", "description": "Get profile", "auth": "required" }
    ],
    "health": [
      { "method": "GET", "path": "/api/health", "description": "Basic health check" },
      { "method": "GET", "path": "/api/health/detailed", "description": "Detailed health", "auth": "api-key" }
    ]
  }
}
```

### **Route Listing Command**

```bash
# List all routes
npm run control routes

# Output:
# Framework Routes:
#   GET    /                    (API Information)
#   GET    /api                 (API Documentation)
#   GET    /api/health          (Health Check)
#   GET    /api/health/detailed (Detailed Health)
#   GET    /api/sse             (Server-Sent Events)
# 
# Application Routes:
#   POST   /api/auth/register   (User Registration)
#   POST   /api/auth/login      (User Login)
#   GET    /api/users           (List Users - Admin)
#   GET    /api/users/profile   (User Profile)
```

---

## 🎯 **Best Practices**

### **Route Organization**

1. **Separation of Concerns** - Framework routes vs application routes
2. **RESTful Design** - Follow REST conventions for resource routes
3. **Consistent Naming** - Use clear, predictable route naming
4. **Middleware Chains** - Apply middleware in logical order
5. **Error Handling** - Consistent error responses across all routes

### **Performance Guidelines**

1. **Efficient Middleware** - Order middleware by execution speed
2. **Parameter Validation** - Validate early to fail fast
3. **Caching Strategy** - Cache static responses appropriately
4. **Rate Limiting** - Protect against abuse and overload

### **Security Best Practices**

1. **Authentication First** - Verify identity before authorization
2. **Input Validation** - Validate and sanitize all inputs
3. **Error Disclosure** - Don't expose internal system details
4. **Security Headers** - Apply appropriate security headers

The routing system provides a clean, scalable foundation for building robust APIs while maintaining clear separation between framework infrastructure and application business logic.