/**
 * Response Helper
 * 
 * Provides standardized API response formats for consistent
 * communication between frontend and Core.
 */

class ResponseHelper {
  /**
   * Send a successful response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {*} data - Response data
   * @param {Number} statusCode - HTTP status code (default: 200)
   */
  success(res, message = 'Success', data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {*} error - Error details
   * @param {Number} statusCode - HTTP status code (default: 500)
   */
  error(res, message = 'An error occurred', error = null, statusCode = 500) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    // Only include error details in development
    if (process.env.NODE_ENV === 'development' && error) {
      response.error = error;
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
}

// Create singleton instance
const Response = new ResponseHelper();

module.exports = Response; 