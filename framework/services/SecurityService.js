const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const Logger = require('../helpers/Logger');

/**
 * Comprehensive Security Service
 * 
 * Handles all security-related functionality:
 * - Security headers management (Helmet integration)
 * - Rate limiting and slow-down policies
 * - IP whitelist/blacklist management
 * - Security policy enforcement
 * - Threat detection and blocking
 * - Security monitoring and alerting
 */
class SecurityService {
  constructor(config = {}) {
    this.config = config;
    this.isEnabled = config.enabled !== false;
    
    // Security state
    this.blacklistedIPs = new Set();
    this.whitelistedIPs = new Set();
    this.suspiciousIPs = new Map(); // IP -> { attempts, lastAttempt, violations }
    this.rateLimiters = new Map();
    this.securityPolicies = new Map();
    this.threatRules = new Map();
    
    // Security metrics
    this.metrics = {
      totalRequests: 0,
      blockedRequests: 0,
      rateLimitedRequests: 0,
      suspiciousActivity: 0,
      threatDetections: 0,
      byType: {},
      byIP: {},
      startTime: Date.now()
    };
    
    // Default security policies
    this.setupDefaultPolicies();
    
    // Default threat detection rules
    this.setupDefaultThreatRules();
    
    // Setup cleanup intervals
    this.setupCleanup();
  }

