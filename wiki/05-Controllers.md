# Controllers

This document explains the controller architecture and patterns used in the Sports Excitement Backend Framework, focusing on clean HTTP request handling and service orchestration.

---

## 🎯 **Controller Philosophy**

Controllers in SEBF serve as the **HTTP interface layer**, handling incoming requests and coordinating responses. They follow the **"thin controller"** principle, focusing on:

1. **Request Processing** - Parse parameters, headers, and body data
2. **Service Orchestration** - Delegate business logic to service classes
3. **Response Formatting** - Return consistent, well-formatted API responses
4. **Error Handling** - Catch and properly format application errors
5. **Middleware Integration** - Work seamlessly with authentication and validation

### **Controller Responsibilities**

✅ **Controllers SHOULD:**
- Handle HTTP request/response lifecycle
- Validate request parameters and data
- Coordinate between services
- Format consistent API responses
- Handle HTTP-specific errors

❌ **Controllers SHOULD NOT:**
- Contain business logic
- Directly access databases
- Perform complex calculations
- Handle service-specific concerns
- Manage external API integrations

---

## 📁 **Controller Architecture**

### **Location and Structure**

Controllers are located in `app/Http/Controllers/` and follow a consistent pattern:

```javascript
// app/Http/Controllers/ExampleController.js
const ExampleService = require('../../Services/ExampleService');
const Response = require('../../../framework/helpers/Response');

class ExampleController {
  // Standard CRUD methods
  async index(req, res) { /* List resources with pagination */ }
  async store(req, res) { /* Create new resource */ }
  async show(req, res) { /* Get single resource */ }
  async update(req, res) { /* Update existing resource */ }
  async destroy(req, res) { /* Delete resource */ }
  
  // Custom business methods
  async customAction(req, res) { /* Specific business functionality */ }
}

module.exports = new ExampleController();
```

### **Standard Controller Pattern**

```javascript
class ResourceController {
  async methodName(req, res) {
    try {
      // 1. Extract and validate request data
      const { id } = req.params;
      const data = req.body;
      const user = req.user; // From auth middleware
      
      // 2. Call service layer
      const result = await ServiceClass.businessMethod(data, user);
      
      // 3. Format and return response
      return Response.success(res, result, 'Operation successful', 200);
      
    } catch (error) {
      // 4. Handle errors appropriately
      if (error.name === 'ValidationError') {
        return Response.badRequest(res, 'Invalid input data', error.message);
      }
      
      if (error.name === 'NotFoundError') {
        return Response.notFound(res, 'Resource not found');
      }
      
      return Response.error(res, 'Operation failed', error.message, 500);
    }
  }
}
```

---

## 👤 **UserController - Complete Example**

The `UserController` demonstrates comprehensive controller patterns with authentication, validation, and service integration:

### **Authentication Endpoints**

```javascript
// app/Http/Controllers/UserController.js
const UserService = require('../../Services/UserService');
const Response = require('../../../framework/helpers/Response');

class UserController {
  /**
   * POST /api/auth/register - User Registration
   */
  async register(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const result = await UserService.registerUser({
        email,
        password,
        firstName,
        lastName
      });
      
      return Response.success(res, {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn
      }, 'User registered successfully', 201);
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        return Response.conflict(res, 'Email already registered');
      }
      
      return Response.error(res, 'Registration failed', error.message, 500);
    }
  }

  /**
   * POST /api/auth/login - User Login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      const result = await UserService.loginUser(email, password);
      
      if (!result.success) {
        return Response.unauthorized(res, 'Invalid credentials');
      }
      
      return Response.success(res, {
        user: result.user,
        token: result.token,
        sessionId: result.sessionId,
        expiresIn: result.expiresIn
      }, 'Login successful');
      
    } catch (error) {
      return Response.error(res, 'Login failed', error.message, 500);
    }
  }

  /**
   * POST /api/auth/logout - User Logout
   */
  async logout(req, res) {
    try {
      const sessionId = req.sessionId; // From auth middleware
      
      await UserService.logoutUser(sessionId);
      
      return Response.success(res, null, 'Logged out successfully');
      
    } catch (error) {
      return Response.error(res, 'Logout failed', error.message, 500);
    }
  }

  /**
   * POST /api/auth/refresh - Refresh JWT Token
   */
  async refreshToken(req, res) {
    try {
      const currentToken = req.token; // From auth middleware
      
      const result = await UserService.refreshUserToken(currentToken);
      
      return Response.success(res, {
        token: result.newToken,
        sessionId: result.newSessionId,
        expiresIn: result.expiresIn
      }, 'Token refreshed successfully');
      
    } catch (error) {
      return Response.unauthorized(res, 'Token refresh failed');
    }
  }
}
```

