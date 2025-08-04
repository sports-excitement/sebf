const jwt = require('jsonwebtoken');
const Response = require('../helpers/Response');
const JWTSessionService = require('../services/JWTSessionService');

/**
 * Framework Authentication Middleware
 * 
 * Handles core authentication functionality:
 * - JWT token verification
 * - Health check API key validation
 * - Token extraction utilities
 * - Basic authentication flows
 */
class FrameworkAuthMiddleware {
  constructor() {
    this.config = require('../config/services').auth;
  }

  /**
   * Main authentication middleware - requires authentication
   */
  async authenticate(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json(
          Response.error('Authentication token required', 401)
        );
      }

      // Verify JWT token with session validation
      const verification = await JWTSessionService.verifyToken(token, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      if (!verification.valid) {
        return res.status(401).json(
          Response.error(verification.error || 'Authentication failed', 401)
        );
      }

      req.user = verification.payload;
      req.session = verification.session;
      req.authenticated = true;
      req.jwtToken = token;

      next();
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * Optional authentication middleware - sets user info if available
   */
  async optional(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        req.user = null;
        req.authenticated = false;
        return next();
      }

      // Verify JWT token with session validation
      const verification = await JWTSessionService.verifyToken(token, {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      });

      if (verification.valid) {
        req.user = verification.payload;
        req.session = verification.session;
        req.authenticated = true;
        req.jwtToken = token;
      } else {
        req.user = null;
        req.authenticated = false;
      }

      next();
    } catch (error) {
      // In optional auth, we don't fail on errors
      req.user = null;
      req.authenticated = false;
      next();
    }
  }

  /**
   * Health check authentication middleware
   * Supports both API keys and JWT tokens
   */
  async healthCheck(req, res, next) {
    try {
      // First check for health check API key
      const apiKey = this.extractHealthCheckApiKey(req);
      if (apiKey && this.validateHealthCheckApiKey(apiKey)) {
        req.user = { type: 'health_check', authenticated: true };
        req.authenticated = true;
        return next();
      }

      // Check for regular JWT token
      const token = this.extractToken(req);
      if (token) {
        try {
          const verification = await JWTSessionService.verifyToken(token);
          if (verification.valid) {
            req.user = verification.payload;
            req.session = verification.session;
            req.authenticated = true;
            req.jwtToken = token;
            return next();
          }
        } catch (error) {
          // JWT failed, but continue for public health checks
        }
      }

      // Allow public access to basic health checks
      req.user = null;
      req.authenticated = false;
      next();
    } catch (error) {
      // Allow public access even if there's an error
      req.user = null;
      req.authenticated = false;
      next();
    }
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check query parameter (for SSE connections)
    if (req.query.token) {
      return req.query.token;
    }

    // Check cookie (if using cookie-based auth)
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    return null;
  }

  /**
   * Extract health check API key from request
   */
  extractHealthCheckApiKey(req) {
    // Check X-Health-API-Key header
    if (req.headers['x-health-api-key']) {
      return req.headers['x-health-api-key'];
    }

    // Check query parameter
    if (req.query.apiKey) {
      return req.query.apiKey;
    }

    return null;
  }

  /**
   * Validate health check API key
   */
  validateHealthCheckApiKey(apiKey) {
    const expectedKey = process.env.HEALTH_CHECK_API_KEY;
    return expectedKey && apiKey === expectedKey;
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error, res) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        Response.error('Token has expired', 401, { code: 'TOKEN_EXPIRED' })
      );
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        Response.error('Invalid token', 401, { code: 'INVALID_TOKEN' })
      );
    }

    if (error.name === 'NotBeforeError') {
      return res.status(401).json(
        Response.error('Token not active yet', 401, { code: 'TOKEN_NOT_ACTIVE' })
      );
    }

    // Generic authentication error
    return res.status(401).json(
      Response.error('Authentication failed', 401, { code: 'AUTH_FAILED' })
    );
  }

  /**
   * Get current user information (helper method)
   */
  getCurrentUser(req) {
    return req.user || null;
  }

  /**
   * Check if request is authenticated (helper method)
   */
  isAuthenticated(req) {
    return req.authenticated === true;
  }
}

// Create singleton instance
const frameworkAuthMiddleware = new FrameworkAuthMiddleware();

// Export core authentication middleware functions
module.exports = {
  // Core authentication middleware
  authenticate: frameworkAuthMiddleware.authenticate.bind(frameworkAuthMiddleware),
  optional: frameworkAuthMiddleware.optional.bind(frameworkAuthMiddleware),
  healthAuth: frameworkAuthMiddleware.healthCheck.bind(frameworkAuthMiddleware),
  
  // Helper functions
  getCurrentUser: frameworkAuthMiddleware.getCurrentUser.bind(frameworkAuthMiddleware),
  isAuthenticated: frameworkAuthMiddleware.isAuthenticated.bind(frameworkAuthMiddleware),
  
  // Utility functions (for use by application auth)
  extractToken: frameworkAuthMiddleware.extractToken.bind(frameworkAuthMiddleware),
  extractHealthCheckApiKey: frameworkAuthMiddleware.extractHealthCheckApiKey.bind(frameworkAuthMiddleware),
  validateHealthCheckApiKey: frameworkAuthMiddleware.validateHealthCheckApiKey.bind(frameworkAuthMiddleware),
  handleAuthError: frameworkAuthMiddleware.handleAuthError.bind(frameworkAuthMiddleware),
  
  // Service instance (for extension by application)
  frameworkAuthService: frameworkAuthMiddleware
};