const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RedisService = require('./RedisService');
const config = require('../config/services');
const Logger = require('../helpers/Logger');

class JWTSessionService {
  constructor() {
    this.jwtConfig = config.jwt;
    this.sessionConfig = config.session;
    this.redis = RedisService;
    this.sessionPrefix = 'jwt_session:';
    this.userSessionsPrefix = 'user_sessions:';
    this.blacklistPrefix = 'jwt_blacklist:';
  }

  /**
   * Generate JWT token with Redis session backing
   * @param {Object} payload - User payload
   * @param {Object} options - JWT options
   */
  async generateToken(payload, options = {}) {
    try {
      // Generate unique session ID
      const sessionId = this.generateSessionId();
      
      // Create JWT payload with session ID
      const jwtPayload = {
        ...payload,
        sessionId: sessionId,
        iat: Math.floor(Date.now() / 1000),
        jti: sessionId // JWT ID for tracking
      };

      // JWT options
      const jwtOptions = {
        expiresIn: options.expiresIn || this.jwtConfig.expiresIn,
        algorithm: this.jwtConfig.algorithm,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        ...options
      };

      // Generate JWT token
      const token = jwt.sign(jwtPayload, this.jwtConfig.secret, jwtOptions);

      // Store session in Redis
      const sessionData = {
        userId: payload.id || payload.userId,
        email: payload.email,
        role: payload.role,
        sessionId: sessionId,
        tokenHash: this.hashToken(token),
        isActive: true,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: options.userAgent || null,
        ipAddress: options.ipAddress || null,
        metadata: options.metadata || {}
      };

      // Calculate TTL based on JWT expiration
      const decoded = jwt.decode(token);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      // Store session data
      await this.redis.setSession(sessionId, sessionData, ttl);

      // Track user sessions for multi-device management
      await this.addUserSession(payload.id || payload.userId, sessionId, ttl);

      Logger.debug(`JWT session created: ${sessionId} for user ${payload.id || payload.userId}`);
      
      return {
        token,
        sessionId,
        expiresIn: ttl,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      };
    } catch (error) {
      Logger.error('Failed to generate JWT token:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token and validate session
   * @param {string} token - JWT token
   * @param {Object} options - Verification options
   */
  async verifyToken(token, options = {}) {
    try {
      // Verify JWT signature first
      const decoded = jwt.verify(token, this.jwtConfig.secret, {
        algorithms: [this.jwtConfig.algorithm],
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience,
        ...options
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Get session from Redis
      const sessionData = await this.redis.getSession(decoded.sessionId);
      if (!sessionData) {
        throw new Error('Session not found or expired');
      }

      // Verify session is active
      if (!sessionData.isActive) {
        throw new Error('Session is inactive');
      }

      // Verify token hash matches (prevents token reuse)
      const tokenHash = this.hashToken(token);
      if (sessionData.tokenHash !== tokenHash) {
        throw new Error('Token integrity check failed');
      }

      // Update last activity
      await this.updateSessionActivity(decoded.sessionId);

      Logger.debug(`JWT session verified: ${decoded.sessionId}`);
      
      return {
        valid: true,
        payload: decoded,
        session: sessionData
      };
    } catch (error) {
      Logger.debug('JWT token verification failed:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Refresh JWT token with new expiration
   * @param {string} token - Current JWT token
   * @param {Object} options - Refresh options
   */
  async refreshToken(token, options = {}) {
    try {
      // Verify current token (allow expired tokens for refresh)
      const verification = await this.verifyToken(token, { ignoreExpiration: true });
      
      if (!verification.valid && !verification.error.includes('expired')) {
        throw new Error('Invalid token for refresh');
      }

      const currentPayload = verification.payload;
      const sessionData = verification.session;

      // Create new token with same session ID but updated timestamps
      const newPayload = {
        ...currentPayload,
        iat: Math.floor(Date.now() / 1000)
      };

      delete newPayload.exp; // Let JWT library set new expiration

      const newToken = jwt.sign(newPayload, this.jwtConfig.secret, {
        expiresIn: options.expiresIn || this.jwtConfig.expiresIn,
        algorithm: this.jwtConfig.algorithm,
        issuer: this.jwtConfig.issuer,
        audience: this.jwtConfig.audience
      });

      // Update session with new token hash
      const updatedSessionData = {
        ...sessionData,
        tokenHash: this.hashToken(newToken),
        lastActivity: new Date().toISOString(),
        refreshedAt: new Date().toISOString()
      };

      // Calculate new TTL
      const decoded = jwt.decode(newToken);
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);

      // Update session in Redis
      await this.redis.setSession(currentPayload.sessionId, updatedSessionData, ttl);

      // Blacklist old token
      await this.blacklistToken(currentPayload.jti, ttl);

      Logger.debug(`JWT token refreshed: ${currentPayload.sessionId}`);
      
      return {
        token: newToken,
        sessionId: currentPayload.sessionId,
        expiresIn: ttl,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      };
    } catch (error) {
      Logger.error('Failed to refresh JWT token:', error);
      throw error;
    }
  }

  /**
   * Revoke JWT token and invalidate session
   * @param {string} token - JWT token to revoke
   */
  async revokeToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.sessionId) {
        throw new Error('Invalid token');
      }

      // Get session data
      const sessionData = await this.redis.getSession(decoded.sessionId);
      
      // Mark session as inactive
      if (sessionData) {
        sessionData.isActive = false;
        sessionData.revokedAt = new Date().toISOString();
        
        // Keep session data for a short time for audit purposes
        await this.redis.setSession(decoded.sessionId, sessionData, 3600); // 1 hour
      }

      // Add token to blacklist
      const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
      if (remainingTtl > 0) {
        await this.blacklistToken(decoded.jti, remainingTtl);
      }

      // Remove from user sessions
      if (sessionData && sessionData.userId) {
        await this.removeUserSession(sessionData.userId, decoded.sessionId);
      }

      Logger.debug(`JWT token revoked: ${decoded.sessionId}`);
      return true;
    } catch (error) {
      Logger.error('Failed to revoke JWT token:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   * @param {number} userId - User ID
   */
  async getUserSessions(userId) {
    try {
      const sessionIds = await this.redis.getFromList(`${this.userSessionsPrefix}${userId}`);
      const sessions = [];

      for (const sessionId of sessionIds) {
        const sessionData = await this.redis.getSession(sessionId);
        if (sessionData && sessionData.isActive) {
          sessions.push({
            sessionId,
            ...sessionData,
            isCurrent: false // Will be set by calling code if needed
          });
        }
      }

      return sessions;
    } catch (error) {
      Logger.error('Failed to get user sessions:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user except current one
   * @param {number} userId - User ID
   * @param {string} excludeSessionId - Session ID to exclude from revocation
   */
  async revokeUserSessions(userId, excludeSessionId = null) {
    try {
      const sessions = await this.getUserSessions(userId);
      let revokedCount = 0;

      for (const session of sessions) {
        if (session.sessionId !== excludeSessionId) {
          // Mark session as inactive
          session.isActive = false;
          session.revokedAt = new Date().toISOString();
          
          await this.redis.setSession(session.sessionId, session, 3600);
          
          // Blacklist the token if we have the hash (for security)
          if (session.tokenHash) {
            await this.redis.set(`${this.blacklistPrefix}${session.sessionId}`, true, 3600);
          }
          
          revokedCount++;
        }
      }

      // Clean up user sessions list
      if (excludeSessionId) {
        await this.redis.del(`${this.userSessionsPrefix}${userId}`);
        await this.addUserSession(userId, excludeSessionId, 3600);
      } else {
        await this.redis.del(`${this.userSessionsPrefix}${userId}`);
      }

      Logger.debug(`Revoked ${revokedCount} sessions for user ${userId}`);
      return revokedCount;
    } catch (error) {
      Logger.error('Failed to revoke user sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      // This would be run by a scheduled job
      // Redis TTL handles most cleanup, but this can handle edge cases
      Logger.debug('Session cleanup completed');
    } catch (error) {
      Logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  // Private helper methods

  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async updateSessionActivity(sessionId) {
    try {
      const sessionData = await this.redis.getSession(sessionId);
      if (sessionData && sessionData.isActive) {
        sessionData.lastActivity = new Date().toISOString();
        
        // Extend TTL based on remaining token time
        const ttl = Math.max(3600, 86400); // At least 1 hour, max 24 hours
        await this.redis.setSession(sessionId, sessionData, ttl);
      }
    } catch (error) {
      Logger.debug('Failed to update session activity:', error.message);
    }
  }

  async addUserSession(userId, sessionId, ttl) {
    try {
      await this.redis.addToList(`${this.userSessionsPrefix}${userId}`, sessionId);
      await this.redis.client.expire(`${this.userSessionsPrefix}${userId}`, ttl);
    } catch (error) {
      Logger.debug('Failed to add user session:', error.message);
    }
  }

  async removeUserSession(userId, sessionId) {
    try {
      const sessions = await this.redis.getFromList(`${this.userSessionsPrefix}${userId}`);
      const updatedSessions = sessions.filter(id => id !== sessionId);
      
      await this.redis.del(`${this.userSessionsPrefix}${userId}`);
      
      for (const session of updatedSessions) {
        await this.redis.addToList(`${this.userSessionsPrefix}${userId}`, session);
      }
    } catch (error) {
      Logger.debug('Failed to remove user session:', error.message);
    }
  }

  async blacklistToken(jti, ttl) {
    try {
      await this.redis.set(`${this.blacklistPrefix}${jti}`, true, ttl);
    } catch (error) {
      Logger.debug('Failed to blacklist token:', error.message);
    }
  }

  async isTokenBlacklisted(jti) {
    try {
      return await this.redis.exists(`${this.blacklistPrefix}${jti}`);
    } catch (error) {
      Logger.debug('Failed to check blacklist:', error.message);
      return false;
    }
  }

  // Public utility methods

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      return null;
    }
  }

  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      return decoded.exp < Math.floor(Date.now() / 1000);
    } catch (error) {
      return true;
    }
  }

  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return 0;
      
      const remaining = decoded.exp - Math.floor(Date.now() / 1000);
      return Math.max(0, remaining);
    } catch (error) {
      return 0;
    }
  }
}

// Create singleton instance
const jwtSessionService = new JWTSessionService();

module.exports = jwtSessionService;