const Response = require('../helpers/Response');
const Logger = require('../helpers/Logger');
const ErrorHandlingService = require('../services/ErrorHandlingService');

/**
 * Enhanced Error Handler Middleware
 * 
 * Uses the centralized ErrorHandlingService for comprehensive error management.
 * This middleware serves as the Express integration layer for the error service.
 */

class ErrorHandlerMiddleware {
  constructor() {
    this.errorService = ErrorHandlingService;
    
    // Register application-specific error handlers if needed
    this.setupApplicationErrorHandlers();
  }

  /**
   * Setup application-specific error handlers
   */
  setupApplicationErrorHandlers() {
    // Register custom error handlers for application-specific errors
    // These will override or complement the default handlers in the service
    
    // Example: Custom business logic error handler
    this.errorService.registerErrorHandler('BusinessLogicError', (error, context) => ({
      httpStatus: 400,
      message: error.message || 'Business logic validation failed',
      severity: 'low',
      recoverable: true,
      suggestion: 'Please check your input and try again'
    }));
  }

  /**
   * Main error handler middleware
   */
  handle = async (error, req, res, next) => {
    try {
      // Build context from request
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

      // Use the error handling service
      const errorInfo = await this.errorService.handleError(error, context, {
        attemptRecovery: true
      });

      // Send response if not already sent
      if (!res.headersSent) {
        const responseData = {
          success: false,
          message: errorInfo.suggestion || errorInfo.message,
          errorId: errorInfo.id,
          timestamp: errorInfo.timestamp
        };

        // Include additional details in development
        if (process.env.NODE_ENV === 'development') {
          responseData.debug = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            classification: errorInfo.classification,
            severity: errorInfo.severity
          };
        }

        return res.status(errorInfo.httpStatus).json(responseData);
      }

    } catch (handlerError) {
      // Failsafe: if error handler itself fails
      Logger.error('Error handler middleware failed:', handlerError);
      return this.sendFailsafeResponse(res);
    }
  };

  /**
   * Get error handling service instance (for extension)
   */
  getErrorService() {
    return this.errorService;
  }

  /**
   * Register custom error handler (delegates to service)
   */
  registerErrorHandler(errorType, handler) {
    return this.errorService.registerErrorHandler(errorType, handler);
  }

  /**
   * Register recovery strategy (delegates to service)
   */
  registerRecoveryStrategy(errorType, strategy) {
    return this.errorService.registerRecoveryStrategy(errorType, strategy);
  }

  /**
   * Register alert callback (delegates to service)
   */
  registerAlertCallback(callback) {
    return this.errorService.registerAlertCallback(callback);
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
          errorId: `failsafe_${Date.now()}`,
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
   * Setup global error handlers (delegates to service)
   */
  setupGlobalHandlers() {
    // Setup global process error handlers
    process.on('uncaughtException', async (error) => {
      await this.errorService.handleError(error, {
        source: 'uncaughtException',
        pid: process.pid
      });

      // In production, exit gracefully after a delay
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    });

    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      
      await this.errorService.handleError(error, {
        source: 'unhandledRejection',
        promise: promise?.toString(),
        pid: process.pid
      });

      // In production, exit gracefully after a delay
      if (process.env.NODE_ENV === 'production') {
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    });
    
    Logger.info('🛡️ Global error handlers initialized');
  }
}

// Create instance
const errorHandlerMiddleware = new ErrorHandlerMiddleware();

// Setup global handlers
errorHandlerMiddleware.setupGlobalHandlers();

// Export the main handler and utility functions
module.exports = errorHandlerMiddleware.handle;
module.exports.asyncHandler = errorHandlerMiddleware.asyncHandler;
module.exports.errorHandlerService = ErrorHandlingService;
module.exports.errorHandlerMiddleware = errorHandlerMiddleware; 