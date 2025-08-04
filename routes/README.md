# Application Routes (`/routes`)

This directory contains **your application's business logic routes** - separate from framework system routes.

---

## 🎯 **Route Architecture**

SEBF implements a **dual routing system**:

- **Framework Routes** (`framework/routes/`) - System routes (health, admin, SSE)
- **Application Routes** (`routes/`) - Business logic routes (users, products, orders)

## 📁 **Current Structure**

```
routes/
├── api.js              # 🎯 Your business logic routes
└── README.md          # This documentation
```

## 🎯 **Application Routes (`routes/api.js`)**

Contains **only business logic routes**:

### **Authentication & User Management**
```javascript
// Public authentication routes
POST /api/auth/register        # User registration
POST /api/auth/login          # User login

// Protected authentication routes  
POST /api/auth/logout         # User logout (requires auth)
POST /api/auth/refresh        # Refresh JWT token (requires auth)
POST /api/auth/change-password # Change password (requires auth)

// Profile management
GET  /api/users/profile       # Get current user profile (requires auth)
PUT  /api/users/profile       # Update profile (requires auth)

// Administrative user management
GET    /api/users             # List all users (admin only)
GET    /api/users/:id         # Get user details (admin only)
PUT    /api/users/:id         # Update user (admin only)
DELETE /api/users/:id         # Delete user (admin only)

// Session management
GET    /api/users/:id/sessions    # Get user sessions (admin only)
DELETE /api/users/:id/sessions    # Revoke user sessions (admin only)
POST   /api/users/:id/activate    # Activate user (admin only)
POST   /api/users/:id/deactivate  # Deactivate user (admin only)
```

## 🏗️ **Framework System Routes**

**Note:** These routes are handled by the framework (`framework/routes/kernel.js`) and include:

- `GET /` - API welcome and information
- `GET /api` - API documentation  
- `GET /api/health/*` - All health check endpoints
- `GET /api/sse` - Server-sent events connection
- `GET /api/admin/*` - Service administration endpoints

## 🛤️ **Route Middleware Usage**

Routes use comprehensive middleware chains:

```javascript
// routes/api.js
const {
  authenticate,
  optionalAuth, 
  adminOnly,
  requireRole,
  validate
} = require('../app/Http/Middleware');

// Public routes (no authentication)
router.post('/auth/register', validate.userRegistration, UserController.register);

// Protected routes (authentication required)
router.get('/users/profile', authenticate, UserController.getProfile);

// Admin-only routes
router.get('/users', authenticate, adminOnly, UserController.index);

// Complex middleware chains
router.put('/users/:id',
  authenticate,              // Must be logged in
  adminOnly,                // Must be admin
  validate.userUpdate,      // Validate input data
  UserController.update     // Controller logic
);
```

## 🔧 **Adding New Routes**

### **1. Define Route**
```javascript
// routes/api.js
const ProductController = require('../app/Http/Controllers/ProductController');

// Add your business routes
router.get('/products', ProductController.index);
router.post('/products', authenticate, validate.productCreate, ProductController.store);
router.get('/products/:id', ProductController.show);
router.put('/products/:id', authenticate, adminOnly, ProductController.update);
router.delete('/products/:id', authenticate, adminOnly, ProductController.destroy);
```

### **2. Create Controller**
```javascript
// app/Http/Controllers/ProductController.js
const ProductService = require('../../Services/ProductService');
const Response = require('../../../framework/helpers/Response');

class ProductController {
  async index(req, res) {
    try {
      const products = await ProductService.getAllProducts(req.query);
      return Response.success(res, products, 'Products retrieved successfully');
    } catch (error) {
      return Response.error(res, 'Failed to retrieve products', error.message, 500);
    }
  }
}

module.exports = new ProductController();
```

### **3. Implement Service**
```javascript
// app/Services/ProductService.js
const prismaService = require('../../framework/config/prisma');

class ProductService {
  async getAllProducts(filters = {}) {
    return prismaService.product.findMany({
      where: this.buildWhereClause(filters),
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new ProductService();
```

## 📋 **Route Organization Guidelines**

### **✅ What Belongs in Application Routes**
- User management and authentication
- Business entity CRUD operations (products, orders, etc.)
- Application-specific API endpoints
- Custom business logic endpoints

### **❌ What Belongs in Framework Routes**
- Health checks and system monitoring  
- Service administration
- Framework information endpoints
- Real-time communication (SSE)
- Development and testing utilities

## 🧪 **Testing Routes**

```javascript
// tests/Feature/ProductApi.test.js
const request = require('supertest');
const app = require('../../bootstrap/app');

describe('Product API', () => {
  test('GET /api/products should return products list', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  test('POST /api/products should require authentication', async () => {
    const productData = { name: 'Test Product', price: 99.99 };

    await request(app)
      .post('/api/products')
      .send(productData)
      .expect(401); // Unauthorized without token
  });

  test('POST /api/products should create product with auth', async () => {
    const productData = { name: 'Test Product', price: 99.99 };

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(productData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe(productData.name);
  });
});
```

## 🚀 **Best Practices**

1. **RESTful Design** - Follow REST conventions for resource routes
2. **Consistent Middleware** - Use authentication and validation consistently
3. **Error Handling** - Let controllers handle business errors, framework handles system errors
4. **Response Format** - Always use Response helper for consistent API responses
5. **Business Logic** - Keep routes thin, delegate to services

## 📚 **Route Documentation**

Your routes automatically appear in the API documentation:

- **Live Documentation**: `GET /api` endpoint
- **Health Status**: `GET /api/health` endpoint  
- **Service Admin**: `GET /api/admin/services` endpoint

Focus on building great business logic routes while the framework handles all the infrastructure concerns! 🚀