### **Profile Management**

```javascript
class UserController {
  /**
   * GET /api/users/profile - Get Current User Profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      
      const user = await UserService.getUserById(userId);
      
      return Response.success(res, user, 'Profile retrieved successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to get profile', error.message, 500);
    }
  }

  /**
   * PUT /api/users/profile - Update Current User Profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;
      
      const updatedUser = await UserService.updateUser(userId, updateData);
      
      return Response.success(res, updatedUser, 'Profile updated successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to update profile', error.message, 500);
    }
  }

  /**
   * POST /api/auth/change-password - Change User Password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      const result = await UserService.changePassword(
        userId, 
        currentPassword, 
        newPassword
      );
      
      if (!result.success) {
        return Response.badRequest(res, result.message);
      }
      
      return Response.success(res, null, 'Password changed successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to change password', error.message, 500);
    }
  }
}
```

### **Administrative Operations**

```javascript
class UserController {
  /**
   * GET /api/users - List All Users (Admin Only)
   */
  async index(req, res) {
    try {
      const { page = 1, limit = 10, search, role, active } = req.query;
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      const filters = {
        search,
        role,
        active: active !== undefined ? active === 'true' : undefined
      };
      
      const result = await UserService.getAllUsers(options, filters);
      
      return Response.success(res, {
        users: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      }, 'Users retrieved successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to retrieve users', error.message, 500);
    }
  }

  /**
   * GET /api/users/:id - Get User Details (Admin Only)
   */
  async show(req, res) {
    try {
      const { id } = req.params;
      
      if (!/^\d+$/.test(id)) {
        return Response.badRequest(res, 'Invalid user ID format');
      }
      
      const user = await UserService.getUserById(parseInt(id));
      
      if (!user) {
        return Response.notFound(res, 'User not found');
      }
      
      return Response.success(res, user, 'User retrieved successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to retrieve user', error.message, 500);
    }
  }

  /**
   * PUT /api/users/:id - Update User (Admin Only)
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedUser = await UserService.updateUser(parseInt(id), updateData);
      
      if (!updatedUser) {
        return Response.notFound(res, 'User not found');
      }
      
      return Response.success(res, updatedUser, 'User updated successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to update user', error.message, 500);
    }
  }

  /**
   * DELETE /api/users/:id - Delete User (Admin Only)
   */
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
      
      // Prevent self-deletion
      if (parseInt(id) === currentUserId) {
        return Response.badRequest(res, 'Cannot delete your own account');
      }
      
      const deleted = await UserService.deleteUser(parseInt(id));
      
      if (!deleted) {
        return Response.notFound(res, 'User not found');
      }
      
      return Response.success(res, null, 'User deleted successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to delete user', error.message, 500);
    }
  }
}
```

### **Session Management**

```javascript
class UserController {
  /**
   * GET /api/users/:id/sessions - Get User Sessions (Admin)
   */
  async getUserSessions(req, res) {
    try {
      const { id } = req.params;
      
      const sessions = await UserService.getUserSessions(parseInt(id));
      
      return Response.success(res, sessions, 'User sessions retrieved successfully');
      
  } catch (error) {
      return Response.error(res, 'Failed to retrieve sessions', error.message, 500);
  }
}

/**
   * DELETE /api/users/:id/sessions - Revoke User Sessions (Admin)
   */
  async revokeUserSessions(req, res) {
    try {
      const { id } = req.params;
      
      await UserService.revokeUserSessions(parseInt(id));
      
      return Response.success(res, null, 'User sessions revoked successfully');
      
  } catch (error) {
      return Response.error(res, 'Failed to revoke sessions', error.message, 500);
  }
}

/**
   * POST /api/users/:id/deactivate - Deactivate User (Admin)
 */
  async deactivateUser(req, res) {
  try {
    const { id } = req.params;
    
      const result = await UserService.deactivateUser(parseInt(id));
      
      return Response.success(res, result, 'User deactivated successfully');
      
    } catch (error) {
      return Response.error(res, 'Failed to deactivate user', error.message, 500);
    }
  }

  /**
   * POST /api/users/:id/activate - Activate User (Admin)
   */
  async activateUser(req, res) {
    try {
      const { id } = req.params;
      
      const result = await UserService.activateUser(parseInt(id));
      
      return Response.success(res, result, 'User activated successfully');
      
  } catch (error) {
      return Response.error(res, 'Failed to activate user', error.message, 500);
    }
  }
}

module.exports = new UserController();
```

