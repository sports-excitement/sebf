const Logger = require('../helpers/Logger');
const Response = require('../helpers/Response');

/**
 * Centralized Error Handling Service
 * 
 * Provides comprehensive error management capabilities:
 * - Error classification and categorization
 * - Structured error logging with context
 * - Error reporting and alerting
 * - Recovery strategies and suggestions
 * - Error metrics and monitoring
 * - Custom error handlers registration
 */
class ErrorHandlingService {
  constructor() {
    this.errorHandlers = new Map();
    this.errorMetrics = {
      total: 0,
      byType: {},
      byCode: {},
      byUser: {},
      byEndpoint: {},
      recent: []
    };
    
    this.alertThresholds = {
      ratePerMinute: 10,    // Alert if more than 10 errors per minute
      criticalErrors: 1,    // Alert on any critical error
      consecutiveErrors: 5  // Alert if 5 consecutive errors from same source
    };
    
    this.errorTypes = {
      VALIDATION: 'ValidationError',
      DATABASE: 'DatabaseError', 
      AUTHENTICATION: 'AuthenticationError',
      AUTHORIZATION: 'AuthorizationError',
      NOT_FOUND: 'NotFoundError',
      RATE_LIMIT: 'RateLimitError',
      FILE_SYSTEM: 'FileSystemError',
      NETWORK: 'NetworkError',
      BUSINESS_LOGIC: 'BusinessLogicError',
      THIRD_PARTY: 'ThirdPartyError',
      SYSTEM: 'SystemError',
      CONFIGURATION: 'ConfigurationError'
    };
    
    this.errorSeverity = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
    
    this.recoveryStrategies = new Map();
    this.alertCallbacks = [];
    
    // Store interval IDs for proper cleanup
    this.cleanupInterval = null;
    this.alertingInterval = null;
    
    // Register default error handlers
    this.registerDefaultHandlers();
    
    // Setup cleanup interval (skip in testing to prevent Jest handles)
    if (process.env.NODE_ENV !== 'testing') {
      this.setupCleanup();
    }
    
    // Setup alerting system (skip in testing to prevent Jest handles)
    if (process.env.NODE_ENV !== 'testing') {
      this.setupAlerting();
    }
  }

  /**
   * Register default error handlers for common error types
   */
  registerDefaultHandlers() {
    // Validation errors
    this.registerErrorHandler('ValidationError', (error, context) => ({
      httpStatus: 422,
      message: 'Validation failed',
      severity: this.errorSeverity.LOW,
      recoverable: true,
      suggestion: 'Please check your input data and try again'
    }));

    // Database errors
    this.registerErrorHandler('PrismaClientKnownRequestError', (error, context) => {
      const suggestions = {
        'P2002': 'A record with this data already exists',
        'P2025': 'Record not found',
        'P2003': 'Invalid reference in the data',
        'P2014': 'Invalid ID provided',
        'P2001': 'Record does not exist'
      };
      
      return {
        httpStatus: error.code === 'P2025' ? 404 : (error.code === 'P2002' ? 409 : 400),
        message: suggestions[error.code] || 'Database operation failed',
        severity: this.errorSeverity.MEDIUM,
        recoverable: true,
        suggestion: 'Please check your data and try again'
      };
    });

    // Authentication errors
    this.registerErrorHandler('JsonWebTokenError', (error, context) => ({
      httpStatus: 401,
      message: 'Invalid authentication token',
      severity: this.errorSeverity.MEDIUM,
      recoverable: true,
      suggestion: 'Please login again'
    }));

    this.registerErrorHandler('TokenExpiredError', (error, context) => ({
      httpStatus: 401,
      message: 'Authentication token has expired',
      severity: this.errorSeverity.LOW,
      recoverable: true,
      suggestion: 'Please login again'
    }));

    // File system errors
    this.registerErrorHandler('ENOENT', (error, context) => ({
      httpStatus: 404,
      message: 'File not found',
      severity: this.errorSeverity.MEDIUM,
      recoverable: false,
      suggestion: 'Please check the file path'
    }));

    // Network errors
    this.registerErrorHandler('ECONNREFUSED', (error, context) => ({
      httpStatus: 503,
      message: 'External service unavailable',
      severity: this.errorSeverity.HIGH,
      recoverable: true,
      suggestion: 'Service temporarily unavailable. Please try again later'
    }));
  }

  /**
   * Register custom error handler
   * @param {string} errorType - Error type or error name
   * @param {Function} handler - Handler function
   */
  registerErrorHandler(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
    Logger.info(`🛡️ Registered error handler for: ${errorType}`);
  }

