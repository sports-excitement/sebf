/**
 * Middleware Index
 * 
 * This file exports all middleware functions for easy importing
 * throughout the application.
 */

const { 
  authenticate, 
  optionalAuth, 
  requireRole, 
  requirePermission, 
  adminOnly, 
  verifiedOnly, 
  userRateLimit,
  healthAuth,
  authService 
} = require('./Auth');

const errorHandler = require('../../../framework/middleware/ErrorHandler');

const { 
  validateRequest, 
  handleValidationErrors,
  commonSchemas, 
  validationBuilders,
  sanitizers,
  conditionalValidation,
  middlewares: validationMiddlewares,
  body,
  param,
  query,
  validationResult,
  checkSchema
} = require('./Validation');

const { 
  sessionMiddleware, 
  SessionHelpers,
  sessionActivityMiddleware,
  sessionValidationMiddleware
} = require('../../../framework/middleware/Session');

module.exports = {
  // Authentication & Authorization
  auth: authenticate,
  authenticate,
  optionalAuth,
  requireRole,
  requirePermission,
  adminOnly,
  verifiedOnly,
  userRateLimit,
  healthAuth,
  authService,

  // Session management
  session: sessionMiddleware,
  sessionMiddleware,
  SessionHelpers,
  sessionActivity: sessionActivityMiddleware,
  sessionValidation: sessionValidationMiddleware,

  // Validation
  validate: validateRequest,
  validateRequest,
  handleValidationErrors,
  schemas: commonSchemas,
  commonSchemas,
  validationBuilders,
  sanitizers,
  conditionalValidation,
  
  // Pre-built validation middleware
  validateUserRegistration: validationMiddlewares.validateUserRegistration,
  validateUserLogin: validationMiddlewares.validateUserLogin,
  validateUserUpdate: validationMiddlewares.validateUserUpdate,
  validateIdParam: validationMiddlewares.validateIdParam,
  validatePagination: validationMiddlewares.validatePagination,
  validateSearch: validationMiddlewares.validateSearch,
  validateFileUpload: validationMiddlewares.validateFileUpload,

  // Express-validator exports for direct use
  body,
  param,
  query,
  validationResult,
  checkSchema,

  // Error handling
  errorHandler,

  // Legacy exports for backward compatibility
  validateUser: validationMiddlewares.validateUserRegistration,
  validateLogin: validationMiddlewares.validateUserLogin,
  validateUserUpdate: validationMiddlewares.validateUserUpdate
}; 