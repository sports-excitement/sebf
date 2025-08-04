const Response = require('./Response');
const Logger = require('./Logger');
const { asyncHandler } = require('../Http/Middleware/ErrorHandler');

/**
 * API Helpers and Decorators
 * 
 * Provides utility functions, decorators, and helpers for better API development.
 */

class ApiHelpers {
  /**
   * Async route handler wrapper
   * Automatically catches async errors and passes them to error handler
   */
  static asyncRoute(fn) {
    return asyncHandler(fn);
  }

  /**
   * Cache decorator for route handlers
   * @param {number} ttl - Time to live in seconds
   * @param {function} keyGenerator - Function to generate cache key
   */
  static cache(ttl = 300, keyGenerator = null) {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(req, res, next) {
        try {
          const cacheKey = keyGenerator ? keyGenerator(req) : `${req.originalUrl}_${JSON.stringify(req.query)}`;
          
          // Try to get from cache (if Redis is available)
          // This would integrate with RedisService
          
          // For now, just call the original method
          return await originalMethod.apply(this, [req, res, next]);
        } catch (error) {
          next(error);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Rate limiting decorator
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  static rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      const requestCounts = new Map();
      
      descriptor.value = async function(req, res, next) {
        try {
          const key = req.ip || 'unknown';
          const now = Date.now();
          
          if (!requestCounts.has(key)) {
            requestCounts.set(key, []);
          }
          
          const requests = requestCounts.get(key);
          const validRequests = requests.filter(time => now - time < windowMs);
          
          if (validRequests.length >= maxRequests) {
            return Response.tooManyRequests(res, 'Rate limit exceeded');
          }
          
          validRequests.push(now);
          requestCounts.set(key, validRequests);
          
          return await originalMethod.apply(this, [req, res, next]);
        } catch (error) {
          next(error);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Validation decorator
   * @param {object} schema - Validation schema
   */
  static validate(schema) {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(req, res, next) {
        try {
          // Validate request data against schema
          const validationResult = ApiHelpers.validateData(req.body, schema);
          
          if (!validationResult.isValid) {
            return Response.validationError(res, 'Validation failed', validationResult.errors);
          }
          
          return await originalMethod.apply(this, [req, res, next]);
        } catch (error) {
          next(error);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Authorization decorator
   * @param {string|array} roles - Required roles
   */
  static authorize(roles) {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(req, res, next) {
        try {
          if (!req.user) {
            return Response.unauthorized(res, 'Authentication required');
          }
          
          const userRoles = req.user.roles || [];
          const requiredRoles = Array.isArray(roles) ? roles : [roles];
          const hasRole = requiredRoles.some(role => userRoles.includes(role));
          
          if (!hasRole) {
            return Response.forbidden(res, 'Insufficient permissions');
          }
          
          return await originalMethod.apply(this, [req, res, next]);
        } catch (error) {
          next(error);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Logging decorator
   * @param {string} level - Log level
   */
  static log(level = 'info') {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(req, res, next) {
        const startTime = Date.now();
        
        Logger[level](`${propertyName} called`, {
          method: req.method,
          url: req.originalUrl,
          user: req.user?.id || 'anonymous',
          timestamp: new Date().toISOString()
        });
        
        try {
          const result = await originalMethod.apply(this, [req, res, next]);
          
          const endTime = Date.now();
          Logger[level](`${propertyName} completed`, {
            duration: endTime - startTime,
            statusCode: res.statusCode
          });
          
          return result;
        } catch (error) {
          const endTime = Date.now();
          Logger.error(`${propertyName} failed`, {
            duration: endTime - startTime,
            error: error.message
          });
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Timing decorator
   * Adds execution time to response headers
   */
  static timing() {
    return function(target, propertyName, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(req, res, next) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, [req, res, next]);
          
          const endTime = Date.now();
          res.setHeader('X-Response-Time', `${endTime - startTime}ms`);
          
          return result;
        } catch (error) {
          const endTime = Date.now();
          res.setHeader('X-Response-Time', `${endTime - startTime}ms`);
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Data validation utility
   * @param {object} data - Data to validate
   * @param {object} schema - Validation schema
   */
  static validateData(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // Required validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} is required`,
          code: 'REQUIRED'
        });
        continue;
      }
      
      // Skip further validation if field is not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }
      
      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push({
          field,
          message: `${field} must be of type ${rules.type}`,
          code: 'INVALID_TYPE'
        });
      }
      
      // Length validation for strings
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.minLength} characters long`,
            code: 'MIN_LENGTH'
          });
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({
            field,
            message: `${field} must be no more than ${rules.maxLength} characters long`,
            code: 'MAX_LENGTH'
          });
        }
      }
      
      // Number validation
      if (typeof value === 'number') {
        if (rules.min && value < rules.min) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.min}`,
            code: 'MIN_VALUE'
          });
        }
        
        if (rules.max && value > rules.max) {
          errors.push({
            field,
            message: `${field} must be no more than ${rules.max}`,
            code: 'MAX_VALUE'
          });
        }
      }
      
      // Email validation
      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({
          field,
          message: `${field} must be a valid email address`,
          code: 'INVALID_EMAIL'
        });
      }
      
      // URL validation
      if (rules.url) {
        try {
          new URL(value);
        } catch {
          errors.push({
            field,
            message: `${field} must be a valid URL`,
            code: 'INVALID_URL'
          });
        }
      }
      
      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rules.enum.join(', ')}`,
          code: 'INVALID_ENUM'
        });
      }
      
      // Custom validation
      if (rules.custom && typeof rules.custom === 'function') {
        try {
          const customResult = rules.custom(value, data);
          if (customResult !== true) {
            errors.push({
              field,
              message: customResult || `${field} is invalid`,
              code: 'CUSTOM_VALIDATION'
            });
          }
        } catch (error) {
          errors.push({
            field,
            message: error.message || `${field} validation failed`,
            code: 'CUSTOM_VALIDATION_ERROR'
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Pagination helper
   * @param {object} query - Query parameters
   * @param {number} defaultLimit - Default page size
   * @param {number} maxLimit - Maximum page size
   */
  static parsePagination(query, defaultLimit = 10, maxLimit = 100) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
    const offset = (page - 1) * limit;
    
    return {
      page,
      limit,
      offset,
      skip: offset // Alias for different ORMs
    };
  }

  /**
   * Sorting helper
   * @param {object} query - Query parameters
   * @param {array} allowedFields - Fields that can be sorted
   * @param {string} defaultSort - Default sort field
   */
  static parseSort(query, allowedFields = [], defaultSort = 'createdAt') {
    const sortBy = query.sortBy || defaultSort;
    const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Validate sort field
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      throw new Error(`Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`);
    }
    
    return {
      sortBy,
      sortOrder,
      orderBy: { [sortBy]: sortOrder } // For Prisma
    };
  }

  /**
   * Search helper
   * @param {object} query - Query parameters
   * @param {array} searchFields - Fields to search in
   */
  static parseSearch(query, searchFields = []) {
    const searchTerm = query.search || query.q;
    
    if (!searchTerm || searchFields.length === 0) {
      return null;
    }
    
    // Create search conditions for different ORMs
    return {
      searchTerm,
      searchFields,
      // Prisma format
      OR: searchFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }))
    };
  }

  /**
   * Filter helper
   * @param {object} query - Query parameters
   * @param {array} allowedFilters - Allowed filter fields
   */
  static parseFilters(query, allowedFilters = []) {
    const filters = {};
    
    for (const field of allowedFilters) {
      if (query[field] !== undefined) {
        filters[field] = query[field];
      }
    }
    
    return filters;
  }

  /**
   * Request sanitizer
   * @param {object} data - Data to sanitize
   * @param {array} allowedFields - Fields to keep
   */
  static sanitizeInput(data, allowedFields) {
    if (!allowedFields || allowedFields.length === 0) {
      return data;
    }
    
    const sanitized = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    }
    
    return sanitized;
  }

  /**
   * Response transformer
   * @param {*} data - Data to transform
   * @param {object} options - Transform options
   */
  static transformResponse(data, options = {}) {
    if (!data) return data;
    
    const { exclude = [], include = null, transform = {} } = options;
    
    if (Array.isArray(data)) {
      return data.map(item => this.transformResponse(item, options));
    }
    
    if (typeof data === 'object') {
      const result = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip excluded fields
        if (exclude.includes(key)) {
          continue;
        }
        
        // Only include specified fields if include array is provided
        if (include && !include.includes(key)) {
          continue;
        }
        
        // Apply field transformations
        if (transform[key]) {
          result[key] = transform[key](value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    }
    
    return data;
  }

  /**
   * API versioning helper
   * @param {object} req - Request object
   */
  static getApiVersion(req) {
    // Check header first
    if (req.headers['api-version']) {
      return req.headers['api-version'];
    }
    
    // Check query parameter
    if (req.query.version) {
      return req.query.version;
    }
    
    // Check URL path
    const pathMatch = req.path.match(/^\/api\/v(\d+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // Default version
    return '1';
  }

  /**
   * Request context helper
   * @param {object} req - Request object
   */
  static getRequestContext(req) {
    return {
      requestId: req.requestId,
      userId: req.user?.id || null,
      userEmail: req.user?.email || null,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      apiVersion: this.getApiVersion(req),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Performance timing utility
   */
  static createTimer() {
    const start = process.hrtime.bigint();
    
    return {
      end: () => {
        const end = process.hrtime.bigint();
        return Number(end - start) / 1000000; // Convert to milliseconds
      }
    };
  }

  /**
   * Health check utility
   * @param {array} services - Services to check
   */
  static async checkHealth(services = []) {
    const results = {};
    
    for (const service of services) {
      try {
        const timer = this.createTimer();
        const health = await service.testConnection();
        const responseTime = timer.end();
        
        results[service.constructor.name.toLowerCase()] = {
          ...health,
          responseTime: `${responseTime.toFixed(2)}ms`
        };
      } catch (error) {
        results[service.constructor.name.toLowerCase()] = {
          status: 'error',
          message: error.message,
          responseTime: 'N/A'
        };
      }
    }
    
    return results;
  }
}

module.exports = ApiHelpers; 