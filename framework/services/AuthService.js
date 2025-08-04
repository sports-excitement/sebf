const jwt = require('jsonwebtoken');
const Response = require('../helpers/Response');
const Logger = require('../helpers/Logger');

/**
 * Core Authentication Service
 * 
 * Provides the foundation for all authentication functionality.
 * This service handles the core auth logic that the framework provides,
 * while allowing applications to extend and customize behavior.
 */
class AuthService {
  constructor(config = {}) {
    this.config = {
      jwt: config.jwt || require('../config/services').jwt,
      session: config.session || require('../config/services').session,
      ...config
    };
    
    this.tokenBlacklist = new Set();
    this.sessionStore = new Map();
    this.rateLimitStore = new Map();
    this.customValidators = new Map();
    this.authProviders = new Map();
    
    // Default auth provider (JWT)
    this.registerAuthProvider('jwt', this.validateJWTToken.bind(this));
  }

  /**
   * Register custom auth provider
   * @param {string} name - Provider name
   * @param {Function} validator - Validation function
   */
  registerAuthProvider(name, validator) {
    this.authProviders.set(name, validator);
    Logger.info(`🔐 Registered auth provider: ${name}`);
  }

  /**
   * Register custom token validator
   * @param {string} name - Validator name
   * @param {Function} validator - Validation function
   */
  registerCustomValidator(name, validator) {
    this.customValidators.set(name, validator);
    Logger.info(`🔐 Registered custom validator: ${name}`);
  }

  /**
   * Extract token from request (multiple sources)
   * @param {Object} req - Express request object
   * @returns {Object} Token info with source
   */
  extractToken(req) {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return {
        token: authHeader.substring(7),
        source: 'header',
        type: 'bearer'
      };
    }

    // Check query parameter (for SSE connections, webhooks)
    if (req.query.token) {
      return {
        token: req.query.token,
        source: 'query',
        type: 'query'
      };
    }

    // Check cookies (for web sessions)
    if (req.cookies && req.cookies.token) {
      return {
        token: req.cookies.token,
        source: 'cookie',
        type: 'cookie'
      };
    }

    // Check custom headers
    const customTokenHeader = req.headers['x-auth-token'];
    if (customTokenHeader) {
      return {
        token: customTokenHeader,
        source: 'custom-header',
        type: 'custom'
      };
    }

