const session = require('express-session');
const RedisStore = require('connect-redis').default;
const RedisService = require('../services/RedisService');
const config = require('../config/services');
const Logger = require('../helpers/Logger');

/**
 * Session Store Factory
 * Creates appropriate session store based on configuration and environment
 */
function createSessionStore() {
  // In testing environment, use memory store
  if (process.env.NODE_ENV === 'testing') {
    return new session.MemoryStore();
  }

  // Use Redis store if available, fallback to memory store
  if (RedisService.isEnabled && RedisService.client) {
    try {
      return new RedisStore({
        client: RedisService.client,
        prefix: 'sess:',
        ttl: parseInt(process.env.SESSION_MAX_AGE) || 86400000
      });
    } catch (error) {
      console.warn('Failed to create Redis session store, falling back to memory store:', error.message);
      return new session.MemoryStore();
    }
  }

  // Fallback to memory store
  console.warn('Redis not available, using memory store for sessions');
  return new session.MemoryStore();
}

/**
 * Session Configuration
 */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-key',
  name: process.env.SESSION_NAME || 'se_session',
  resave: process.env.SESSION_RESAVE === 'true',
  saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  store: createSessionStore()
};

/**
 * Session Middleware
 */
const sessionMiddleware = session(sessionConfig);

/**
 * Session Helper Functions
 */
class SessionHelpers {
  /**
   * Check if user is authenticated via session
   */
  static isAuthenticated(req) {
    return !!(req.session && req.session.user && req.session.user.id);
  }

  /**
   * Get session user
   */
  static getSessionUser(req) {
    return req.session?.user || null;
  }

  /**
   * Set session user
   */
  static setSessionUser(req, user) {
    if (!req.session) {
      throw new Error('Session not available');
    }
    
    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    };
    
    req.session.lastActivity = new Date().toISOString();
  }

  /**
   * Clear session user
   */
  static clearSessionUser(req) {
    if (req.session) {
      delete req.session.user;
      delete req.session.lastActivity;
    }
  }

  /**
   * Destroy session
   */
  static async destroySession(req) {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return resolve();
      }
      
      req.session.destroy((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Regenerate session ID
   */
  static async regenerateSession(req) {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        return reject(new Error('Session not available'));
      }
      
      req.session.regenerate((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get session info
   */
  static getSessionInfo(req) {
    if (!req.session) {
      return null;
    }
    
    return {
      id: req.sessionID,
      user: req.session.user || null,
      lastActivity: req.session.lastActivity || null,
      cookie: {
        maxAge: req.session.cookie.maxAge,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        sameSite: req.session.cookie.sameSite
      }
    };
  }

  /**
   * Update session activity
   */
  static updateActivity(req) {
    if (req.session) {
      req.session.lastActivity = new Date().toISOString();
    }
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(req) {
    if (!req.session || !req.session.lastActivity) {
      return false;
    }
    
    const lastActivity = new Date(req.session.lastActivity);
    const maxAge = req.session.cookie.maxAge || 86400000;
    const expired = Date.now() - lastActivity.getTime() > maxAge;
    
    return expired;
  }
}

/**
 * Session activity tracking middleware
 */
const sessionActivityMiddleware = async (req, res, next) => {
  try {
    if (SessionHelpers.isAuthenticated(req)) {
      // Update last activity timestamp asynchronously
      SessionHelpers.updateActivity(req);
    }
    next();
  } catch (error) {
    Logger.error('Session activity middleware error:', error);
    next(); // Continue even if session update fails
  }
};

/**
 * Session validation middleware
 */
const sessionValidationMiddleware = (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      // Check if session is expired based on last activity
      const lastActivity = new Date(req.session.lastActivity);
      const now = new Date();
      const maxInactivity = parseInt(process.env.SESSION_MAX_AGE) || 86400000;

      if (now - lastActivity > maxInactivity) {
        Logger.info(`Session expired for user: ${req.session.user.email}`);
        req.session.destroy();
        return res.status(401).json({
          success: false,
          message: 'Session expired due to inactivity'
        });
      }
    }
    next();
  } catch (error) {
    Logger.error('Session validation middleware error:', error);
    next(); // Continue even if validation fails
  }
};

module.exports = {
  sessionMiddleware,
  SessionHelpers,
  sessionActivityMiddleware,
  sessionValidationMiddleware,
  createSessionStore
}; 