  /**
   * Register recovery strategy
   * @param {string} errorType - Error type
   * @param {Function} strategy - Recovery function
   */
  registerRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
    Logger.info(`🔄 Registered recovery strategy for: ${errorType}`);
  }

  /**
   * Register alert callback
   * @param {Function} callback - Alert callback function
   */
  registerAlertCallback(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Handle error with comprehensive processing
   * @param {Error} error - The error object
   * @param {Object} context - Error context (request, user, etc.)
   * @param {Object} options - Additional options
   * @returns {Object} Processed error information
   */
  async handleError(error, context = {}, options = {}) {
    try {
      // Generate unique error ID
      const errorId = this.generateErrorId();
      
      // Classify the error
      const classification = this.classifyError(error);
      
      // Get error handler result
      const handlerResult = this.getErrorHandlerResult(error, context);
      
      // Build comprehensive error info
      const errorInfo = {
        id: errorId,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        classification,
        severity: handlerResult.severity || this.errorSeverity.MEDIUM,
        httpStatus: handlerResult.httpStatus || 500,
        recoverable: handlerResult.recoverable || false,
        suggestion: handlerResult.suggestion,
        context: this.sanitizeContext(context),
        metadata: {
          userAgent: context.userAgent,
          ip: context.ip,
          userId: context.userId,
          endpoint: context.endpoint,
          method: context.method,
          requestId: context.requestId
        }
      };

      // Log the error
      await this.logError(errorInfo);
      
      // Update metrics
      this.updateMetrics(errorInfo);
      
      // Check for alerts
      await this.checkAlerts(errorInfo);
      
      // Attempt recovery if applicable
      if (errorInfo.recoverable && options.attemptRecovery !== false) {
        const recoveryResult = await this.attemptRecovery(error, context);
        errorInfo.recoveryAttempted = true;
        errorInfo.recoverySuccessful = recoveryResult.success;
        errorInfo.recoveryMessage = recoveryResult.message;
      }

      return errorInfo;
      
    } catch (handlingError) {
      // Error in error handling - log and return basic info
      Logger.error('Error in error handling service:', handlingError);
      
      return {
        id: this.generateErrorId(),
        timestamp: new Date().toISOString(),
        message: error.message || 'An error occurred',
        severity: this.errorSeverity.HIGH,
        httpStatus: 500,
        handlingError: handlingError.message
      };
    }
  }

  /**
   * Classify error type and determine characteristics
   * @param {Error} error - The error object
   * @returns {Object} Error classification
   */
  classifyError(error) {
    const classification = {
      type: 'UNKNOWN',
      category: 'system',
      isUserFacing: true,
      shouldLog: true,
      shouldAlert: false
    };

    // Check error name
    if (error.name) {
      if (error.name.includes('Validation')) {
        classification.type = this.errorTypes.VALIDATION;
        classification.category = 'user';
        classification.shouldAlert = false;
      } else if (error.name.includes('Prisma') || error.name.includes('Database')) {
        classification.type = this.errorTypes.DATABASE;
        classification.category = 'system';
        classification.shouldAlert = true;
      } else if (error.name.includes('JWT') || error.name.includes('Auth')) {
        classification.type = this.errorTypes.AUTHENTICATION;
        classification.category = 'security';
        classification.shouldAlert = true;
      }
    }

    // Check error code
    if (error.code) {
      if (error.code.startsWith('P')) { // Prisma errors
        classification.type = this.errorTypes.DATABASE;
        classification.category = 'system';
      } else if (['ENOENT', 'EACCES', 'EMFILE'].includes(error.code)) {
        classification.type = this.errorTypes.FILE_SYSTEM;
        classification.category = 'system';
        classification.shouldAlert = true;
      } else if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
        classification.type = this.errorTypes.NETWORK;
        classification.category = 'external';
        classification.shouldAlert = true;
      }
    }

    // Check HTTP status
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      if (status >= 400 && status < 500) {
        classification.category = 'user';
        classification.shouldAlert = false;
      } else if (status >= 500) {
        classification.category = 'system';
        classification.shouldAlert = true;
      }
    }

    return classification;
  }

  /**
   * Get error handler result
   * @param {Error} error - The error object
   * @param {Object} context - Error context
   * @returns {Object} Handler result
   */
  getErrorHandlerResult(error, context) {
    // Try specific error handlers
    const handlers = [
      error.name,
      error.code,
      error.constructor.name,
      'default'
    ];

    for (const handlerKey of handlers) {
      if (this.errorHandlers.has(handlerKey)) {
        try {
          return this.errorHandlers.get(handlerKey)(error, context);
        } catch (handlerError) {
          Logger.warn(`Error handler failed for ${handlerKey}:`, handlerError.message);
        }
      }
    }

    // Default fallback
    return {
      httpStatus: 500,
      message: 'An unexpected error occurred',
      severity: this.errorSeverity.MEDIUM,
      recoverable: false,
      suggestion: 'Please try again or contact support if the problem persists'
    };
  }

  /**
   * Log error with appropriate level and context
   * @param {Object} errorInfo - Processed error information
   */
  async logError(errorInfo) {
    const logData = {
      errorId: errorInfo.id,
      message: errorInfo.message,
      stack: errorInfo.stack,
      classification: errorInfo.classification,
      severity: errorInfo.severity,
      context: errorInfo.context,
      metadata: errorInfo.metadata
    };

    switch (errorInfo.severity) {
      case this.errorSeverity.CRITICAL:
        Logger.error('🚨 CRITICAL ERROR:', logData);
        break;
      case this.errorSeverity.HIGH:
        Logger.error('🔴 HIGH SEVERITY ERROR:', logData);
        break;
      case this.errorSeverity.MEDIUM:
        Logger.warn('🟡 MEDIUM SEVERITY ERROR:', logData);
        break;
      case this.errorSeverity.LOW:
        Logger.info('🔵 LOW SEVERITY ERROR:', logData);
        break;
      default:
        Logger.error('ERROR:', logData);
    }
  }

  /**
   * Update error metrics
   * @param {Object} errorInfo - Processed error information
   */
  updateMetrics(errorInfo) {
    this.errorMetrics.total++;
    
    // By type
    const type = errorInfo.classification.type;
    this.errorMetrics.byType[type] = (this.errorMetrics.byType[type] || 0) + 1;
    
    // By code
    if (errorInfo.code) {
      this.errorMetrics.byCode[errorInfo.code] = (this.errorMetrics.byCode[errorInfo.code] || 0) + 1;
    }
    
    // By user
    if (errorInfo.metadata.userId) {
      const userId = errorInfo.metadata.userId;
      this.errorMetrics.byUser[userId] = (this.errorMetrics.byUser[userId] || 0) + 1;
    }
    
    // By endpoint
    if (errorInfo.metadata.endpoint) {
      const endpoint = errorInfo.metadata.endpoint;
      this.errorMetrics.byEndpoint[endpoint] = (this.errorMetrics.byEndpoint[endpoint] || 0) + 1;
    }
    
    // Recent errors (keep last 100)
    this.errorMetrics.recent.push({
      id: errorInfo.id,
      timestamp: errorInfo.timestamp,
      type: errorInfo.classification.type,
      severity: errorInfo.severity,
      message: errorInfo.message.substring(0, 100) // Truncate message
    });
    
    if (this.errorMetrics.recent.length > 100) {
      this.errorMetrics.recent = this.errorMetrics.recent.slice(-100);
    }
  }

  /**
   * Check if alerts should be triggered
   * @param {Object} errorInfo - Processed error information
   */
  async checkAlerts(errorInfo) {
    const now = Date.now();
    const alerts = [];

    // Critical error alert
    if (errorInfo.severity === this.errorSeverity.CRITICAL) {
      alerts.push({
        type: 'critical_error',
        message: `Critical error occurred: ${errorInfo.message}`,
        errorInfo
      });
    }

    // Rate-based alerts (errors per minute)
    const recentErrors = this.errorMetrics.recent.filter(
      err => new Date(err.timestamp).getTime() > now - 60000
    );
    
    if (recentErrors.length >= this.alertThresholds.ratePerMinute) {
      alerts.push({
        type: 'high_error_rate',
        message: `High error rate detected: ${recentErrors.length} errors in the last minute`,
        count: recentErrors.length,
        threshold: this.alertThresholds.ratePerMinute
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * Send alert to registered callbacks
   * @param {Object} alert - Alert information
   */
  async sendAlert(alert) {
    Logger.warn('🚨 ALERT:', alert);
    
    // Call registered alert callbacks
    for (const callback of this.alertCallbacks) {
      try {
        await callback(alert);
      } catch (callbackError) {
        Logger.error('Alert callback failed:', callbackError.message);
      }
    }
  }

  /**
   * Attempt error recovery
   * @param {Error} error - The original error
   * @param {Object} context - Error context
   * @returns {Object} Recovery result
   */
  async attemptRecovery(error, context) {
    const errorType = error.name || error.code || 'unknown';
    const strategy = this.recoveryStrategies.get(errorType);
    
    if (!strategy) {
      return {
        success: false,
        message: 'No recovery strategy available'
      };
    }

    try {
      const result = await strategy(error, context);
      Logger.info(`🔄 Recovery attempted for ${errorType}:`, result);
      return result;
    } catch (recoveryError) {
      Logger.error(`Recovery strategy failed for ${errorType}:`, recoveryError.message);
      return {
        success: false,
        message: 'Recovery strategy failed',
        error: recoveryError.message
      };
    }
  }

  /**
   * Sanitize context to remove sensitive information
   * @param {Object} context - Raw context
   * @returns {Object} Sanitized context
   */
  sanitizeContext(context) {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'cookie', 'x-api-key', 'x-auth-token'
    ];

    const sanitized = { ...context };
    
    // Remove sensitive headers
    if (sanitized.headers) {
      sensitized.headers = { ...sanitized.headers };
      sensitiveFields.forEach(field => {
        if (sanitized.headers[field]) {
          sanitized.headers[field] = '[REDACTED]';
        }
      });
    }
    
    // Remove sensitive body fields
    if (sanitized.body && typeof sanitized.body === 'object') {
      sanitized.body = { ...sanitized.body };
      sensitiveFields.forEach(field => {
        if (sanitized.body[field]) {
          sanitized.body[field] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create Express middleware for error handling
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createMiddleware(options = {}) {
    return async (error, req, res, next) => {
      try {
        const context = {
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id,
          endpoint: req.originalUrl,
          method: req.method,
          requestId: req.requestId,
          headers: req.headers,
          body: req.body,
          query: req.query,
          params: req.params
        };

        const errorInfo = await this.handleError(error, context, options);
        
        // Send appropriate response
        if (!res.headersSent) {
          const responseData = {
            success: false,
            message: errorInfo.suggestion || errorInfo.message,
            errorId: errorInfo.id,
            timestamp: errorInfo.timestamp
          };

          // Include additional details in development
          if (process.env.NODE_ENV === 'development') {
            responseData.error = {
              name: error.name,
              message: error.message,
              stack: error.stack,
              classification: errorInfo.classification
            };
          }

          return res.status(errorInfo.httpStatus).json(responseData);
        }
      } catch (middlewareError) {
        Logger.error('Error middleware failed:', middlewareError);
        
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'A critical error occurred',
            timestamp: new Date().toISOString()
          });
        }
      }
    };
  }

  /**
   * Get error metrics
   * @returns {Object} Current error metrics
   */
  getMetrics() {
    return {
      ...this.errorMetrics,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Clear metrics (for testing or reset)
   */
  clearMetrics() {
    this.errorMetrics = {
      total: 0,
      byType: {},
      byCode: {},
      byUser: {},
      byEndpoint: {},
      recent: []
    };
  }

  /**
   * Setup cleanup interval
   */
  setupCleanup() {
    this.startTime = Date.now();
    
    // Clean up old metrics every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, 3600000); // 1 hour
  }

  /**
   * Setup alerting system
   */
  setupAlerting() {
    // Monitor error rates every 30 seconds
    this.alertingInterval = setInterval(() => {
      this.checkErrorRates();
    }, 30000);
  }

  /**
   * Cleanup intervals for proper shutdown
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.alertingInterval) {
      clearInterval(this.alertingInterval);
      this.alertingInterval = null;
    }
  }

  /**
   * Clean up old metrics
   */
  cleanupMetrics() {
    const oneDayAgo = Date.now() - 86400000; // 24 hours
    
    this.errorMetrics.recent = this.errorMetrics.recent.filter(
      error => new Date(error.timestamp).getTime() > oneDayAgo
    );
    
    Logger.info('🧹 Error metrics cleaned up');
  }

  /**
   * Check error rates for patterns
   */
  checkErrorRates() {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000; // 5 minutes
    
    const recentErrors = this.errorMetrics.recent.filter(
      err => new Date(err.timestamp).getTime() > fiveMinutesAgo
    );
    
    // Check for error spikes
    if (recentErrors.length > 20) { // More than 20 errors in 5 minutes
      Logger.warn(`🚨 Error spike detected: ${recentErrors.length} errors in last 5 minutes`);
    }
  }

  /**
   * Test connection (for service health checks)
   */
  async testConnection() {
    return {
      status: 'connected',
      message: 'Error handling service is operational',
      metrics: this.getMetrics()
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.errorHandlers.clear();
    this.recoveryStrategies.clear();
    this.alertCallbacks.length = 0;
    this.clearMetrics();
  }
}

// Create singleton instance
const errorHandlingService = new ErrorHandlingService();

module.exports = errorHandlingService;