  /**
   * Initialize the security service
   */
  async connect() {
    if (!this.isEnabled) {
      Logger.info('Security service is disabled');
      return { status: 'disabled', message: 'Security service is disabled in configuration' };
    }

    try {
      // Initialize security components
      this.setupIPLists();
      this.setupRateLimiters();
      
      Logger.info('✅ Security service initialized');
      
      return {
        status: 'connected',
        message: 'Security service initialized successfully',
        policies: this.securityPolicies.size,
        threatRules: this.threatRules.size
      };
    } catch (error) {
      Logger.error('❌ Failed to initialize security service:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Setup default security policies
   */
  setupDefaultPolicies() {
    // Default helmet configuration
    this.registerSecurityPolicy('helmet', {
      enabled: true,
      config: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        crossOriginEmbedderPolicy: false,
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: 'strict-origin-when-cross-origin'
      }
    });

    // Rate limiting policy
    this.registerSecurityPolicy('rateLimit', {
      enabled: true,
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 1000 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      strict: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Rate limit exceeded for strict endpoints.',
        skipSuccessfulRequests: true
      },
      auth: {
        windowMs: 15 * 60 * 1000,
        max: 20, // More restrictive for auth endpoints
        message: 'Too many authentication attempts.',
        skipSuccessfulRequests: true
      }
    });

    // Slow down policy
    this.registerSecurityPolicy('slowDown', {
      enabled: true,
      windowMs: 15 * 60 * 1000,
      delayAfter: 100,
      delayMs: 500,
      maxDelayMs: 20000
    });

    Logger.info('🛡️ Default security policies registered');
  }

  /**
   * Setup default threat detection rules
   */
  setupDefaultThreatRules() {
    // SQL Injection detection
    this.registerThreatRule('sqlInjection', {
      enabled: true,
      patterns: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
        /(UNION\s+SELECT)/i,
        /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
        /([\'\"];\s*(DROP|DELETE|INSERT|UPDATE))/i
      ],
      severity: 'high',
      action: 'block'
    });

    // XSS detection
    this.registerThreatRule('xss', {
      enabled: true,
      patterns: [
        // Improved script tag detection - handles spaces and attributes in closing tag
        /<script[^>]*>.*?<\/script\s*>/gis,
        // Alternative script patterns
        /<script[^>]*\/>/gi,
        // Javascript protocols
        /javascript\s*:/gi,
        /vbscript\s*:/gi,
        /data\s*:\s*text\/html/gi,
        // Event handlers
        /on\w+\s*=/gi,
        // Iframe and other dangerous tags
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<link[^>]*>/gi,
        /<meta[^>]*>/gi,
        // Expression and eval patterns
        /expression\s*\(/gi,
        /eval\s*\(/gi,
        // HTML entities that could be XSS (only dangerous ones)
        /&#0*60;?/gi,   // <
        /&#0*62;?/gi,   // >
        /&#0*34;?/gi,   // "
        /&#0*39;?/gi,   // '
        /&#0*47;?/gi,   // /
        /&#x0*3c;?/gi,  // < (hex)
        /&#x0*3e;?/gi,  // > (hex)
        /&#x0*22;?/gi,  // " (hex)
        /&#x0*27;?/gi,  // ' (hex)
        /&#x0*2f;?/gi,  // / (hex)
        // Style injection
        /<style[^>]*>.*?<\/style\s*>/gis,
        // Import statements
        /@import/gi
      ],
      severity: 'medium',
      action: 'sanitize'
    });

    // Path traversal detection
    this.registerThreatRule('pathTraversal', {
      enabled: true,
      patterns: [
        /\.\.\//g,
        /\.\.%2f/gi,
        /\.\.%5c/gi,
        /\.\.\\/g
      ],
      severity: 'high',
      action: 'block'
    });

    // Brute force detection
    this.registerThreatRule('bruteForce', {
      enabled: true,
      maxAttempts: 5,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      severity: 'high',
      action: 'block'
    });

    Logger.info('🛡️ Default threat detection rules registered');
  }

  /**
   * Setup IP lists from configuration
   */
  setupIPLists() {
    // Load whitelisted IPs
    const whitelist = process.env.SECURITY_WHITELIST_IPS;
    if (whitelist) {
      whitelist.split(',').forEach(ip => {
        this.whitelistedIPs.add(ip.trim());
      });
      Logger.info(`🛡️ Loaded ${this.whitelistedIPs.size} whitelisted IPs`);
    }

    // Load blacklisted IPs
    const blacklist = process.env.SECURITY_BLACKLIST_IPS;
    if (blacklist) {
      blacklist.split(',').forEach(ip => {
        this.blacklistedIPs.add(ip.trim());
      });
      Logger.info(`🛡️ Loaded ${this.blacklistedIPs.size} blacklisted IPs`);
    }
  }

  /**
   * Setup rate limiters
   */
  setupRateLimiters() {
    const rateLimitPolicy = this.securityPolicies.get('rateLimit');
    if (!rateLimitPolicy?.enabled) return;

    // Global rate limiter
    this.rateLimiters.set('global', rateLimit({
      ...rateLimitPolicy.global,
      keyGenerator: (req) => req.ip,
      skip: (req) => this.shouldSkipRateLimit(req),
      onLimitReached: (req) => this.handleRateLimitReached(req, 'global')
    }));

    // Strict rate limiter
    this.rateLimiters.set('strict', rateLimit({
      ...rateLimitPolicy.strict,
      keyGenerator: (req) => req.ip,
      skip: (req) => this.shouldSkipRateLimit(req),
      onLimitReached: (req) => this.handleRateLimitReached(req, 'strict')
    }));

    // Auth rate limiter
    this.rateLimiters.set('auth', rateLimit({
      ...rateLimitPolicy.auth,
      keyGenerator: (req) => req.ip,
      skip: (req) => this.shouldSkipRateLimit(req),
      onLimitReached: (req) => this.handleRateLimitReached(req, 'auth')
    }));

    Logger.info('🛡️ Rate limiters configured');
  }

  /**
   * Register security policy
   */
  registerSecurityPolicy(name, policy) {
    this.securityPolicies.set(name, policy);
    Logger.info(`🛡️ Registered security policy: ${name}`);
  }

  /**
   * Register threat detection rule
   */
  registerThreatRule(name, rule) {
    this.threatRules.set(name, rule);
    Logger.info(`🛡️ Registered threat rule: ${name}`);
  }

  /**
   * Create security middleware
   */
  createSecurityMiddleware(options = {}) {
    return (req, res, next) => {
      try {
        // Track request
        this.metrics.totalRequests++;
        
        // Check IP blacklist/whitelist
        const ipCheck = this.checkIP(req.ip);
        if (ipCheck.blocked) {
          this.metrics.blockedRequests++;
          return res.status(403).json({
            success: false,
            message: ipCheck.reason,
            blocked: true,
            timestamp: new Date().toISOString()
          });
        }

        // Threat detection
        const threatCheck = this.detectThreats(req);
        if (threatCheck.blocked) {
          this.metrics.blockedRequests++;
          this.metrics.threatDetections++;
          this.recordSuspiciousActivity(req.ip, threatCheck.threat);
          
          return res.status(403).json({
            success: false,
            message: 'Security threat detected',
            blocked: true,
            threatId: threatCheck.threatId,
            timestamp: new Date().toISOString()
          });
        }

        // Continue to next middleware
        next();
        
      } catch (error) {
        Logger.error('Security middleware error:', error);
        next(); // Don't block on security middleware errors
      }
    };
  }

  /**
   * Create helmet middleware for security headers
   */
  createHelmetMiddleware(customConfig = {}) {
    const helmetPolicy = this.securityPolicies.get('helmet');
    if (!helmetPolicy?.enabled) {
      return (req, res, next) => next();
    }

    const config = { ...helmetPolicy.config, ...customConfig };
    return helmet(config);
  }

  /**
   * Create rate limiting middleware
   */
  createRateLimitMiddleware(type = 'global') {
    const limiter = this.rateLimiters.get(type);
    if (!limiter) {
      Logger.warn(`Rate limiter '${type}' not found, using global`);
      return this.rateLimiters.get('global') || ((req, res, next) => next());
    }
    return limiter;
  }

  /**
   * Create slow down middleware
   */
  createSlowDownMiddleware(customConfig = {}) {
    const slowDownPolicy = this.securityPolicies.get('slowDown');
    if (!slowDownPolicy?.enabled) {
      return (req, res, next) => next();
    }

    const config = { ...slowDownPolicy, ...customConfig };
    return slowDown(config);
  }

  /**
   * Check IP address against whitelist/blacklist
   */
  checkIP(ip) {
    // Check whitelist first
    if (this.whitelistedIPs.has(ip)) {
      return { blocked: false, whitelisted: true };
    }

    // Check blacklist
    if (this.blacklistedIPs.has(ip)) {
      return { 
        blocked: true, 
        reason: 'IP address is blacklisted',
        blacklisted: true 
      };
    }

    // Check suspicious activity
    const suspicious = this.suspiciousIPs.get(ip);
    if (suspicious && suspicious.violations >= 3) {
      return {
        blocked: true,
        reason: 'IP address has been flagged for suspicious activity',
        suspicious: true
      };
    }

    return { blocked: false };
  }

  /**
   * Detect security threats in request
   */
  detectThreats(req) {
    const threats = [];
    
    for (const [ruleName, rule] of this.threatRules.entries()) {
      if (!rule.enabled) continue;
      
      const detection = this.checkThreatRule(req, ruleName, rule);
      if (detection.detected) {
        threats.push({
          rule: ruleName,
          severity: rule.severity,
          action: rule.action,
          details: detection.details
        });
      }
    }

    if (threats.length > 0) {
      const highSeverityThreat = threats.find(t => t.severity === 'high');
      if (highSeverityThreat || threats.length > 2) {
        return {
          blocked: true,
          threat: threats[0],
          threatId: this.generateThreatId(),
          allThreats: threats
        };
      }
    }

    return { blocked: false, threats };
  }

  /**
   * Check specific threat rule
   */
  checkThreatRule(req, ruleName, rule) {
    try {
      switch (ruleName) {
        case 'sqlInjection':
        case 'xss':
        case 'pathTraversal':
          return this.checkPatternRule(req, rule);
        case 'bruteForce':
          return this.checkBruteForceRule(req, rule);
        default:
          return { detected: false };
      }
    } catch (error) {
      Logger.error(`Threat rule check failed for ${ruleName}:`, error.message);
      return { detected: false };
    }
  }

  /**
   * Check pattern-based threat rules
   */
  checkPatternRule(req, rule) {
    const checkText = [
      req.originalUrl,
      JSON.stringify(req.query),
      JSON.stringify(req.body),
      JSON.stringify(req.headers)
    ].join(' ');

    for (const pattern of rule.patterns) {
      if (pattern.test(checkText)) {
        return {
          detected: true,
          details: {
            pattern: pattern.toString(),
            matched: checkText.match(pattern)?.[0]
          }
        };
      }
    }

    return { detected: false };
  }

  /**
   * Check brute force rule
   */
  checkBruteForceRule(req, rule) {
    const ip = req.ip;
    const now = Date.now();
    
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, {
        attempts: 1,
        lastAttempt: now,
        violations: 0
      });
      return { detected: false };
    }

    const record = this.suspiciousIPs.get(ip);
    
    // Reset if time window expired
    if (now - record.lastAttempt > rule.timeWindow) {
      record.attempts = 1;
      record.lastAttempt = now;
      return { detected: false };
    }

    record.attempts++;
    record.lastAttempt = now;

    if (record.attempts > rule.maxAttempts) {
      record.violations++;
      return {
        detected: true,
        details: {
          attempts: record.attempts,
          violations: record.violations,
          timeWindow: rule.timeWindow
        }
      };
    }

    return { detected: false };
  }

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity(ip, threat) {
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, {
        attempts: 0,
        lastAttempt: Date.now(),
        violations: 0
      });
    }

    const record = this.suspiciousIPs.get(ip);
    record.violations++;
    record.lastAttempt = Date.now();

    this.metrics.suspiciousActivity++;
    
    Logger.warn(`🚨 Suspicious activity from ${ip}:`, {
      threat: threat.rule,
      severity: threat.severity,
      violations: record.violations
    });
  }