    return null;
  }

  /**
   * Extract API key from request
   * @param {Object} req - Express request object
   * @returns {Object} API key info
   */
  extractApiKey(req) {
    // Check specific API key headers
    const apiKeyHeaders = [
      'x-api-key',
      'x-health-api-key',
      'x-webhook-signature',
      'x-service-key'
    ];

    for (const header of apiKeyHeaders) {
      if (req.headers[header]) {
        return {
          key: req.headers[header],
          source: 'header',
          type: header.replace('x-', '').replace('-', '_')
        };
      }
    }

    // Check query parameters
    if (req.query.apiKey) {
      return {
        key: req.query.apiKey,
        source: 'query',
        type: 'api_key'
      };
    }

    return null;
  }

  /**
   * Validate JWT token with enhanced security
   * @param {string} token - JWT token
   * @param {Object} context - Request context
   * @returns {Object} Validation result
   */
  async validateJWTToken(token, context = {}) {
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        return {
          valid: false,
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        algorithms: [this.config.jwt.algorithm]
      });

      // Additional security checks
      const securityCheck = await this.performSecurityChecks(decoded, context, token);
      if (!securityCheck.valid) {
        return securityCheck;
      }

      return {
        valid: true,
        payload: decoded,
        token: token,
        session: securityCheck.session
      };

    } catch (error) {
      return {
        valid: false,
        error: this.getJWTErrorMessage(error),
        code: error.name || 'TOKEN_INVALID'
      };
    }
  }

  /**
   * Perform additional security checks
   * @param {Object} payload - Decoded JWT payload
   * @param {Object} context - Request context
   * @param {string} token - Original token
   * @returns {Object} Security check result
   */
  async performSecurityChecks(payload, context, token) {
    try {
      // Check token expiration with grace period
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return {
          valid: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        };
      }

      // Check if user is still active (if userId provided)
      if (payload.userId && this.shouldCheckUserStatus()) {
        const userStatus = await this.checkUserStatus(payload.userId);
        if (!userStatus.active) {
          return {
            valid: false,
            error: 'User account is no longer active',
            code: 'USER_INACTIVE'
          };
        }
      }

      // IP-based validation (if enabled)
      if (this.config.enforceIPValidation && payload.ip && context.ip) {
        if (payload.ip !== context.ip) {
          Logger.warn(`IP mismatch for user ${payload.userId}: ${payload.ip} vs ${context.ip}`);
          return {
            valid: false,
            error: 'IP address validation failed',
            code: 'IP_MISMATCH'
          };
        }
      }

      // User-Agent validation (if enabled)
      if (this.config.enforceUserAgentValidation && payload.userAgent && context.userAgent) {
        if (payload.userAgent !== context.userAgent) {
          Logger.warn(`User-Agent mismatch for user ${payload.userId}`);
          // This is a warning, not a failure (browsers can change UA)
        }
      }

      // Rate limiting check
      const rateLimitCheck = this.checkRateLimit(payload.userId || 'anonymous', context.ip);
      if (!rateLimitCheck.allowed) {
        return {
          valid: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        };
      }

      // Session validation (if session-based auth is enabled)
      let session = null;
      if (payload.sessionId) {
        session = await this.validateSession(payload.sessionId, payload.userId);
        if (!session.valid) {
          return {
            valid: false,
            error: 'Session is invalid or expired',
            code: 'SESSION_INVALID'
          };
        }
      }

      return {
        valid: true,
        session: session?.data
      };

    } catch (error) {
      Logger.error('Security check failed:', error);
      return {
        valid: false,
        error: 'Security validation failed',
        code: 'SECURITY_CHECK_FAILED'
      };
    }
  }

  /**
   * Check user status (to be overridden by application)
   * @param {string|number} userId - User ID
   * @returns {Object} User status
   */
  async checkUserStatus(userId) {
    // Default implementation - can be overridden by application
    return { active: true };
  }

  /**
   * Validate session
   * @param {string} sessionId - Session ID
   * @param {string|number} userId - User ID
   * @returns {Object} Session validation result
   */
  async validateSession(sessionId, userId) {
    try {
      const session = this.sessionStore.get(sessionId);
      
      if (!session) {
        return {
          valid: false,
          error: 'Session not found'
        };
      }

      // Check session expiration
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.sessionStore.delete(sessionId);
        return {
          valid: false,
          error: 'Session expired'
        };
      }

      // Check user ID match
      if (session.userId !== userId) {
        return {
          valid: false,
          error: 'Session user mismatch'
        };
      }

      // Update last activity
      session.lastActivity = Date.now();
      
      return {
        valid: true,
        data: session
      };

    } catch (error) {
      Logger.error('Session validation failed:', error);
      return {
        valid: false,
        error: 'Session validation error'
      };
    }
  }

  /**
   * Check rate limiting
   * @param {string} identifier - User ID or IP
   * @param {string} ip - IP address
   * @returns {Object} Rate limit result
   */
  checkRateLimit(identifier, ip) {
    const key = `${identifier}:${ip}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // 100 requests per minute

    if (!this.rateLimitStore.has(key)) {
      this.rateLimitStore.set(key, {
        count: 1,
        windowStart: now
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const rateLimit = this.rateLimitStore.get(key);

    // Reset window if expired
    if (now - rateLimit.windowStart > windowMs) {
      rateLimit.count = 1;
      rateLimit.windowStart = now;
      return { allowed: true, remaining: maxRequests - 1 };
    }

    // Check if limit exceeded
    if (rateLimit.count >= maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: rateLimit.windowStart + windowMs 
      };
    }

    // Increment counter
    rateLimit.count++;
    return { 
      allowed: true, 
      remaining: maxRequests - rateLimit.count 
    };
  }

  /**
   * Blacklist a token
   * @param {string} token - Token to blacklist
   */
  blacklistToken(token) {
    this.tokenBlacklist.add(token);
    
    // Clean up old tokens periodically
    if (this.tokenBlacklist.size > 10000) {
      this.cleanupBlacklist();
    }
  }

  /**
   * Clean up old blacklisted tokens
   */
  cleanupBlacklist() {
    // In a real implementation, you'd decode tokens to check expiration
    // For now, we'll just limit the size
    if (this.tokenBlacklist.size > 10000) {
      const tokens = Array.from(this.tokenBlacklist);
      this.tokenBlacklist.clear();
      
      // Keep only the last 5000 tokens
      tokens.slice(-5000).forEach(token => {
        this.tokenBlacklist.add(token);
      });
    }
  }

  /**
   * Get human-readable JWT error message
   * @param {Error} error - JWT error
   * @returns {string} Error message
   */
  getJWTErrorMessage(error) {
    switch (error.name) {
      case 'TokenExpiredError':
        return 'Authentication token has expired';
      case 'JsonWebTokenError':
        return 'Invalid authentication token';
      case 'NotBeforeError':
        return 'Authentication token not active yet';
      default:
        return 'Authentication token validation failed';
    }
  }

  /**
   * Should check user status (configurable)
   * @returns {boolean}
   */
  shouldCheckUserStatus() {
    return this.config.checkUserStatus !== false;
  }

  /**
   * Create authentication middleware
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createAuthMiddleware(options = {}) {
    return async (req, res, next) => {
      try {
        const { required = true, providers = ['jwt'], customCheck } = options;
        
        const tokenInfo = this.extractToken(req);
        
        if (!tokenInfo) {
          if (required) {
            return Response.unauthorized(res, 'Authentication token required');
          } else {
            req.user = null;
            req.authenticated = false;
            return next();
          }
        }

        // Try each provider until one succeeds
        let authResult = null;
        for (const providerName of providers) {
          const provider = this.authProviders.get(providerName);
          if (provider) {
            authResult = await provider(tokenInfo.token, {
              ip: req.ip,
              userAgent: req.get('User-Agent')
            });
            
            if (authResult.valid) {
              break;
            }
          }
        }

        if (!authResult || !authResult.valid) {
          if (required) {
            return Response.unauthorized(res, authResult?.error || 'Authentication failed');
          } else {
            req.user = null;
            req.authenticated = false;
            return next();
          }
        }

        // Custom additional checks
        if (customCheck && typeof customCheck === 'function') {
          const customResult = await customCheck(authResult.payload, req);
          if (!customResult.valid) {
            return Response.unauthorized(res, customResult.error || 'Authorization failed');
          }
        }

        // Set request properties
        req.user = authResult.payload;
        req.session = authResult.session;
        req.authenticated = true;
        req.authToken = tokenInfo.token;
        req.authSource = tokenInfo.source;

        next();

      } catch (error) {
        Logger.error('Auth middleware error:', error);
        return Response.error(res, 'Authentication system error', null, 500);
      }
    };
  }

  /**
   * Create API key middleware
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createApiKeyMiddleware(options = {}) {
    return (req, res, next) => {
      try {
        const { required = true, validKeys = [], keyType = 'api_key' } = options;
        
        const keyInfo = this.extractApiKey(req);
        
        if (!keyInfo || keyInfo.type !== keyType) {
          if (required) {
            return Response.unauthorized(res, `${keyType.replace('_', ' ')} required`);
          } else {
            req.apiKeyValid = false;
            return next();
          }
        }

        // Validate API key
        const isValid = validKeys.length === 0 || validKeys.includes(keyInfo.key);
        
        if (!isValid) {
          return Response.unauthorized(res, `Invalid ${keyType.replace('_', ' ')}`);
        }

        req.apiKeyValid = true;
        req.apiKeyType = keyInfo.type;
        req.apiKeySource = keyInfo.source;

        next();

      } catch (error) {
        Logger.error('API key middleware error:', error);
        return Response.error(res, 'API key validation error', null, 500);
      }
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.tokenBlacklist.clear();
    this.sessionStore.clear();
    this.rateLimitStore.clear();
    this.customValidators.clear();
    this.authProviders.clear();
  }
}

module.exports = AuthService;