---

## 📊 **Response Patterns**

### **Standardized Response Helper**

All controllers use the framework's `Response` helper for consistency:

```javascript
const Response = require('../../../framework/helpers/Response');

// Success responses
Response.success(res, data, message, statusCode = 200)
Response.created(res, data, message = 'Created successfully')

// Error responses
Response.error(res, message, details, statusCode = 500)
Response.badRequest(res, message, details)
Response.unauthorized(res, message = 'Unauthorized')
Response.forbidden(res, message = 'Forbidden')
Response.notFound(res, message = 'Not found')
Response.conflict(res, message = 'Conflict')
Response.unprocessableEntity(res, message, errors)

// File responses
Response.download(res, filePath, filename)
Response.stream(res, stream, contentType)
```

### **Response Examples**

```javascript
// Success with data
return Response.success(res, user, 'User created successfully', 201);
// Output:
{
  "success": true,
  "message": "User created successfully",
  "data": { "id": 1, "email": "user@example.com" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Error response
return Response.badRequest(res, 'Invalid input', { field: 'email', issue: 'required' });
// Output:
{
  "success": false,
  "message": "Invalid input",
  "error": { "field": "email", "issue": "required" },
  "timestamp": "2024-01-15T10:30:00.000Z"
}

// Pagination response
return Response.success(res, {
  users: [...],
  pagination: { page: 1, limit: 10, total: 25, pages: 3 }
}, 'Users retrieved successfully');
```

---

## 🔧 **Controller Patterns**

### **Parameter Validation**

```javascript
async show(req, res) {
  try {
    const { id } = req.params;
    
    // Validate parameter format
    if (!/^\d+$/.test(id)) {
      return Response.badRequest(res, 'Invalid ID format');
    }
    
    const numericId = parseInt(id);
    
    // Validate parameter range
    if (numericId <= 0) {
      return Response.badRequest(res, 'ID must be positive');
    }
    
    const resource = await ResourceService.getById(numericId);
    
    if (!resource) {
      return Response.notFound(res, 'Resource not found');
    }
    
    return Response.success(res, resource, 'Resource retrieved successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to retrieve resource', error.message, 500);
  }
}
```

### **Query Parameter Handling**

```javascript
async index(req, res) {
  try {
    // Extract pagination parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    
    // Extract filter parameters
    const filters = {};
    if (req.query.search) filters.search = req.query.search.trim();
    if (req.query.status) filters.status = req.query.status;
    if (req.query.active !== undefined) filters.active = req.query.active === 'true';
    
    // Extract sort parameters
    const allowedSortFields = ['id', 'name', 'createdAt', 'updatedAt'];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
    
    const options = { page, limit, sortBy, sortOrder };
    
    const result = await ResourceService.getAll(options, filters);
    
    return Response.success(res, {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    }, 'Resources retrieved successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to retrieve resources', error.message, 500);
  }
}
```

### **File Upload Handling**

```javascript
async uploadAvatar(req, res) {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return Response.badRequest(res, 'No file uploaded');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return Response.badRequest(res, 'Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }
    
    // Validate file size (5MB limit)
    if (req.file.size > 5 * 1024 * 1024) {
      return Response.badRequest(res, 'File too large. Maximum size is 5MB.');
    }
    
    const result = await UserService.uploadAvatar(userId, req.file);
    
    return Response.success(res, {
      avatar: result.avatarUrl,
      thumbnail: result.thumbnailUrl
    }, 'Avatar uploaded successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to upload avatar', error.message, 500);
  }
}
```

---

## 🧪 **Controller Testing**

### **Test Structure**

