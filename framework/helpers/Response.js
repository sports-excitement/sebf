/**
 * Enhanced Response Helper
 * 
 * Provides standardized API response formats for consistent
 * communication between frontend and backend with enhanced
 * testing and debugging support.
 */

const Logger = require('./Logger');

class ResponseHelper {
  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Powered-By': 'Sports Excitement Framework'
    };
    
    // Track response metrics in development/testing
    this.metrics = {
      total: 0,
      success: 0,
      error: 0,
      byStatus: {},
      startTime: Date.now()
    };
    
    // Test responses buffer for debugging
    this.testResponses = [];
  }

  /**
   * Track response metrics
   */
  trackMetrics(statusCode, success, message = '', responseData = null) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'testing') {
      this.metrics.total++;
      this.metrics[success ? 'success' : 'error']++;
      
      if (!this.metrics.byStatus[statusCode]) {
        this.metrics.byStatus[statusCode] = 0;
      }
      this.metrics.byStatus[statusCode]++;
      
      // Log response for debugging
      const logMessage = `Response ${statusCode}: ${message}`;
      if (success) {
        Logger.response(logMessage, { statusCode, success, hasData: !!responseData });
      } else {
        Logger.response(logMessage, { statusCode, success, error: responseData });
      }
      
      // Store test responses for debugging
      if (process.env.NODE_ENV === 'testing') {
        this.testResponses.push({
          timestamp: new Date().toISOString(),
          statusCode,
          success,
          message,
          data: responseData
        });
        
        // Keep buffer manageable
        if (this.testResponses.length > 500) {
          this.testResponses = this.testResponses.slice(-250);
        }
      }
    }
  }

  /**
   * Set default headers on response
   */
  setDefaultHeaders(res) {
    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      if (!res.get(key)) {
        res.setHeader(key, value);
      }
    });
  }
  /**
   * Send a successful response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {*} data - Response data
   * @param {Number} statusCode - HTTP status code (default: 200)
   */
  success(res, message = 'Success', data = null, statusCode = 200) {
    this.setDefaultHeaders(res);
    this.trackMetrics(statusCode, true, message, data);
    
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Add debug info in development/testing
    if (process.env.NODE_ENV === 'development' || (process.env.NODE_ENV === 'testing' && Logger.isTestLoggingEnabled())) {
      response.debug = {
        statusCode,
        responseTime: res.get('X-Response-Time'),
        requestId: res.get('X-Request-ID')
      };
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {*} error - Error details
   * @param {Number} statusCode - HTTP status code (default: 500)
   */
  error(res, message = 'An error occurred', error = null, statusCode = 500) {
    this.setDefaultHeaders(res);
    this.trackMetrics(statusCode, false, message, error);
    
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    // Include error details in development and testing
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'testing') && error) {
      response.error = error;
    }

    // Add debug info in development/testing
    if (process.env.NODE_ENV === 'development' || (process.env.NODE_ENV === 'testing' && Logger.isTestLoggingEnabled())) {
      response.debug = {
        statusCode,
        responseTime: res.get('X-Response-Time'),
        requestId: res.get('X-Request-ID'),
        stack: error?.stack
      };
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {String} message - Validation error message
   * @param {Array} errors - Array of validation errors
   */
  validationError(res, message = 'Validation failed', errors = []) {
    this.setDefaultHeaders(res);
    this.trackMetrics(422, false, message, errors);
    
    return res.status(422).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a not found response
   * @param {Object} res - Express response object
   * @param {String} message - Not found message
   */
  notFound(res, message = 'Resource not found') {
    this.setDefaultHeaders(res);
    this.trackMetrics(404, false, message);
    
    return res.status(404).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send an unauthorized response
   * @param {Object} res - Express response object
   * @param {String} message - Unauthorized message
   */
  unauthorized(res, message = 'Unauthorized') {
    this.setDefaultHeaders(res);
    this.trackMetrics(401, false, message);
    
    return res.status(401).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a forbidden response
   * @param {Object} res - Express response object
   * @param {String} message - Forbidden message
   */
  forbidden(res, message = 'Forbidden') {
    this.setDefaultHeaders(res);
    this.trackMetrics(403, false, message);
    
    return res.status(403).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a bad request response
   * @param {Object} res - Express response object
   * @param {String} message - Bad request message
   * @param {*} details - Additional details
   */
  badRequest(res, message = 'Bad request', details = null) {
    this.setDefaultHeaders(res);
    this.trackMetrics(400, false, message, details);
    
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return res.status(400).json(response);
  }

  /**
   * Send an internal server error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {*} error - Error details
   */
  internalServerError(res, message = 'Internal server error', error = null) {
    return this.error(res, message, error, 500);
  }

  /**
   * Send a service unavailable response
   * @param {Object} res - Express response object
   * @param {String} message - Service unavailable message
   */
  serviceUnavailable(res, message = 'Service unavailable') {
    return res.status(503).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a too many requests response
   * @param {Object} res - Express response object
   * @param {String} message - Rate limit message
   */
  tooManyRequests(res, message = 'Too many requests') {
    return res.status(429).json({
      success: false,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a conflict response
   * @param {Object} res - Express response object
   * @param {String} message - Conflict message
   * @param {*} details - Additional details
   */
  conflict(res, message = 'Conflict', details = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return res.status(409).json(response);
  }

  /**
   * Send a created response
   * @param {Object} res - Express response object
   * @param {String} message - Created message
   * @param {*} data - Created resource data
   */
  created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, message, data, 201);
  }

  /**
   * Send a no content response
   * @param {Object} res - Express response object
   */
  noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send a custom response
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {String} message - Response message
   * @param {*} data - Response data
   * @param {Boolean} success - Success flag
   */
  custom(res, statusCode, message, data = null, success = true) {
    const response = {
      success,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send a paginated response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination metadata
   */
  paginated(res, message = 'Success', data = [], pagination = {}) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || data.length,
        totalPages: pagination.totalPages || Math.ceil((pagination.total || data.length) / (pagination.limit || 10)),
        hasNext: pagination.hasNext || false,
        hasPrev: pagination.hasPrev || false
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a response with metadata
   * @param {Object} res - Express response object
   * @param {String} message - Response message
   * @param {*} data - Response data
   * @param {Object} meta - Metadata
   * @param {Number} statusCode - HTTP status code
   */
  withMeta(res, message, data, meta = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: statusCode < 400,
      message,
      data,
      meta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send a file download response
   * @param {Object} res - Express response object
   * @param {String} filePath - Path to file
   * @param {String} filename - Download filename
   */
  download(res, filePath, filename = null) {
    if (filename) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    return res.download(filePath);
  }

  /**
   * Send a redirect response
   * @param {Object} res - Express response object
   * @param {String} url - URL to redirect to
   * @param {Number} statusCode - HTTP status code (default: 302)
   */
  redirect(res, url, statusCode = 302) {
    return res.redirect(statusCode, url);
  }

  // Legacy method names for backward compatibility
  validation(res, message, data) {
    return this.validationError(res, message, data.errors || data);
  }

  /**
   * Get response metrics (for testing/debugging)
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime
    };
  }

  /**
   * Clear metrics (useful for testing)
   */
  clearMetrics() {
    this.metrics = {
      total: 0,
      success: 0,
      error: 0,
      byStatus: {},
      startTime: Date.now()
    };
    this.testResponses = [];
  }
  
  /**
   * Get test responses (for debugging)
   */
  getTestResponses() {
    return [...this.testResponses];
  }
  
  /**
   * Get test responses by status code
   */
  getTestResponsesByStatus(statusCode) {
    return this.testResponses.filter(response => response.statusCode === statusCode);
  }
  
  /**
   * Get last test response
   */
  getLastTestResponse() {
    return this.testResponses[this.testResponses.length - 1] || null;
  }
  
  /**
   * Find test responses by message
   */
  findTestResponses(searchTerm) {
    return this.testResponses.filter(response => 
      response.message.includes(searchTerm)
    );
  }
  
  /**
   * Clear test responses buffer
   */
  clearTestResponses() {
    this.testResponses = [];
  }

  /**
   * Set custom default headers
   */
  setDefaultHeader(key, value) {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove default header
   */
  removeDefaultHeader(key) {
    delete this.defaultHeaders[key];
  }

  /**
   * Test helper - create a mock response object for testing
   */
  createMockResponse() {
    const headers = {};
    const sentData = { json: null, status: 200 };
    
    // Detect Jest or other testing frameworks
    const isJest = typeof jest !== 'undefined';
    const isMocha = typeof global.it === 'function';
    const isTesting = process.env.NODE_ENV === 'testing' || isJest || isMocha;
    
    const response = {
      statusCode: 200,
      headers,
      sentData,
      
      json: isTesting && isJest 
        ? jest.fn().mockImplementation((data) => {
            sentData.json = data;
            Logger.test('Mock response sent', { statusCode: response.statusCode, data });
            return response;
          })
        : function(data) { 
            sentData.json = data;
            if (isTesting) {
              console.log('[MOCK RESPONSE]', { statusCode: this.statusCode, data });
            }
            return response; 
          },
          
      status: isTesting && isJest 
        ? jest.fn().mockImplementation((code) => {
            response.statusCode = code;
            sentData.status = code;
            return response;
          })
        : function(code) { 
            this.statusCode = code;
            sentData.status = code;
            return this; 
          },
          
      setHeader: isTesting && isJest 
        ? jest.fn().mockImplementation((key, value) => {
            headers[key] = value;
          })
        : function(key, value) { headers[key] = value; },
        
      get: isTesting && isJest 
        ? jest.fn().mockImplementation((key) => headers[key])
        : function(key) { return headers[key]; },
        
      send: isTesting && isJest 
        ? jest.fn().mockImplementation((data) => {
            sentData.json = data;
            return response;
          })
        : function(data) { 
            sentData.json = data;
            return response; 
          },
          
      end: isTesting && isJest ? jest.fn().mockReturnThis() : function() { return this; },
      redirect: isTesting && isJest ? jest.fn().mockReturnThis() : function(url) { return this; },
      download: isTesting && isJest ? jest.fn().mockReturnThis() : function(path) { return this; }
    };

    return response;
  }

  /**
   * Test helper - validate response structure
   */
  validateResponseStructure(response, expectedSuccess = true) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be an object');
    }

    if (typeof response.success !== 'boolean') {
      throw new Error('Response must have a boolean success property');
    }

    if (response.success !== expectedSuccess) {
      throw new Error(`Expected success to be ${expectedSuccess}, got ${response.success}`);
    }

    if (typeof response.message !== 'string') {
      throw new Error('Response must have a string message property');
    }

    if (!response.timestamp || typeof response.timestamp !== 'string') {
      throw new Error('Response must have a valid timestamp');
    }

    return true;
  }
}

// Create singleton instance
const Response = new ResponseHelper();

module.exports = Response; 