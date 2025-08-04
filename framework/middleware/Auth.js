const Response = require('../helpers/Response');
const AuthService = require('../services/AuthService');
const JWTSessionService = require('../services/JWTSessionService');

/**
 * Framework Authentication Middleware
 * 
 * Provides systematic auth functionality using the AuthService foundation.
 * This middleware handles framework-level authentication patterns while
 * allowing applications to extend with custom logic.
 */
class FrameworkAuthMiddleware {
  constructor() {
    this.config = require('../config/services');
    this.authService = new AuthService({
      jwt: this.config.jwt,
      session: this.config.session,
      checkUserStatus: false, // Framework doesn't check user status by default
      enforceIPValidation: process.env.AUTH_ENFORCE_IP_VALIDATION === 'true',
      enforceUserAgentValidation: process.env.AUTH_ENFORCE_UA_VALIDATION === 'true'
    });
    
    // Register additional auth providers for framework use
    this.setupFrameworkAuthProviders();
  }

  /**
   * Setup framework-specific auth providers
   */
  setupFrameworkAuthProviders() {
    // Register session-based auth provider
    this.authService.registerAuthProvider('session', this.validateSessionToken.bind(this));
    
    // Register health check API key provider
    this.authService.registerAuthProvider('health_api_key', this.validateHealthApiKey.bind(this));
  }

  /**
   * Validate session-based token (integrates with JWTSessionService)
   */
  async validateSessionToken(token, context = {}) {
    try {
      const verification = await JWTSessionService.verifyToken(token, {
        userAgent: context.userAgent,
        ipAddress: context.ip
      });

      if (!verification.valid) {
        return {
          valid: false,
          error: verification.error || 'Session validation failed',
          code: 'SESSION_INVALID'
        };
      }

      return {
        valid: true,
        payload: verification.payload,
        session: verification.session,
        token: token
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        code: 'SESSION_ERROR'
      };
    }
  }

  /**
   * Validate health check API key
   */
  async validateHealthApiKey(key, context = {}) {
    const expectedKey = process.env.HEALTH_CHECK_API_KEY;
    
    if (!expectedKey) {
      return {
        valid: false,
        error: 'Health check API key not configured',
        code: 'API_KEY_NOT_CONFIGURED'
      };
    }

    if (key !== expectedKey) {
      return {
        valid: false,
        error: 'Invalid health check API key',
        code: 'INVALID_API_KEY'
      };
    }

    return {
      valid: true,
      payload: { type: 'health_check', authenticated: true },
      session: null
    };
  }

  /**
   * Main authentication middleware - requires authentication
   */
  async authenticate(req, res, next) {
    const middleware = this.authService.createAuthMiddleware({
      required: true,
      providers: ['session', 'jwt'],
      customCheck: this.performFrameworkSecurityChecks.bind(this)
    });
    
    return middleware(req, res, next);
  }

  /**
   * Optional authentication middleware - sets user info if available
   */
  async optional(req, res, next) {
    const middleware = this.authService.createAuthMiddleware({
      required: false,
      providers: ['session', 'jwt'],
      customCheck: this.performFrameworkSecurityChecks.bind(this)
    });
    
    return middleware(req, res, next);
  }

  /**
   * Perform framework-specific security checks
   */
  async performFrameworkSecurityChecks(payload, req) {
    try {
      // Add any framework-specific security validations here
      // For example, check if user has framework access
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Framework security check failed'
      };
    }
  }

  /**
   * Health check authentication middleware
   * Supports both API keys and JWT tokens
   */
  async healthCheck(req, res, next) {
    try {
      // Try API key authentication first
      const apiKeyMiddleware = this.authService.createApiKeyMiddleware({
        required: false,
        validKeys: process.env.HEALTH_CHECK_API_KEY ? [process.env.HEALTH_CHECK_API_KEY] : [],
        keyType: 'health_api_key'
      });
      
      // Check if API key auth succeeds
      let apiKeyAuth = false;
      await new Promise((resolve) => {
        apiKeyMiddleware(req, res, (error) => {
          if (!error && req.apiKeyValid) {
            apiKeyAuth = true;
            req.user = { type: 'health_check', authenticated: true };
            req.authenticated = true;
          }
          resolve();
        });
      });
      
      if (apiKeyAuth) {
        return next();
      }

      // Try JWT authentication
      const jwtMiddleware = this.authService.createAuthMiddleware({
        required: false,
        providers: ['session', 'jwt']
      });
      
      await new Promise((resolve) => {
        jwtMiddleware(req, res, (error) => {
          resolve();
        });
      });

      // Allow public access if no authentication succeeded
      if (!req.authenticated) {
        req.user = null;
        req.authenticated = false;
      }

      next();
    } catch (error) {
      // Allow public access even if there's an error
      req.user = null;
      req.authenticated = false;
      next();
    }
  }

  /**
   * Extract JWT token from request (delegates to AuthService)
   */
  extractToken(req) {
    const tokenInfo = this.authService.extractToken(req);
    return tokenInfo ? tokenInfo.token : null;
  }

  /**
   * Extract health check API key from request (delegates to AuthService)
   */
  extractHealthCheckApiKey(req) {
    const keyInfo = this.authService.extractApiKey(req);
    return keyInfo && keyInfo.type === 'health_api_key' ? keyInfo.key : null;
  }

  /**
   * Validate health check API key (delegates to AuthService)
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

  /**
   * Get the underlying AuthService instance (for extension by applications)
   */
  getAuthService() {
    return this.authService;
  }

  /**
   * Register custom auth provider (delegation to AuthService)
   */
  registerAuthProvider(name, validator) {
    return this.authService.registerAuthProvider(name, validator);
  }

  /**
   * Register custom validator (delegation to AuthService)
   */
  registerCustomValidator(name, validator) {
    return this.authService.registerCustomValidator(name, validator);
  }

  /**
   * Blacklist a token (delegation to AuthService)
   */
  blacklistToken(token) {
    return this.authService.blacklistToken(token);
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