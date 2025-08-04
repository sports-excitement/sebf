const Response = require('../helpers/Response');
const Logger = require('../helpers/Logger');

/**
 * Enhanced Error Handler Middleware
 * 
 * Provides comprehensive error handling with proper logging,
 * sanitization, and failsafe mechanisms to prevent crashes.
 */

class ErrorHandlerService {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'ValidationError',
      DATABASE_ERROR: 'DatabaseError',
      AUTHENTICATION_ERROR: 'AuthenticationError',
      AUTHORIZATION_ERROR: 'AuthorizationError',
      NOT_FOUND_ERROR: 'NotFoundError',
      RATE_LIMIT_ERROR: 'RateLimitError',
      FILE_ERROR: 'FileError',
      NETWORK_ERROR: 'NetworkError',
      BUSINESS_LOGIC_ERROR: 'BusinessLogicError',
      THIRD_PARTY_ERROR: 'ThirdPartyError'
    };
  }

  /**
   * Main error handler middleware
   */
  handle = (error, req, res, next) => {
    try {
      // Log the error with context
      this.logError(error, req);

      // Handle different types of errors
      if (this.isValidationError(error)) {
        return this.handleValidationError(error, res);
      }

      if (this.isDatabaseError(error)) {
        return this.handleDatabaseError(error, res);
      }

      if (this.isAuthenticationError(error)) {
        return this.handleAuthenticationError(error, res);
      }

      if (this.isRateLimitError(error)) {
        return this.handleRateLimitError(error, res);
      }

      if (this.isFileError(error)) {
        return this.handleFileError(error, res);
      }

      if (this.isNetworkError(error)) {
        return this.handleNetworkError(error, res);
      }

      // Default to internal server error
      return this.handleGenericError(error, res);

    } catch (handlerError) {
      // Failsafe: if error handler itself fails
      Logger.error('Error handler failed:', handlerError);
      return this.sendFailsafeResponse(res);
    }
  };

  /**
   * Log error with context information
   */
  logError(error, req) {
    try {
      const errorContext = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        statusCode: error.statusCode,
        requestId: req.requestId,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeBody(req.body),
        query: req.query,
        params: req.params
      };

      // Determine log level based on error type
      const logLevel = this.getLogLevel(error);
      
      if (logLevel === 'error') {
        Logger.error('Application Error:', errorContext);
      } else if (logLevel === 'warn') {
        Logger.warn('Application Warning:', errorContext);
      } else {
        Logger.info('Application Info:', errorContext);
      }

    } catch (logError) {
      // Failsafe: if logging fails, don't crash
      console.error('Error logging failed:', logError);
    }
  }

  /**
   * Determine appropriate log level for error
   */
  getLogLevel(error) {
    // Client errors (4xx) are warnings, server errors (5xx) are errors
    if (error.statusCode >= 500) return 'error';
    if (error.statusCode >= 400) return 'warn';
    
    // Known error types
    if (this.isValidationError(error)) return 'info';
    if (this.isAuthenticationError(error)) return 'warn';
    if (this.isRateLimitError(error)) return 'warn';
    
    return 'error';
  }

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging (remove sensitive information)
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Error type detection methods
   */
  isValidationError(error) {
    return error.name === 'ValidationError' || 
           error.name === 'ValidatorError' ||
           error.statusCode === 422 ||
           error.code === 'VALIDATION_FAILED';
  }

  isDatabaseError(error) {
    return error.name === 'PrismaClientKnownRequestError' ||
           error.name === 'PrismaClientUnknownRequestError' ||
           error.name === 'PrismaClientRustPanicError' ||
           error.name === 'PrismaClientInitializationError' ||
           error.name === 'PrismaClientValidationError' ||
           error.code?.startsWith('P') || // Prisma error codes
           error.name === 'SequelizeError' ||
           error.name === 'MongoError';
  }

  isAuthenticationError(error) {
    return error.name === 'JsonWebTokenError' ||
           error.name === 'TokenExpiredError' ||
           error.name === 'NotBeforeError' ||
           error.statusCode === 401 ||
           error.code === 'AUTHENTICATION_FAILED';
  }

  isRateLimitError(error) {
    return error.statusCode === 429 ||
           error.code === 'RATE_LIMIT_EXCEEDED' ||
           error.name === 'RateLimitError';
  }

  isFileError(error) {
    return error.code === 'ENOENT' ||
           error.code === 'EACCES' ||
           error.code === 'EMFILE' ||
           error.code === 'ENAMETOOLONG' ||
           error.name === 'MulterError';
  }

  isNetworkError(error) {
    return error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.name === 'NetworkError';
  }

  /**
   * Specific error handlers
   */
  handleValidationError(error, res) {
    const message = 'Validation failed';
    const details = this.extractValidationDetails(error);
    
    return Response.validationError(res, message, details);
  }

  handleDatabaseError(error, res) {
    let message = 'Database operation failed';
    let statusCode = 500;

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      message = 'A record with this data already exists';
      statusCode = 409;
      return Response.conflict(res, message);
    }

    if (error.code === 'P2025') {
      message = 'Record not found';
      statusCode = 404;
      return Response.notFound(res, message);
    }

    if (error.code === 'P2003') {
      message = 'Invalid reference in the data';
      statusCode = 400;
      return Response.badRequest(res, message);
    }

    // Generic database error
    const sanitizedMessage = process.env.NODE_ENV === 'production' 
      ? 'Database operation failed' 
      : error.message;

    return Response.internalServerError(res, sanitizedMessage);
  }

  handleAuthenticationError(error, res) {
    let message = 'Authentication failed';

    if (error.name === 'TokenExpiredError') {
      message = 'Authentication token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid authentication token';
    } else if (error.name === 'NotBeforeError') {
      message = 'Authentication token not active yet';
    }

    return Response.unauthorized(res, message);
  }

  handleRateLimitError(error, res) {
    const message = 'Too many requests. Please try again later.';
    return Response.tooManyRequests(res, message);
  }

  handleFileError(error, res) {
    let message = 'File operation failed';

    if (error.code === 'ENOENT') {
      message = 'File not found';
      return Response.notFound(res, message);
    }

    if (error.code === 'EACCES') {
      message = 'File access denied';
      return Response.forbidden(res, message);
    }

    if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = 'File size exceeds limit';
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        message = 'Too many files uploaded';
      } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Unexpected file field';
      }
      return Response.badRequest(res, message);
    }

    return Response.internalServerError(res, message);
  }

  handleNetworkError(error, res) {
    const message = 'External service unavailable';
    return Response.serviceUnavailable(res, message);
  }

  handleGenericError(error, res) {
    // Handle known HTTP status codes
    if (error.statusCode) {
      const message = error.message || 'An error occurred';
      
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return Response.custom(res, error.statusCode, message, null, false);
      }
    }

    // Default to 500 for unknown errors
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message || 'An unexpected error occurred';

    return Response.internalServerError(res, message);
  }

  /**
   * Extract validation error details
   */
  extractValidationDetails(error) {
    if (error.details && Array.isArray(error.details)) {
      return error.details.map(detail => ({
        field: detail.path?.join('.') || detail.field,
        message: detail.message,
        value: detail.context?.value
      }));
    }

    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map(err => ({
        field: err.path || err.field,
        message: err.message,
        value: err.value
      }));
    }

    return [{ field: 'unknown', message: error.message }];
  }

  /**
   * Failsafe response when error handler itself fails
   */
  sendFailsafeResponse(res) {
    try {
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'A critical error occurred',
          timestamp: new Date().toISOString()
        });
      }
    } catch (failsafeError) {
      // Last resort: try to end the response
      try {
        res.end();
      } catch (endError) {
        // If even ending fails, there's nothing more we can do
        console.error('Complete failsafe failure:', endError);
      }
    }
  }

  /**
   * Handle async errors (wrapper for async middleware)
   */
  asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException = (error) => {
    Logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // In production, exit gracefully
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  };

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection = (reason, promise) => {
    Logger.error('Unhandled Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise?.toString(),
      timestamp: new Date().toISOString()
    });

    // In production, exit gracefully
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  };

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    process.on('uncaughtException', this.handleUncaughtException);
    process.on('unhandledRejection', this.handleUnhandledRejection);
    
    Logger.info('Global error handlers initialized');
  }
}

// Create instance
const errorHandlerService = new ErrorHandlerService();

// Setup global handlers
errorHandlerService.setupGlobalHandlers();

// Export the main handler and utility functions
module.exports = errorHandlerService.handle;
module.exports.asyncHandler = errorHandlerService.asyncHandler;
module.exports.errorHandlerService = errorHandlerService; 