  /**
   * Should skip rate limiting for this request
   */
  shouldSkipRateLimit(req) {
    // Skip for whitelisted IPs
    if (this.whitelistedIPs.has(req.ip)) {
      return true;
    }

    // Skip for health checks
    if (req.path.startsWith('/api/health')) {
      return true;
    }

    return false;
  }

  /**
   * Handle rate limit reached
   */
  handleRateLimitReached(req, type) {
    this.metrics.rateLimitedRequests++;
    
    Logger.warn(`🚦 Rate limit reached for ${req.ip}:`, {
      type,
      path: req.path,
      userAgent: req.get('User-Agent')
    });

    // Record as suspicious activity
    this.recordSuspiciousActivity(req.ip, {
      rule: 'rateLimit',
      severity: 'medium'
    });
  }

  /**
   * Add IP to blacklist
   */
  blacklistIP(ip, reason = 'Manual blacklist') {
    this.blacklistedIPs.add(ip);
    Logger.warn(`🚫 IP ${ip} blacklisted: ${reason}`);
  }

  /**
   * Add IP to whitelist
   */
  whitelistIP(ip, reason = 'Manual whitelist') {
    this.whitelistedIPs.add(ip);
    // Remove from blacklist if present
    this.blacklistedIPs.delete(ip);
    Logger.info(`✅ IP ${ip} whitelisted: ${reason}`);
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip) {
    const removed = this.blacklistedIPs.delete(ip);
    if (removed) {
      Logger.info(`🔓 IP ${ip} removed from blacklist`);
    }
    return removed;
  }

