const express = require('express');
const router = express.Router();

// Import controllers
const UserController = require('../app/Http/Controllers/UserController');

// Import middleware
const { auth, optionalAuth, requireRole } = require('../app/Http/Middleware');
const { validate, schemas } = require('../app/Http/Middleware');

// =============================================================================
// PUBLIC AUTHENTICATION ROUTES (No authentication required)
// =============================================================================

// User Registration
router.post('/auth/register', validate(schemas.userRegistration), UserController.register);

// User Login
router.post('/auth/login', validate(schemas.userLogin), UserController.login);

// Token Refresh
router.post('/auth/refresh', UserController.refreshToken);

// =============================================================================
// PROTECTED AUTHENTICATION ROUTES (Authentication required)
// =============================================================================

// User Logout
router.post('/auth/logout', auth, UserController.logout);

// Change Password
router.post('/auth/change-password', auth, validate(schemas.changePassword), UserController.changePassword);

// =============================================================================
// USER MANAGEMENT ROUTES (Protected)
// =============================================================================

// User CRUD Operations
router.get('/users', auth, UserController.index);
router.get('/users/:id', auth, UserController.show);
router.put('/users/:id', auth, validate(schemas.userUpdate), UserController.update);
router.delete('/users/:id', auth, UserController.destroy);

// =============================================================================
// USER PROFILE ROUTES (Protected)
// =============================================================================

// User Profile Management
router.get('/profile', auth, UserController.getProfile);
router.put('/profile', auth, validate(schemas.profileUpdate), UserController.updateProfile);

// File Upload
router.post('/users/:id/upload', auth, UserController.uploadAvatar);

// =============================================================================
// USER SESSION MANAGEMENT (Protected)
// =============================================================================

// Get User Sessions
router.get('/sessions', auth, UserController.getUserSessions);

// Revoke User Sessions
router.delete('/sessions', auth, UserController.revokeUserSessions);

// User Account Management
router.post('/account/deactivate', auth, UserController.deactivateUser);
router.post('/account/activate', auth, UserController.activateUser);

// =============================================================================
// ADMIN ROUTES (Admin role required)
// =============================================================================

// Admin Dashboard
router.get('/admin/dashboard', auth, requireRole(['ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    // This could be moved to an AdminController in the future
    res.json({
      success: true,
      message: 'Admin dashboard data',
      data: {
        stats: {
          totalUsers: 'Use UserService.getUserCount()',
          activeUsers: 'Use UserService.getActiveUserCount()',
          systemHealth: 'Use health check endpoints at /api/health'
        },
        user: req.user,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get admin dashboard data',
      error: error.message
    });
  }
});

// System Management (Super Admin only)
router.get('/admin/system', auth, requireRole(['SUPERADMIN']), async (req, res) => {
  try {
    const SSEService = require('../app/Services/SSEService');
    
    res.json({
      success: true,
      message: 'System management access granted',
      data: {
        environment: process.env.APP_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: SSEService.getStats(),
        user: req.user,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get system management data',
      error: error.message
    });
  }
});

// =============================================================================
// FUTURE CONTROLLER ROUTES
// =============================================================================

// TODO: Add more controller-based routes here as your application grows
// Examples:
// - Posts/Content management
// - Comments/Interactions  
// - Notifications management
// - Categories/Tags
// - Settings/Preferences
// - Reporting/Analytics

// Example structure for future controllers:
// const PostController = require('../app/Http/Controllers/PostController');
// router.get('/posts', auth, PostController.index);
// router.post('/posts', auth, validate(schemas.postCreate), PostController.create);
// router.get('/posts/:id', optionalAuth, PostController.show);
// router.put('/posts/:id', auth, validate(schemas.postUpdate), PostController.update);
// router.delete('/posts/:id', auth, PostController.destroy);

module.exports = router;