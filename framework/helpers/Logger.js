/**
 * Enhanced Logger Helper
 *
 * Provides consistent logging across the application with proper
 * environment-specific configuration and comprehensive test support.
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = format;
const config = require('../config/logging');

// Test log buffer for collecting logs during testing
let testLogBuffer = [];

// Custom format for better readability
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const logLine = `${timestamp} [${level.toUpperCase()}]: ${stack || message}${metaStr}`;
  
  // Buffer logs in testing environment for debugging
  if (process.env.NODE_ENV === 'testing') {
    testLogBuffer.push({
      timestamp,
      level: level.toUpperCase(),
      message: stack || message,
      meta,
      logLine
    });
    
    // Keep buffer size manageable
    if (testLogBuffer.length > 1000) {
      testLogBuffer = testLogBuffer.slice(-500);
    }
  }
  
  return logLine;
});

// Test-friendly format that always outputs
const testFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[TEST] ${timestamp} [${level.toUpperCase()}]: ${stack || message}${metaStr}`;
  })
);

// JSON format for production
const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Console format for development/testing
const consoleFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

// Determine if logging should be enabled in testing
const isTestLoggingEnabled = () => {
  return process.env.NODE_ENV === 'testing' && 
    (process.env.LOG_LEVEL === 'debug' || process.env.ENABLE_TEST_LOGGING === 'true');
};

// Create logger with environment-specific configuration
const logger = createLogger({
  level: config.level,
  format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
  transports: [],
  // Don't exit on handled exceptions
  exitOnError: false,
  // Enable logging in tests when explicitly requested
  silent: process.env.NODE_ENV === 'testing' && !isTestLoggingEnabled()
});

// Add appropriate transports based on environment
if (config.channel !== 'null') {
  // Console transport with environment-specific configuration
  const consoleTransport = new transports.Console({
    handleExceptions: true,
    handleRejections: true,
    // More intelligent test logging
    level: process.env.NODE_ENV === 'testing' ? 
      (isTestLoggingEnabled() ? 'debug' : 'warn') : 
      config.level,
    format: process.env.NODE_ENV === 'testing' && isTestLoggingEnabled() ? testFormat : undefined
  });

  logger.add(consoleTransport);
}

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    handleExceptions: true,
    handleRejections: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Enhanced logging methods for better DX
const enhancedLogger = {
  // Standard Winston methods with test-aware logging
  error: (message, meta = {}) => {
    logger.error(message, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        meta,
        logLine: `${new Date().toISOString()} [ERROR]: ${message}`
      });
    }
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        meta,
        logLine: `${new Date().toISOString()} [WARN]: ${message}`
      });
    }
  },
  
  info: (message, meta = {}) => {
    logger.info(message, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${message}`
      });
    }
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message,
        meta,
        logLine: `${new Date().toISOString()} [DEBUG]: ${message}`
      });
    }
  },
  
  verbose: logger.verbose.bind(logger),
  silly: logger.silly.bind(logger),
  
  // Custom methods for specific use cases with test-aware logging
  request: (message, meta = {}) => {
    const logMessage = `[REQUEST] ${message}`;
    logger.info(logMessage, meta);
    // Always capture in test buffer during testing
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${logMessage}`
      });
    }
  },
  
  response: (message, meta = {}) => {
    const logMessage = `[RESPONSE] ${message}`;
    logger.info(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${logMessage}`
      });
    }
  },
  
  security: (message, meta = {}) => {
    const logMessage = `[SECURITY] ${message}`;
    logger.warn(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [WARN]: ${logMessage}`
      });
    }
  },
  
  performance: (message, meta = {}) => {
    const logMessage = `[PERFORMANCE] ${message}`;
    logger.info(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${logMessage}`
      });
    }
  },
  
  database: (message, meta = {}) => {
    const logMessage = `[DATABASE] ${message}`;
    logger.debug(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [DEBUG]: ${logMessage}`
      });
    }
  },
  
  // Enhanced test-friendly logging
  test: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'testing') {
      if (isTestLoggingEnabled()) {
        logger.debug(`[TEST] ${message}`, meta);
      }
      // Always add to test buffer for debugging
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'TEST',
        message,
        meta,
        logLine: `[TEST] ${message} ${Object.keys(meta).length > 0 ? JSON.stringify(meta) : ''}`
      });
    }
  },
  
  // API-specific logging with test-aware capture
  api: (message, meta = {}) => {
    const logMessage = `[API] ${message}`;
    logger.info(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${logMessage}`
      });
    }
  },
  
  service: (message, meta = {}) => {
    const logMessage = `[SERVICE] ${message}`;
    logger.debug(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [DEBUG]: ${logMessage}`
      });
    }
  },
  
  middleware: (message, meta = {}) => {
    const logMessage = `[MIDDLEWARE] ${message}`;
    logger.debug(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'DEBUG',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [DEBUG]: ${logMessage}`
      });
    }
  },
  
  auth: (message, meta = {}) => {
    const logMessage = `[AUTH] ${message}`;
    logger.info(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [INFO]: ${logMessage}`
      });
    }
  },
  
  validation: (message, meta = {}) => {
    const logMessage = `[VALIDATION] ${message}`;
    logger.warn(logMessage, meta);
    if (process.env.NODE_ENV === 'testing') {
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message: logMessage,
        meta,
        logLine: `${new Date().toISOString()} [WARN]: ${logMessage}`
      });
    }
  },
  
  // Get the underlying Winston logger instance
  getLogger: () => logger,
  
  // Check if logging is enabled for a level
  isEnabled: (level) => logger.isLevelEnabled(level),
  
  // Check if test logging is enabled
  isTestLoggingEnabled,
  
  // Create child logger with default metadata
  child: (defaultMeta) => logger.child(defaultMeta),
  
  // Test utilities
  getTestLogs: () => [...testLogBuffer],
  
  clearTestLogs: () => {
    testLogBuffer = [];
  },
  
  getTestLogsByLevel: (level) => {
    return testLogBuffer.filter(log => log.level === level.toUpperCase());
  },
  
  getLastTestLog: () => {
    return testLogBuffer[testLogBuffer.length - 1] || null;
  },
  
  findTestLogs: (searchTerm) => {
    return testLogBuffer.filter(log => 
      log.message.includes(searchTerm) || 
      log.logLine.includes(searchTerm)
    );
  },
  
  // Force log in testing (bypasses silent mode)
  forceLog: (level, message, meta = {}) => {
    if (process.env.NODE_ENV === 'testing') {
      console.log(`[FORCE-${level.toUpperCase()}] ${message}`, meta);
      testLogBuffer.push({
        timestamp: new Date().toISOString(),
        level: `FORCE-${level.toUpperCase()}`,
        message,
        meta,
        logLine: `[FORCE-${level.toUpperCase()}] ${message}`
      });
    } else {
      logger.log(level, message, meta);
    }
  },
  
  // Development helpers
  trace: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development' || isTestLoggingEnabled()) {
      const stack = new Error().stack;
      logger.debug(`[TRACE] ${message}`, { ...meta, stack });
    }
  },
  
  timing: (label) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        logger.debug(`[TIMING] ${label}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }
};

module.exports = enhancedLogger; 