  /**
   * Generate unique threat ID
   */
  generateThreatId() {
    return `threat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get security metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      blacklistedIPs: this.blacklistedIPs.size,
      whitelistedIPs: this.whitelistedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      activePolicies: this.securityPolicies.size,
      activeThreatRules: this.threatRules.size
    };
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    const recentThreats = Array.from(this.suspiciousIPs.entries())
      .filter(([ip, record]) => Date.now() - record.lastAttempt < 3600000) // Last hour
      .length;

    return {
      status: recentThreats > 10 ? 'high_alert' : (recentThreats > 5 ? 'elevated' : 'normal'),
      recentThreats,
      totalBlocked: this.metrics.blockedRequests,
      rateLimited: this.metrics.rateLimitedRequests,
      uptime: Date.now() - this.metrics.startTime
    };
  }

  /**
   * Setup cleanup intervals
   */
  setupCleanup() {
    // Clean up old suspicious IP records every hour
    setInterval(() => {
      const now = Date.now();
      const oneHour = 3600000;
      
      for (const [ip, record] of this.suspiciousIPs.entries()) {
        if (now - record.lastAttempt > oneHour && record.violations < 3) {
          this.suspiciousIPs.delete(ip);
        }
      }
    }, 3600000);

    // Reset metrics daily
    setInterval(() => {
      this.metrics = {
        ...this.metrics,
        totalRequests: 0,
        blockedRequests: 0,
        rateLimitedRequests: 0,
        suspiciousActivity: 0,
        threatDetections: 0,
        byType: {},
        byIP: {}
      };
    }, 86400000); // 24 hours
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'Security service is disabled' };
    }

    return {
      status: 'connected',
      message: 'Security service is operational',
      policies: this.securityPolicies.size,
      threatRules: this.threatRules.size,
      metrics: this.getMetrics()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.blacklistedIPs.clear();
    this.whitelistedIPs.clear();
    this.suspiciousIPs.clear();
    this.rateLimiters.clear();
    this.securityPolicies.clear();
    this.threatRules.clear();
  }
}

module.exports = SecurityService;