/**
 * Server-Sent Events (SSE) Helper Functions
 * Provides clean abstractions for SSE response handling
 */
class SSEHelpers {
  /**
   * Initialize SSE connection with proper headers
   * @param {Object} res - Express response object
   * @param {Object} options - SSE configuration options
   */
  static initializeSSE(res, options = {}) {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      ...SSEHelpers.getCORSHeaders(options.cors)
    };

    // Add custom headers if provided
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    res.writeHead(200, headers);
    
    // Send initial connection message
    if (options.welcomeMessage !== false) {
      SSEHelpers.sendEvent(res, 'connected', {
        timestamp: new Date().toISOString(),
        connectionId: options.connectionId || SSEHelpers.generateConnectionId()
      });
    }

    return res;
  }

  /**
   * Send SSE event to client
   * @param {Object} res - Express response object
   * @param {string} eventType - Event type/name
   * @param {Object} data - Event data
   * @param {Object} options - Additional options
   */
  static sendEvent(res, eventType, data, options = {}) {
    try {
      const event = SSEHelpers.formatSSEMessage(eventType, data, options);
      res.write(event);
      return true;
    } catch (error) {
      console.error('SSE send error:', error);
      return false;
    }
  }

  /**
   * Send heartbeat/ping to keep connection alive
   * @param {Object} res - Express response object
   */
  static sendHeartbeat(res) {
    return SSEHelpers.sendEvent(res, 'heartbeat', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error event to client
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  static sendError(res, message, details = {}) {
    return SSEHelpers.sendEvent(res, 'error', {
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send notification event to client
   * @param {Object} res - Express response object
   * @param {Object} notification - Notification data
   */
  static sendNotification(res, notification) {
    return SSEHelpers.sendEvent(res, 'notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send user-specific event
   * @param {Object} res - Express response object
   * @param {string} action - User action type
   * @param {Object} data - Action data
   */
  static sendUserEvent(res, action, data) {
    return SSEHelpers.sendEvent(res, 'user_action', {
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send system event to client
   * @param {Object} res - Express response object
   * @param {string} type - System event type
   * @param {Object} data - Event data
   */
  static sendSystemEvent(res, type, data) {
    return SSEHelpers.sendEvent(res, 'system', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Close SSE connection gracefully
   * @param {Object} res - Express response object
   * @param {string} reason - Reason for closing
   */
  static closeConnection(res, reason = 'Connection closed') {
    try {
      SSEHelpers.sendEvent(res, 'close', {
        reason,
        timestamp: new Date().toISOString()
      });
      
      // Small delay to ensure message is sent
      setTimeout(() => {
        res.end();
      }, 100);
    } catch (error) {
      res.end();
    }
  }

  /**
   * Format SSE message according to SSE specification
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} options - Formatting options
   */
  static formatSSEMessage(eventType, data, options = {}) {
    let message = '';

    // Add event type
    if (eventType) {
      message += `event: ${eventType}\n`;
    }

    // Add event ID if provided
    if (options.id) {
      message += `id: ${options.id}\n`;
    }

    // Add retry interval if provided
    if (options.retry) {
      message += `retry: ${options.retry}\n`;
    }

    // Add data (can be multi-line)
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataLines = dataString.split('\n');
    
    dataLines.forEach(line => {
      message += `data: ${line}\n`;
    });

    // End with double newline
    message += '\n';

    return message;
  }

  /**
   * Get CORS headers for SSE
   * @param {Object} corsOptions - CORS configuration
   */
  static getCORSHeaders(corsOptions = {}) {
    const defaultOrigin = process.env.ALLOWED_ORIGINS?.split(',')[0] || '*';
    
    return {
      'Access-Control-Allow-Origin': corsOptions.origin || defaultOrigin,
      'Access-Control-Allow-Headers': corsOptions.headers || 'Cache-Control, Content-Type, Authorization',
      'Access-Control-Allow-Credentials': corsOptions.credentials || 'true'
    };
  }

  /**
   * Generate unique connection ID
   */
  static generateConnectionId() {
    return `sse_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Validate SSE connection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static validateSSEConnection(req, res) {
    // Check if client accepts text/event-stream
    const accept = req.headers.accept;
    if (accept && !accept.includes('text/event-stream')) {
      return {
        valid: false,
        error: 'Client must accept text/event-stream'
      };
    }

    // Check if connection is still alive
    if (res.destroyed || res.finished) {
      return {
        valid: false,
        error: 'Connection is closed'
      };
    }

    return { valid: true };
  }

  /**
   * Create SSE middleware for automatic connection handling
   * @param {Object} options - Middleware options
   */
  static createMiddleware(options = {}) {
    return (req, res, next) => {
      // Add SSE helper methods to response object
      res.sse = {
        init: (opts) => SSEHelpers.initializeSSE(res, { ...options, ...opts }),
        send: (event, data, opts) => SSEHelpers.sendEvent(res, event, data, opts),
        heartbeat: () => SSEHelpers.sendHeartbeat(res),
        error: (message, details) => SSEHelpers.sendError(res, message, details),
        notification: (notification) => SSEHelpers.sendNotification(res, notification),
        userEvent: (action, data) => SSEHelpers.sendUserEvent(res, action, data),
        systemEvent: (type, data) => SSEHelpers.sendSystemEvent(res, type, data),
        close: (reason) => SSEHelpers.closeConnection(res, reason)
      };

      next();
    };
  }

  /**
   * Handle SSE connection cleanup
   * @param {Object} req - Express request object
   * @param {Function} cleanupCallback - Cleanup function to call
   */
  static handleConnectionCleanup(req, cleanupCallback) {
    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE client disconnected');
      if (cleanupCallback) cleanupCallback();
    });

    req.on('aborted', () => {
      console.log('SSE client aborted connection');
      if (cleanupCallback) cleanupCallback();
    });

    // Handle process shutdown
    const shutdownHandler = () => {
      console.log('Server shutting down, closing SSE connections');
      if (cleanupCallback) cleanupCallback();
    };

    process.once('SIGTERM', shutdownHandler);
    process.once('SIGINT', shutdownHandler);
  }
}

module.exports = SSEHelpers; 