```javascript
// tests/Feature/UserController.test.js
describe('UserController', () => {
  let app;
  let authToken;
  let adminToken;
  
  beforeAll(async () => {
    app = require('../../bootstrap/app');
    
    // Setup test users and tokens
    const user = await UserService.registerUser({
      email: 'user@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    authToken = user.token;
    
    const admin = await UserService.registerUser({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });
    adminToken = admin.token;
  });
  
  describe('POST /api/auth/register', () => {
    test('should create new user with valid data', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    test('should reject duplicate email', async () => {
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
  
  describe('GET /api/users/profile', () => {
    test('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data.email).toBe('user@test.com');
    });
    
    test('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users', () => {
    test('should return users list for admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
    
    test('should reject non-admin user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
```

---

## 🚀 **Performance Optimization**

### **Response Caching**

```javascript
// Cache static responses
async getPublicProfile(req, res) {
  try {
    const { id } = req.params;
    
    // Set cache headers for public profiles
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'ETag': `profile-${id}-${Date.now()}`
    });
    
    const profile = await UserService.getPublicProfile(parseInt(id));
    
    return Response.success(res, profile, 'Profile retrieved successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to retrieve profile', error.message, 500);
  }
}
```

### **Efficient Data Loading**

```javascript
// Load only necessary data
async index(req, res) {
  try {
    const { fields } = req.query;
    
    // Allow field selection to reduce payload
    const allowedFields = ['id', 'email', 'firstName', 'lastName', 'role', 'active'];
    const selectedFields = fields ? 
      fields.split(',').filter(field => allowedFields.includes(field)) : 
      allowedFields;
    
    const result = await UserService.getAllUsers({ 
      fields: selectedFields,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    });
    
    return Response.success(res, result, 'Users retrieved successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to retrieve users', error.message, 500);
  }
}
```

---

## 🔒 **Security Patterns**

### **Authorization Checks**

```javascript
async update(req, res) {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    
    // Only allow users to update their own profile or admins to update any
    if (parseInt(id) !== currentUser.id && currentUser.role !== 'admin') {
      return Response.forbidden(res, 'Not authorized to update this user');
    }
    
    // Prevent role escalation
    if (req.body.role && currentUser.role !== 'admin') {
      return Response.forbidden(res, 'Not authorized to change user role');
    }
    
    const updatedUser = await UserService.updateUser(parseInt(id), req.body);
    
    return Response.success(res, updatedUser, 'User updated successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to update user', error.message, 500);
  }
}
```

### **Input Sanitization**

```javascript
async store(req, res) {
  try {
    // Sanitize input data
    const sanitizedData = {
      email: req.body.email?.toLowerCase().trim(),
      firstName: req.body.firstName?.trim(),
      lastName: req.body.lastName?.trim(),
      role: req.body.role?.toLowerCase() || 'user'
    };
    
    // Validate role
    const allowedRoles = ['user', 'admin', 'moderator'];
    if (!allowedRoles.includes(sanitizedData.role)) {
      return Response.badRequest(res, 'Invalid role specified');
    }
    
    const user = await UserService.createUser(sanitizedData);
    
    return Response.created(res, user, 'User created successfully');
    
  } catch (error) {
    return Response.error(res, 'Failed to create user', error.message, 500);
  }
}
```

---

## 📚 **Best Practices**

### **Controller Guidelines**

1. **Keep Controllers Thin** - Delegate business logic to services
2. **Consistent Error Handling** - Use standardized error responses
3. **Validate Early** - Check parameters and data at the start
4. **Use Type Conversion** - Convert string parameters to appropriate types
5. **Handle Edge Cases** - Account for null, undefined, and invalid data
6. **Security First** - Always validate authorization and sanitize inputs

### **Response Consistency**

1. **Standard Format** - Always use the Response helper
2. **Meaningful Messages** - Provide clear, actionable error messages
3. **Appropriate Status Codes** - Use correct HTTP status codes
4. **Include Metadata** - Add pagination, timestamps, and other metadata
5. **Handle File Responses** - Proper content types and headers for files

### **Performance Considerations**

1. **Efficient Queries** - Only load necessary data
2. **Pagination** - Always paginate large result sets
3. **Caching Headers** - Use appropriate cache headers
4. **Field Selection** - Allow clients to specify required fields
5. **Response Compression** - Enable gzip compression for large responses

The controller layer provides a clean, consistent interface for HTTP communication while maintaining separation of concerns and following REST principles.