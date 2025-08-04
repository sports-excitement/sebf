const Joi = require('joi');
const Response = require('../../../framework/helpers/Response');

/**
 * Validation Schemas
 * Define all validation schemas used throughout the application
 */
const schemas = {
  // User Registration Schema
  userRegistration: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
      }),
    bio: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    location: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Location cannot exceed 100 characters'
      })
  }),

  // User Login Schema
  userLogin: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    rememberMe: Joi.boolean()
      .optional()
      .default(false)
  }),

  // User Update Schema
  userUpdate: Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    bio: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    location: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Location cannot exceed 100 characters'
      }),
    isActive: Joi.boolean()
      .optional(),
    role: Joi.string()
      .valid('USER', 'ADMIN', 'MODERATOR', 'SUPERADMIN')
      .optional()
  }),

  // Profile Update Schema (for user's own profile)
  profileUpdate: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
      }),
    bio: Joi.string()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    location: Joi.string()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Location cannot exceed 100 characters'
      }),
    avatarUrl: Joi.string()
      .uri()
      .optional()
      .allow('')
      .messages({
        'string.uri': 'Please provide a valid URL for avatar'
      })
  }),

  // Password Change Schema
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required'
      })
  }),

  // Forgot Password Schema
  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  // Reset Password Schema
  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required'
      })
  }),

  // Notification Schema
  notification: Joi.object({
    type: Joi.string()
      .valid('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'SYSTEM', 'USER_ACTION')
      .required(),
    title: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Title is required',
        'string.max': 'Title cannot exceed 100 characters'
      }),
    message: Joi.string()
      .min(1)
      .max(500)
      .required()
      .messages({
        'string.min': 'Message is required',
        'string.max': 'Message cannot exceed 500 characters'
      }),
    data: Joi.object()
      .optional()
  }),

  // System Log Schema
  systemLog: Joi.object({
    level: Joi.string()
      .valid('ERROR', 'WARN', 'INFO', 'DEBUG')
      .required(),
    message: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Message is required',
        'string.max': 'Message cannot exceed 1000 characters'
      }),
    meta: Joi.object()
      .optional(),
    source: Joi.string()
      .max(100)
      .optional()
      .messages({
        'string.max': 'Source cannot exceed 100 characters'
      })
  }),

  // ID Parameter Schema
  idParam: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'ID must be a number',
        'number.integer': 'ID must be an integer',
        'number.positive': 'ID must be positive',
        'any.required': 'ID is required'
      })
  }),

  // Pagination Schema
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    sortBy: Joi.string()
      .optional()
      .default('createdAt'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .optional()
      .default('desc'),
    search: Joi.string()
      .optional()
      .allow('')
  })
};

/**
 * Validation Middleware Factory
 * Creates validation middleware for different parts of the request
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[property];
    
    if (!dataToValidate) {
      return res.status(400).json(
        Response.error(`No data provided in request ${property}`, 400)
      );
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json(
        Response.error('Validation failed', 400, {
          errors: errorDetails,
          validationError: true
        })
      );
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
}

/**
 * Validate Request Parameters
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

/**
 * Validate Query Parameters
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validate Request Headers
 */
function validateHeaders(schema) {
  return validate(schema, 'headers');
}

/**
 * Combined Validation Middleware
 * Validates multiple parts of the request at once
 */
function validateRequest(validationConfig) {
  return (req, res, next) => {
    const validations = [];

    // Validate each specified part
    if (validationConfig.body) {
      validations.push(['body', validationConfig.body]);
    }
    if (validationConfig.params) {
      validations.push(['params', validationConfig.params]);
    }
    if (validationConfig.query) {
      validations.push(['query', validationConfig.query]);
    }
    if (validationConfig.headers) {
      validations.push(['headers', validationConfig.headers]);
    }

    const errors = [];

    // Run all validations
    for (const [property, schema] of validations) {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: property === 'headers' // Allow unknown headers
      });

      if (error) {
        const propertyErrors = error.details.map(detail => ({
          property: property,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        errors.push(...propertyErrors);
      } else {
        // Update request with validated data
        req[property] = value;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        Response.error('Validation failed', 400, {
          errors: errors,
          validationError: true
        })
      );
    }

    next();
  };
}

/**
 * Sanitization helpers
 */
const sanitize = {
  /**
   * Remove HTML tags from string
   */
  stripTags: (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '');
  },

  /**
   * Escape HTML entities
   */
  escapeHtml: (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  /**
   * Trim whitespace and normalize
   */
  normalizeString: (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/\s+/g, ' ');
  }
};

/**
 * Pre-built validation middleware for common use cases
 */
const middlewares = {
  // User registration validation
  validateUserRegistration: validate(schemas.userRegistration),
  
  // User login validation
  validateUserLogin: validate(schemas.userLogin),
  
  // User update validation
  validateUserUpdate: validate(schemas.userUpdate),
  
  // Profile update validation
  validateProfileUpdate: validate(schemas.profileUpdate),
  
  // Password change validation
  validateChangePassword: validate(schemas.changePassword),
  
  // ID parameter validation
  validateIdParam: validateParams(schemas.idParam),
  
  // Pagination validation
  validatePagination: validateQuery(schemas.pagination),
  
  // Search validation (for query params)
  validateSearch: validateQuery(Joi.object({
    search: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.min': 'Search term must be at least 1 character',
        'string.max': 'Search term cannot exceed 100 characters'
      })
  })),
  
  // File upload validation (placeholder for now)
  validateFileUpload: validate(Joi.object({
    file: Joi.string()
      .optional(),
    maxSize: Joi.number()
      .optional()
      .default(5242880), // 5MB default
    allowedTypes: Joi.array()
      .items(Joi.string())
      .optional()
      .default(['image/jpeg', 'image/png', 'image/gif'])
  })),
  
  // Notification validation
  validateNotification: validate(schemas.notification),
  
  // System log validation
  validateSystemLog: validate(schemas.systemLog)
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
  validateHeaders,
  validateRequest,
  schemas,
  sanitize,
  middlewares,
  
  // Direct exports for convenience
  commonSchemas: schemas,
  validationBuilders: {
    body: validate,
    params: validateParams,
    query: validateQuery,
    headers: validateHeaders,
    request: validateRequest
  },
  sanitizers: sanitize,
  conditionalValidation: validateRequest,
  handleValidationErrors: (req, res, next) => {
    // This is handled internally by the validate function
    next();
  },
  
  // Express-validator style exports for compatibility
  body: validate,
  param: validateParams,  
  query: validateQuery,
  validationResult: (req) => {
    // Mock express-validator style result
    return {
      isEmpty: () => true,
      array: () => []
    };
  },
  checkSchema: validateRequest
}; 