const config = require('../config/services');
const SSEHelpers = require('../helpers/SSEHelpers');

/**
 * Server-Sent Events Service
 * Manages real-time connections and message broadcasting using SSE helpers
 */
class SSEService {
  constructor() {
    this.connections = new Map();
    this.channels = new Map();
    this.config = config.sse;
    this.heartbeatInterval = null;
    this.isEnabled = this.config.enabled;
  }

  /**
   * Initialize the SSE service
   */
  initialize() {
    if (!this.isEnabled) {
      console.log('SSE Service is disabled');
      return { status: 'disabled', message: 'SSE service is disabled in configuration' };
    }

    this.startHeartbeat();
    console.log('✅ SSE Service initialized');
    return { status: 'connected', message: 'SSE service initialized successfully' };
  }

  /**
   * Test SSE service connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'SSE service is disabled' };
    }

    return {
      status: 'connected',
      message: 'SSE service is operational',
      stats: this.getStats()
    };
  }

  /**
   * Add new SSE connection using helpers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} userId - User ID (optional)
   * @param {Array} channels - Channels to subscribe to
   */
  addConnection(req, res, userId = null, channels = []) {
    if (!this.isEnabled) {
      return SSEHelpers.sendError(res, 'SSE service is disabled');
    }

    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      return SSEHelpers.sendError(res, 'Maximum connections reached');
    }

    // Validate SSE connection
    const validation = SSEHelpers.validateSSEConnection(req, res);
    if (!validation.valid) {
      return SSEHelpers.sendError(res, validation.error);
    }

    const connectionId = SSEHelpers.generateConnectionId();

    // Initialize SSE connection with headers
    SSEHelpers.initializeSSE(res, {
      connectionId: connectionId,
      cors: {
        origin: this.getAllowedOrigin(req),
        credentials: true
      }
    });

    // Create connection object
    const connection = {
      id: connectionId,
      response: res,
      userId: userId,
      channels: new Set(channels),
      lastActivity: Date.now(),
      isAlive: true,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    this.connections.set(connectionId, connection);

    // Subscribe to channels
    channels.forEach(channel => {
      this.subscribeToChannel(connectionId, channel);
    });

    // Send welcome message with connection info
    SSEHelpers.sendEvent(res, 'connected', {
      connectionId: connectionId,
      userId: userId,
      channels: channels,
      maxConnections: this.config.maxConnections,
      heartbeatInterval: this.config.heartbeatInterval
    });

    // Handle connection cleanup
    SSEHelpers.handleConnectionCleanup(req, () => {
      this.removeConnection(connectionId);
    });

    console.log(`SSE connection added: ${connectionId} (User: ${userId || 'anonymous'})`);
    return connectionId;
  }

  /**
   * Remove SSE connection
   * @param {string} connectionId - Connection ID
   */
  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;

      // Unsubscribe from all channels
      connection.channels.forEach(channel => {
        this.unsubscribeFromChannel(connectionId, channel);
      });

      // Close connection gracefully
      if (!connection.response.destroyed) {
        SSEHelpers.closeConnection(connection.response, 'Connection terminated');
      }

