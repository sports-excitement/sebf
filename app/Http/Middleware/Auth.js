const Response = require('../../../framework/helpers/Response');
const FrameworkAuth = require('../../../framework/middleware/Auth');

/**
 * Application Authentication Middleware
 * 
 * Extends framework authentication with business logic:
 * - Role-based access control
 * - Permission-based authentication
 * - Application-specific auth flows
 */
class ApplicationAuthMiddleware {
  constructor() {
    // Inherit framework auth functionality
    this.frameworkAuth = FrameworkAuth.frameworkAuthService;
  }

  /**
   * Role-based authentication middleware
   */
  requireRole(roles) {
    if (typeof roles === 'string') {
      roles = [roles];
    }

    return (req, res, next) => {
      // First ensure user is authenticated
      if (!req.user || !req.authenticated) {
        return res.status(401).json(
          Response.error('Authentication required', 401)
        );
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        return res.status(403).json(
          Response.error('Insufficient permissions', 403)
        );
      }

      next();
    };
  }

  /**
   * Permission-based authentication middleware
   */
  requirePermission(permission) {
    return (req, res, next) => {
      // First ensure user is authenticated
      if (!req.user || !req.authenticated) {
        return res.status(401).json(
          Response.error('Authentication required', 401)
        );
      }

      // Check if user has required permission
      // Note: This assumes permissions are stored in user.permissions array
      if (!req.user.permissions || !req.user.permissions.includes(permission)) {
        return res.status(403).json(
          Response.error('Insufficient permissions', 403)
        );
      }

      next();
    };
  }

  /**
   * Admin-only access middleware
   */
  adminOnly(req, res, next) {
    if (!req.user || !req.authenticated) {
      return res.status(401).json(
        Response.error('Authentication required', 401)
      );
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      return res.status(403).json(
        Response.error('Admin access required', 403)
      );
    }

    next();
  }

  /**
   * Verified users only middleware
   */
  verifiedOnly(req, res, next) {
    if (!req.user || !req.authenticated) {
      return res.status(401).json(
        Response.error('Authentication required', 401)
      );
    }

    if (!req.user.isActive || req.user.status !== 'ACTIVE') {
      return res.status(403).json(
        Response.error('Account verification required', 403)
      );
    }

    next();
  }

  /**
   * User-specific rate limiting middleware (placeholder)
   */
  userRateLimit(req, res, next) {
    // TODO: Implement user-specific rate limiting logic
    // This could check user tier, subscription level, etc.
    next();
  }

  /**
   * Combined role and permission check
   */
  requireRoleOrPermission(roles, permissions) {
    if (typeof roles === 'string') roles = [roles];
    if (typeof permissions === 'string') permissions = [permissions];

    return (req, res, next) => {
      if (!req.user || !req.authenticated) {
        return res.status(401).json(
          Response.error('Authentication required', 401)
        );
      }

      // Check roles
      const hasRole = roles.some(role => req.user.role === role);
      
      // Check permissions
      const hasPermission = permissions.some(permission => 
        req.user.permissions && req.user.permissions.includes(permission)
      );

      if (!hasRole && !hasPermission) {
        return res.status(403).json(
          Response.error('Insufficient permissions', 403)
        );
      }

      next();
    };
  }

  /**
   * Owner or admin access (for resource-specific access)
   */
  ownerOrAdmin(getResourceOwnerId) {
    return async (req, res, next) => {
      if (!req.user || !req.authenticated) {
        return res.status(401).json(
          Response.error('Authentication required', 401)
        );
      }

      // Admin users have access to everything
      if (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN') {
        return next();
      }

      try {
        // Get the resource owner ID (function provided by caller)
        const ownerId = await getResourceOwnerId(req);
        
        if (req.user.id === ownerId) {
          return next();
        }

        return res.status(403).json(
          Response.error('Access denied', 403)
        );
      } catch (error) {
        return res.status(500).json(
          Response.error('Authorization check failed', 500)
        );
      }
    };
  }
}

// Create singleton instance
const appAuthMiddleware = new ApplicationAuthMiddleware();

// Export application-specific auth middleware and framework auth functions
module.exports = {
  // Framework auth functions (delegated)
  auth: FrameworkAuth.authenticate,
  authenticate: FrameworkAuth.authenticate,
  optionalAuth: FrameworkAuth.optional,
  healthAuth: FrameworkAuth.healthAuth,
  
  // Application-specific auth functions
  requireRole: appAuthMiddleware.requireRole.bind(appAuthMiddleware),
  requirePermission: appAuthMiddleware.requirePermission.bind(appAuthMiddleware),
  adminOnly: appAuthMiddleware.adminOnly.bind(appAuthMiddleware),
  verifiedOnly: appAuthMiddleware.verifiedOnly.bind(appAuthMiddleware),
  userRateLimit: appAuthMiddleware.userRateLimit.bind(appAuthMiddleware),
  requireRoleOrPermission: appAuthMiddleware.requireRoleOrPermission.bind(appAuthMiddleware),
  ownerOrAdmin: appAuthMiddleware.ownerOrAdmin.bind(appAuthMiddleware),
  
  // Helper functions (from framework)
  getCurrentUser: FrameworkAuth.getCurrentUser,
  isAuthenticated: FrameworkAuth.isAuthenticated,
  
  // Service instances
  authService: appAuthMiddleware,
  authMiddleware: appAuthMiddleware
};