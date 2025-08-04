const cors = require('cors');
const Logger = require('../helpers/Logger');

/**
 * CORS (Cross-Origin Resource Sharing) Service
 * 
 * Manages CORS policies and provides flexible cross-origin configuration:
 * - Dynamic origin validation
 * - Method and header restrictions  
 * - Credential handling
 * - Preflight request management
 * - CORS policy templates
 * - Origin monitoring and logging
 */
class CORSService {
  constructor(config = {}) {
    this.config = config;
    this.isEnabled = config.enabled !== false;
    
    // CORS state
    this.allowedOrigins = new Set();
    this.dynamicOrigins = new Map(); // Pattern-based origins
    this.corsMetrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      preflightRequests: 0,
      byOrigin: {},
      byMethod: {},
      startTime: Date.now()
    };
    
    // Default policies
    this.policies = new Map();
    this.setupDefaultPolicies();
    
    // Load configuration
    this.loadConfiguration();
  }

  /**
   * Initialize the CORS service
   */
  async connect() {
    if (!this.isEnabled) {
      Logger.info('CORS service is disabled');
      return { status: 'disabled', message: 'CORS service is disabled in configuration' };
    }

    try {
      Logger.info('✅ CORS service initialized');
      
      return {
        status: 'connected',
        message: 'CORS service initialized successfully',
        allowedOrigins: this.allowedOrigins.size,
        policies: this.policies.size
      };
    } catch (error) {
      Logger.error('❌ Failed to initialize CORS service:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Setup default CORS policies
   */
  setupDefaultPolicies() {
    // Permissive policy (development)
    this.policies.set('permissive', {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['X-Request-ID', 'X-API-Version'],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200
    });

    // Restrictive policy (production)
    this.policies.set('restrictive', {
      origin: (origin, callback) => this.validateOrigin(origin, callback),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Request-ID'],
      maxAge: 3600, // 1 hour
      preflightContinue: false,
      optionsSuccessStatus: 200
    });

    // API-only policy
    this.policies.set('api', {
      origin: (origin, callback) => this.validateOrigin(origin, callback),
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
      maxAge: 3600,
      preflightContinue: false,
      optionsSuccessStatus: 200
    });

    // Webhook policy (no CORS needed)
    this.policies.set('webhook', {
      origin: false,
      credentials: false,
      methods: ['POST'],
      allowedHeaders: ['Content-Type', 'X-Webhook-Signature'],
      maxAge: 0
    });

    Logger.info('🌐 Default CORS policies registered');
  }

  /**
   * Load CORS configuration from environment
   */
  loadConfiguration() {
    // Load allowed origins from environment
    const origins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS;
    if (origins) {
      origins.split(',').forEach(origin => {
        const trimmed = origin.trim();
        if (trimmed) {
          if (trimmed.includes('*') || trimmed.includes('[') || trimmed.includes('{')) {
            // Pattern-based origin
            this.addDynamicOrigin(trimmed);
          } else {
            // Exact origin
            this.addAllowedOrigin(trimmed);
          }
        }
      });
    }

    // Development defaults
    if (process.env.NODE_ENV === 'development') {
      this.addAllowedOrigin('http://localhost:3000');
      this.addAllowedOrigin('http://localhost:3001');
      this.addAllowedOrigin('http://127.0.0.1:3000');
      this.addAllowedOrigin('http://127.0.0.1:3001');
    }

    Logger.info(`🌐 Loaded ${this.allowedOrigins.size} allowed origins and ${this.dynamicOrigins.size} dynamic patterns`);
  }

  /**
   * Add allowed origin
   */
  addAllowedOrigin(origin) {
    this.allowedOrigins.add(origin);
    Logger.info(`🌐 Added allowed origin: ${origin}`);
  }

  /**
   * Add dynamic origin pattern
   */
  addDynamicOrigin(pattern) {
    try {
      // Validate input pattern to prevent obvious injection attempts
      if (this._isPatternMalicious(pattern)) {
        throw new Error('Potentially malicious pattern detected');
      }

      let regexPattern;
      
      // Handle wildcard subdomains: *.example.com
      if (pattern.startsWith('*.')) {
        // Extract the domain part after '*.'
        const domainPart = pattern.substring(2);
        // Properly escape all regex special characters in the domain part
        const escapedDomain = domainPart.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        // Construct the regex pattern with proper escaping
        regexPattern = '^https?://[^./]+\\.' + escapedDomain + '$';
      }
      // Handle port wildcards: http://localhost:*
      else if (pattern.includes(':*') && this._isValidPortPattern(pattern)) {
        // First escape all regex special characters in the base pattern (without the port wildcard)
        const basePattern = pattern.replace(':*', '');
        const escapedBase = basePattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        // Then add the port regex pattern
        regexPattern = '^' + escapedBase + ':\\d+$';
      }
      // Handle any other patterns by fully escaping them (treating as literal strings)
      else {
        // Completely escape the pattern to treat it as a literal string
        const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        regexPattern = '^' + escapedPattern + '$';
        Logger.warn(`🌐 Pattern "${pattern}" treated as literal string (no wildcards processed)`);
      }
      
      const regex = new RegExp(regexPattern, 'i');
      this.dynamicOrigins.set(pattern, regex);
      
      Logger.info(`🌐 Added dynamic origin pattern: ${pattern}`);
    } catch (error) {
      Logger.error(`Failed to add dynamic origin pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Check if a pattern contains potentially malicious regex injection attempts
   */
  _isPatternMalicious(pattern) {
    // Check for obvious regex injection patterns
    const maliciousPatterns = [
      /\(\?\:/,           // Non-capturing groups
      /\(\?\=/,           // Positive lookahead
      /\(\?\!/,           // Negative lookahead
      /\(\?\<=/,          // Positive lookbehind
      /\(\?\<!/,          // negative lookbehind
      /\\\w+/,            // Escape sequences like \n, \t, etc.
      /\[\^[^\]]*\]/,     // Negated character classes (unless simple)
      /\{.*,.*\}/,        // Quantifiers with complex ranges
      /\|.*\|/,           // Multiple alternation pipes
      /\(\?\#/,           // Comments in regex
    ];

    return maliciousPatterns.some(malicious => malicious.test(pattern));
  }

  /**
   * Validate that a port pattern is in expected format
   */
  _isValidPortPattern(pattern) {
    // Should match patterns like: http://localhost:* or https://example.com:*
    const validPortPattern = /^https?:\/\/[a-zA-Z0-9.-]+:\*$/;
    return validPortPattern.test(pattern);
  }

  /**
   * Remove allowed origin
   */
  removeAllowedOrigin(origin) {
    const removed = this.allowedOrigins.delete(origin);
    if (removed) {
      Logger.info(`🌐 Removed allowed origin: ${origin}`);
    }
    return removed;
  }

  /**
   * Validate origin against allowed origins
   */
  validateOrigin(origin, callback) {
    try {
      // Track request
      this.corsMetrics.totalRequests++;
      
      // Allow requests with no origin (same-origin)
      if (!origin) {
        this.corsMetrics.allowedRequests++;
        return callback(null, true);
      }

      // Check exact matches first
      if (this.allowedOrigins.has(origin)) {
        this.corsMetrics.allowedRequests++;
        this.trackOriginMetrics(origin, true);
        return callback(null, true);
      }

      // Check dynamic patterns
      for (const [pattern, regex] of this.dynamicOrigins.entries()) {
        if (regex.test(origin)) {
          this.corsMetrics.allowedRequests++;
          this.trackOriginMetrics(origin, true);
          Logger.debug(`🌐 Origin ${origin} matched pattern ${pattern}`);
          return callback(null, true);
        }
      }

      // Origin not allowed
      this.corsMetrics.blockedRequests++;
      this.trackOriginMetrics(origin, false);
      
      Logger.warn(`🚫 CORS blocked origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      
    } catch (error) {
      Logger.error('CORS origin validation error:', error);
      return callback(error, false);
    }
  }

  /**
   * Track origin metrics
   */
  trackOriginMetrics(origin, allowed) {
    if (!this.corsMetrics.byOrigin[origin]) {
      this.corsMetrics.byOrigin[origin] = { allowed: 0, blocked: 0 };
    }
    
    if (allowed) {
      this.corsMetrics.byOrigin[origin].allowed++;
    } else {
      this.corsMetrics.byOrigin[origin].blocked++;
    }
  }

  /**
   * Create CORS middleware with specified policy
   */
  createMiddleware(policyName = 'restrictive', customOptions = {}) {
    if (!this.isEnabled) {
      return (req, res, next) => next();
    }

    const policy = this.policies.get(policyName);
    if (!policy) {
      Logger.warn(`CORS policy '${policyName}' not found, using restrictive`);
      return this.createMiddleware('restrictive', customOptions);
    }

    const options = { ...policy, ...customOptions };
    
    // Add metrics tracking
    const corsMiddleware = cors(options);
    
    return (req, res, next) => {
      // Track method metrics
      const method = req.method;
      if (!this.corsMetrics.byMethod[method]) {
        this.corsMetrics.byMethod[method] = 0;
      }
      this.corsMetrics.byMethod[method]++;
      
      // Track preflight requests
      if (method === 'OPTIONS') {
        this.corsMetrics.preflightRequests++;
      }
      
      // Apply CORS middleware
      corsMiddleware(req, res, next);
    };
  }

  /**
   * Create permissive CORS middleware (development)
   */
  createPermissiveMiddleware(customOptions = {}) {
    return this.createMiddleware('permissive', customOptions);
  }

  /**
   * Create restrictive CORS middleware (production)
   */
  createRestrictiveMiddleware(customOptions = {}) {
    return this.createMiddleware('restrictive', customOptions);
  }

  /**
   * Create API-specific CORS middleware
   */
  createAPIMiddleware(customOptions = {}) {
    return this.createMiddleware('api', customOptions);
  }

  /**
   * Register custom CORS policy
   */
  registerPolicy(name, policy) {
    this.policies.set(name, policy);
    Logger.info(`🌐 Registered CORS policy: ${name}`);
  }

  /**
   * Get CORS policy
   */
  getPolicy(name) {
    return this.policies.get(name);
  }

  /**
   * List all policies
   */
  listPolicies() {
    return Array.from(this.policies.keys());
  }

  /**
   * Get CORS metrics
   */
  getMetrics() {
    return {
      ...this.corsMetrics,
      uptime: Date.now() - this.corsMetrics.startTime,
      allowedOrigins: this.allowedOrigins.size,
      dynamicOrigins: this.dynamicOrigins.size,
      policies: this.policies.size
    };
  }

  /**
   * Get CORS status
   */
  getCORSStatus() {
    const blocked = this.corsMetrics.blockedRequests;
    const total = this.corsMetrics.totalRequests;
    const blockRate = total > 0 ? (blocked / total * 100).toFixed(2) : 0;

    return {
      status: this.isEnabled ? 'enabled' : 'disabled',
      blockRate: `${blockRate}%`,
      totalRequests: total,
      allowedRequests: this.corsMetrics.allowedRequests,
      blockedRequests: blocked,
      preflightRequests: this.corsMetrics.preflightRequests
    };
  }

  /**
   * Get top origins by request count
   */
  getTopOrigins(limit = 10) {
    return Object.entries(this.corsMetrics.byOrigin)
      .map(([origin, stats]) => ({
        origin,
        total: stats.allowed + stats.blocked,
        allowed: stats.allowed,
        blocked: stats.blocked,
        blockRate: stats.allowed + stats.blocked > 0 
          ? ((stats.blocked / (stats.allowed + stats.blocked)) * 100).toFixed(2) + '%'
          : '0%'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.corsMetrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      preflightRequests: 0,
      byOrigin: {},
      byMethod: {},
      startTime: Date.now()
    };
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'CORS service is disabled' };
    }

    return {
      status: 'connected',
      message: 'CORS service is operational',
      allowedOrigins: this.allowedOrigins.size,
      policies: this.policies.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.allowedOrigins.clear();
    this.dynamicOrigins.clear();
    this.policies.clear();
    this.clearMetrics();
  }
}

module.exports = CORSService;