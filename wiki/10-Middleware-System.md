# Middleware System

This document explains the comprehensive middleware architecture in the Sports Excitement Backend Framework, including the separation between framework and application middleware layers.

---

## 🏗️ **Middleware Architecture**

SEBF implements a **dual-layer middleware system** that provides both framework-level infrastructure and application-specific functionality:

### **Middleware Layers**

1. **Framework Middleware** (`framework/middleware/`) - Core infrastructure concerns
2. **Application Middleware** (`app/Http/Middleware/`) - Business logic and application-specific concerns

### **Middleware Philosophy**

✅ **Separation of Concerns** - Framework handles infrastructure, application handles business logic  
✅ **Composable Design** - Middleware can be combined and reused across routes  
✅ **Performance Focused** - Efficient middleware ordering and execution  
✅ **Security First** - Built-in security best practices and protections  
✅ **Developer Friendly** - Clear interfaces and comprehensive error handling  

---

## 🏗️ **Framework Middleware**

Framework middleware handles core infrastructure concerns and is located in `framework/middleware/`:

### **Core Authentication (`framework/middleware/Auth.js`)**

```javascript
// Framework-level authentication
class CoreAuthMiddleware {
  async authenticate(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return Response.unauthorized(res, 'Authentication required');
      }

      const decoded = await JWTSessionService.verifyToken(token);
      const sessionValid = await JWTSessionService.isSessionValid(decoded.sessionId);
      
      if (!sessionValid) {
        return Response.unauthorized(res, 'Session expired');
      }

      req.user = decoded;
      req.authenticated = true;
      req.sessionId = decoded.sessionId;
      req.token = token;

      next();
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  async optional(req, res, next) {
    // Optional authentication logic
  }

  async healthCheck(req, res, next) {
    // Health check authentication
  }
}
```

### **Global Error Handler (`framework/middleware/ErrorHandler.js`)**

```javascript
class ErrorHandler {
  handle(error, req, res, next) {
    if (res.headersSent) {
      return next(error);
    }

    this.logError(error, req);

    if (this.isPrismaError(error)) {
      return this.handlePrismaError(error, req, res);
    }

    if (this.isJWTError(error)) {
      return this.handleJWTError(error, req, res);
    }

    return this.handleGenericError(error, req, res);
  }
}
```

---

## 🎯 **Application Middleware**

Application middleware handles business logic concerns and is located in `app/Http/Middleware/`:

### **Enhanced Authentication (`app/Http/Middleware/Auth.js`)**

```javascript
class AuthMiddleware {
  constructor() {
    this.frameworkAuth = new FrameworkAuth();
  }

  // Delegate core authentication to framework
  authenticate = (req, res, next) => {
    return this.frameworkAuth.authenticate(req, res, next);
  };

  // Application-specific role checking
  requireRole(roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
      if (!req.authenticated || !req.user) {
        return Response.unauthorized(res, 'Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        return Response.forbidden(res, `Access denied. Required role: ${allowedRoles.join(' or ')}`);
      }
    
    next();
  };
}

  adminOnly = (req, res, next) => {
    return this.requireRole('ADMIN')(req, res, next);
  };
}
```

### **Request Validation (`app/Http/Middleware/Validation.js`)**

```javascript
class ValidationMiddleware {
  userRegistration = [
    this.validateBody(Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required(),
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required()
    }))
  ];

  validateBody(schema) {
  return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        return Response.unprocessableEntity(res, 'Validation failed', {
          errors: validationErrors
        });
      }

      req.body = value;
    next();
  };
}
}
```

---

## 🛤️ **Route-Specific Middleware Usage**

```javascript
// routes/api.js - Middleware usage examples
const {
  authenticate,   
  adminOnly,
  validate
} = require('../app/Http/Middleware');

// Public routes
router.post('/auth/register', validate.userRegistration, UserController.register);

// Protected routes  
router.get('/users/profile', authenticate, UserController.getProfile);

// Admin routes
router.get('/users', authenticate, adminOnly, UserController.index);

// Complex middleware chains
router.put('/users/:id',
  authenticate,              // Must be logged in
  adminOnly,                // Must be admin
  validate.userUpdate,      // Validate input
  UserController.update     // Controller
);
```

---

## 🎛️ **Middleware Integration**

### **Global Middleware Stack**

```javascript
// bootstrap/app.js - Application middleware setup
class Application extends CoreApplication {
  setupMiddleware() {
    // Security first
    this.app.use(helmet());
    this.app.use(cors());
    
    // Request processing
    this.app.use(compression());
    this.app.use(express.json());
    
    // Rate limiting
    this.app.use('/api', rateLimit);
    
    // Session management
    this.app.use(sessionMiddleware);
  }

  setupErrorHandling() {
    // Global error handler (must be last)
    this.app.use(errorHandler.handle.bind(errorHandler));
  }
}
```

---

## 🧪 **Testing Middleware**

```javascript
// tests/Unit/Middleware/Auth.test.js
describe('Authentication Middleware', () => {
  test('should authenticate valid token', async () => {
    const mockUser = { id: 1, email: 'test@example.com', role: 'USER' };
    req.headers.authorization = 'Bearer valid-token';
    
    jest.spyOn(JWTSessionService, 'verifyToken').mockResolvedValue(mockUser);
    jest.spyOn(JWTSessionService, 'isSessionValid').mockResolvedValue(true);

    await authenticate(req, res, next);
    
    expect(req.user).toEqual(mockUser);
    expect(req.authenticated).toBe(true);
    expect(next).toHaveBeenCalled();
  });
});
```

---

## 📚 **Best Practices**

### **Middleware Development Guidelines**

1. **Single Responsibility** - Each middleware should have one clear purpose
2. **Error Handling** - Always handle errors gracefully  
3. **Next() Usage** - Call next() to continue or send response to end chain
4. **Performance Awareness** - Consider performance impact of middleware
5. **Security First** - Validate inputs and implement proper authorization

### **Security Best Practices**

1. **Input Validation** - Validate all inputs before processing
2. **Authentication First** - Verify identity before authorization
3. **Rate Limiting** - Protect against abuse and DoS attacks
4. **Security Headers** - Always include appropriate security headers
5. **Least Privilege** - Grant minimal necessary permissions

The comprehensive middleware system provides a robust, secure, and performant foundation for request processing while maintaining clean separation between framework infrastructure and application business logic.