const Response = require('../../../framework/helpers/Response');
const FrameworkAuth = require('../../../framework/middleware/Auth');
const AuthService = require('../../../framework/services/AuthService');

/**
 * Application Authentication Middleware
 * 
 * Extends framework authentication with business logic:
 * - Role-based access control
 * - Permission-based authentication
 * - Application-specific auth flows
 * - Custom user validation
 */
class ApplicationAuthMiddleware {
  constructor() {
    // Get framework auth service instance
    this.frameworkAuth = FrameworkAuth.frameworkAuthService;
    this.authService = this.frameworkAuth.getAuthService();
    
    // Setup application-specific authentication
    this.setupApplicationAuth();
  }

  /**
   * Setup application-specific authentication providers and validators
   */
  setupApplicationAuth() {
    // Override user status checking to implement business logic
    this.authService.checkUserStatus = this.checkUserStatus.bind(this);
    
    // Register application-specific auth providers
    this.authService.registerAuthProvider('database_user', this.validateDatabaseUser.bind(this));
    
    // Register custom validators for business logic
    this.authService.registerCustomValidator('role_check', this.validateUserRole.bind(this));
    this.authService.registerCustomValidator('permission_check', this.validateUserPermissions.bind(this));
  }

  /**
   * Check user status in database (implements framework interface)
   */
  async checkUserStatus(userId) {
    try {
      // Implement database check for user status
      // This is where you'd check if the user is active, suspended, etc.
      
      // For now, return active - replace with actual database check
      return { active: true };
    } catch (error) {
      return { active: false, error: error.message };
    }
  }

  /**
   * Validate database user (custom auth provider)
   */
  async validateDatabaseUser(token, context = {}) {
    try {
      // Custom logic for database-based user validation
      // This could check user status, roles, etc. from database
      
      // For now, delegate to JWT validation
      return await this.authService.validateJWTToken(token, context);
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: 'DATABASE_USER_VALIDATION_FAILED'
      };
    }
  }

  /**
   * Validate user role (custom validator)
   */
  async validateUserRole(payload, req, options = {}) {
    const { requiredRoles = [] } = options;
    
    if (requiredRoles.length === 0) {
      return { valid: true };
    }

    const userRole = payload.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return {
        valid: false,
        error: 'Insufficient role permissions'
      };
    }

    return { valid: true };
  }

  /**
   * Validate user permissions (custom validator)
   */
  async validateUserPermissions(payload, req, options = {}) {
    const { requiredPermissions = [] } = options;
    
    if (requiredPermissions.length === 0) {
      return { valid: true };
    }

    const userPermissions = payload.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return {
        valid: false,
        error: 'Insufficient permissions'
      };
    }

    return { valid: true };
  }

  /**
   * Role-based authentication middleware
   */
  requireRole(roles) {
    if (typeof roles === 'string') {
      roles = [roles];
    }

    return this.authService.createAuthMiddleware({
      required: true,
      providers: ['database_user', 'session', 'jwt'],
      customCheck: async (payload, req) => {
        return await this.validateUserRole(payload, req, { requiredRoles: roles });
      }
    });
  }

  /**
   * Permission-based authentication middleware
   */
  requirePermission(permission) {
    const permissions = typeof permission === 'string' ? [permission] : permission;

    return this.authService.createAuthMiddleware({
      required: true,
      providers: ['database_user', 'session', 'jwt'],
      customCheck: async (payload, req) => {
        return await this.validateUserPermissions(payload, req, { requiredPermissions: permissions });
      }
    });
  }

  /**
   * Admin-only access middleware
   */
  adminOnly() {
    return this.requireRole(['ADMIN', 'SUPERADMIN']);
  }

  /**
   * Verified users only middleware
   */
  verifiedOnly() {
    return this.authService.createAuthMiddleware({
      required: true,
      providers: ['database_user', 'session', 'jwt'],
      customCheck: async (payload, req) => {
        if (!payload.isActive || payload.status !== 'ACTIVE') {
          return {
            valid: false,
            error: 'Account verification required'
          };
        }
        return { valid: true };
      }
    });
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