      this.connections.delete(connectionId);
      console.log(`SSE connection removed: ${connectionId}`);
    }
  }

  /**
   * Subscribe connection to channel
   * @param {string} connectionId - Connection ID
   * @param {string} channel - Channel name
   */
  subscribeToChannel(connectionId, channel) {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel).add(connectionId);

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.channels.add(channel);

      // Notify about subscription
      SSEHelpers.sendSystemEvent(connection.response, 'channel_subscribed', {
        channel: channel,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Unsubscribe connection from channel
   * @param {string} connectionId - Connection ID
   * @param {string} channel - Channel name
   */
  unsubscribeFromChannel(connectionId, channel) {
    const channelConnections = this.channels.get(channel);
    if (channelConnections) {
      channelConnections.delete(connectionId);

      if (channelConnections.size === 0) {
        this.channels.delete(channel);
      }
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.channels.delete(channel);

      // Notify about unsubscription
      if (!connection.response.destroyed) {
        SSEHelpers.sendSystemEvent(connection.response, 'channel_unsubscribed', {
          channel: channel,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Send message to specific connection
   * @param {string} connectionId - Connection ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  sendToConnection(connectionId, event, data) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.isAlive && !connection.response.destroyed) {
      try {
        const success = SSEHelpers.sendEvent(connection.response, event, data);
        if (success) {
          connection.lastActivity = Date.now();
          return true;
        } else {
          this.removeConnection(connectionId);
          return false;
        }
      } catch (error) {
        console.error(`SSE send error for connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
        return false;
      }
    }
    return false;
  }

  /**
   * Send message to all connections in a channel
   * @param {string} channel - Channel name
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  sendToChannel(channel, event, data) {
    const channelConnections = this.channels.get(channel);
    if (channelConnections) {
      let successCount = 0;

      channelConnections.forEach(connectionId => {
        if (this.sendToConnection(connectionId, event, data)) {
          successCount++;
        }
      });

      return successCount;
    }
    return 0;
  }

  /**
   * Send message to all connections for a specific user
   * @param {number} userId - User ID
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  sendToUser(userId, event, data) {
    let successCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId) {
        if (this.sendToConnection(connectionId, event, data)) {
          successCount++;
        }
      }
    });

    return successCount;
  }

  /**
   * Send notification to user
   * @param {number} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendNotificationToUser(userId, notification) {
    let successCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId) {
        const success = SSEHelpers.sendNotification(connection.response, notification);
        if (success) {
          connection.lastActivity = Date.now();
          successCount++;
        } else {
          this.removeConnection(connectionId);
        }
      }
    });

    return successCount;
  }

  /**
   * Broadcast message to all connections
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @param {string} excludeConnectionId - Connection to exclude
   */
  broadcast(event, data, excludeConnectionId = null) {
    let successCount = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connectionId !== excludeConnectionId) {
        if (this.sendToConnection(connectionId, event, data)) {
          successCount++;
        }
      }
    });

    return successCount;
  }

  /**
   * Send heartbeat to all connections
   */
  sendHeartbeat() {
    let activeConnections = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connection.isAlive && !connection.response.destroyed) {
        const success = SSEHelpers.sendHeartbeat(connection.response);
        if (success) {
          connection.lastActivity = Date.now();
          activeConnections++;
        } else {
          this.removeConnection(connectionId);
        }
      } else {
        this.removeConnection(connectionId);
      }
    });

    return activeConnections;
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const activeConnections = this.sendHeartbeat();
      this.cleanupStaleConnections();
      
      if (activeConnections > 0) {
        console.log(`SSE heartbeat sent to ${activeConnections} connections`);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat interval
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const timeout = this.config.connectionTimeout;

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity > timeout) {
        console.log(`Removing stale SSE connection: ${connectionId}`);
        this.removeConnection(connectionId);
      }
    });
  }

  /**
   * Cleanup all connections and stop heartbeat (for shutdown)
   */
  cleanup() {
    this.stopHeartbeat();
    
    // Close all active connections
    this.connections.forEach((connection, connectionId) => {
      if (connection.res && !connection.res.destroyed) {
        connection.res.end();
      }
    });
    
    // Clear all connections and channels
    this.connections.clear();
    this.channels.clear();
    
    console.log('SSE Service cleanup completed');
  }

  /**
   * Get allowed origin for CORS
   * @param {Object} req - Express request object
   */
  getAllowedOrigin(req) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    const origin = req.get('Origin');
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return origin || allowedOrigins[0];
    }
    
    return allowedOrigins[0];
  }

  /**
   * Get service statistics
   */
  getStats() {
    const channelStats = Array.from(this.channels.entries()).map(([channel, connections]) => ({
      channel: channel,
      connections: connections.size
    }));

    const userStats = {};
    this.connections.forEach(connection => {
      if (connection.userId) {
        userStats[connection.userId] = (userStats[connection.userId] || 0) + 1;
      }
    });

    return {
      enabled: this.isEnabled,
      totalConnections: this.connections.size,
      totalChannels: this.channels.size,
      maxConnections: this.config.maxConnections,
      heartbeatInterval: this.config.heartbeatInterval,
      connectionTimeout: this.config.connectionTimeout,
      channelStats: channelStats,
      userConnections: Object.keys(userStats).length,
      anonymousConnections: this.connections.size - Object.values(userStats).reduce((a, b) => a + b, 0),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down SSE service...');
    
    this.stopHeartbeat();

    // Close all connections
    this.connections.forEach((connection, connectionId) => {
      SSEHelpers.closeConnection(connection.response, 'Server shutting down');
    });

    this.connections.clear();
    this.channels.clear();

    console.log('SSE service shutdown complete');
  }
}

// Create singleton instance
const sseService = new SSEService();

module.exports = sseService; 