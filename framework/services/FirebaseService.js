const admin = require('firebase-admin');
const config = require('../config/services').firebase;
const Logger = require('../helpers/Logger');

class FirebaseService {
  constructor() {
    this.admin = null;
    this.db = null;
    this.messaging = null;
    this.isConnected = false;
    this.enabled = config.enabled;
    
    if (this.enabled) {
      this.initializeClient();
    } else {
      Logger.warn('Firebase is disabled - check FIREBASE_SERVICE_ACCOUNT_KEY environment variable');
    }
  }

  initializeClient() {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = JSON.parse(config.serviceAccountKey);
      
      this.admin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.databaseUrl,
        storageBucket: config.storageBucket
      });

      // Initialize Firestore
      this.db = this.admin.firestore();
      
      // Initialize Cloud Messaging
      this.messaging = this.admin.messaging();

      Logger.info('Firebase client initialized');
    } catch (error) {
      Logger.error('Failed to initialize Firebase client:', error);
      this.enabled = false;
    }
  }

  async connect() {
    if (!this.enabled) {
      Logger.warn('Firebase is disabled, skipping connection');
      return false;
    }

    try {
      // Test Firestore connection
      await this.db.collection('_health_check').doc('test').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: true
      });

      // Clean up test document
      await this.db.collection('_health_check').doc('test').delete();

      this.isConnected = true;
      Logger.info('Firebase connected successfully');
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('Firebase connection failed:', error);
      return false;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      return { 
        status: 'disabled', 
        message: 'Firebase is disabled' 
      };
    }

    try {
      if (!this.admin || !this.db) {
        return { 
          status: 'error', 
          message: 'Firebase client not initialized' 
        };
      }

      // Test Firestore connection
      const testDoc = this.db.collection('_health_check').doc('connection_test');
      await testDoc.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        test: true
      });

      await testDoc.delete();

      this.isConnected = true;
      return { 
        status: 'connected', 
        message: 'Firebase connection successful'
      };
    } catch (error) {
      this.isConnected = false;
      Logger.error('Firebase connection test failed:', error);
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }

  // Notification Management

  async saveNotification(userId, notification) {
    if (!this.enabled || !this.db) {
      Logger.warn('Firebase not available, skipping notification save');
      return null;
    }

    try {
      const notificationData = {
        userId: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null
      };

      const docRef = await this.db.collection(config.collections.notifications).add(notificationData);
      
      Logger.debug(`Notification saved to Firebase: ${docRef.id}`);
      return { id: docRef.id, ...notificationData };
    } catch (error) {
      Logger.error('Failed to save notification to Firebase:', error);
      throw error;
    }
  }

  async getNotifications(userId, options = {}) {
    if (!this.enabled || !this.db) {
      throw new Error('Firebase not available');
    }

    try {
      let query = this.db.collection(config.collections.notifications)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');

      if (options.isRead !== undefined) {
        query = query.where('isRead', '==', options.isRead);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const notifications = [];

      snapshot.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
        });
      });

      return notifications;
    } catch (error) {
      Logger.error('Failed to get notifications from Firebase:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    if (!this.enabled || !this.db) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection(config.collections.notifications).doc(notificationId).update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      Logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId) {
    if (!this.enabled || !this.db) {
      throw new Error('Firebase not available');
    }

    try {
      await this.db.collection(config.collections.notifications).doc(notificationId).delete();
      return true;
    } catch (error) {
      Logger.error('Failed to delete notification:', error);
      throw error;
    }
  }

  // Push Notification Management

  async sendPushNotification(deviceToken, notification, data = {}) {
    if (!this.enabled || !this.messaging) {
      Logger.warn('Firebase messaging not available, skipping push notification');
      return null;
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          ...data,
          type: notification.type || 'general',
          timestamp: Date.now().toString()
        },
        token: deviceToken
      };

      const response = await this.messaging.send(message);
      Logger.debug(`Push notification sent: ${response}`);
      return response;
    } catch (error) {
      Logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async sendMulticastNotification(deviceTokens, notification, data = {}) {
    if (!this.enabled || !this.messaging) {
      Logger.warn('Firebase messaging not available, skipping multicast notification');
      return null;
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          ...data,
          type: notification.type || 'general',
          timestamp: Date.now().toString()
        },
        tokens: deviceTokens
      };

      const response = await this.messaging.sendMulticast(message);
      Logger.debug(`Multicast notification sent to ${deviceTokens.length} devices`);
      
      if (response.failureCount > 0) {
        Logger.warn(`${response.failureCount} notifications failed to send`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            Logger.warn(`Failed to send to token ${deviceTokens[idx]}: ${resp.error?.message}`);
          }
        });
      }

      return response;
    } catch (error) {
      Logger.error('Failed to send multicast notification:', error);
      throw error;
    }
  }

  // Device Token Management

  async saveDeviceToken(userId, token, platform = 'unknown') {
    if (!this.enabled || !this.db) {
      Logger.warn('Firebase not available, skipping device token save');
      return null;
    }

    try {
      const tokenData = {
        userId: userId,
        token: token,
        platform: platform,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp()
      };

      // Use token as document ID to prevent duplicates
      await this.db.collection(config.collections.deviceTokens).doc(token).set(tokenData, { merge: true });
      
      Logger.debug(`Device token saved for user ${userId}`);
      return tokenData;
    } catch (error) {
      Logger.error('Failed to save device token:', error);
      throw error;
    }
  }

  async getUserDeviceTokens(userId) {
    if (!this.enabled || !this.db) {
      throw new Error('Firebase not available');
    }

    try {
      const snapshot = await this.db.collection(config.collections.deviceTokens)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const tokens = [];
      snapshot.forEach(doc => {
        tokens.push(doc.data().token);
      });

      return tokens;
    } catch (error) {
      Logger.error('Failed to get user device tokens:', error);
      throw error;
    }
  }

  async deactivateDeviceToken(token) {
    if (!this.enabled || !this.db) {
      return false;
    }

    try {
      await this.db.collection(config.collections.deviceTokens).doc(token).update({
        isActive: false,
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (error) {
      Logger.error('Failed to deactivate device token:', error);
      return false;
    }
  }

  // Analytics and Logging

  async logAnalyticsEvent(userId, event, data = {}) {
    if (!this.enabled || !this.db) {
      Logger.warn('Firebase not available, skipping analytics event');
      return null;
    }

    try {
      const eventData = {
        userId: userId,
        event: event,
        data: data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        environment: process.env.NODE_ENV || 'development'
      };

      const docRef = await this.db.collection(config.collections.analytics).add(eventData);
      Logger.debug(`Analytics event logged: ${event}`);
      return docRef.id;
    } catch (error) {
      Logger.error('Failed to log analytics event:', error);
      return null;
    }
  }

  // Utility Methods

  async getUserProfile(userId) {
    if (!this.enabled || !this.db) {
      throw new Error('Firebase not available');
    }

    try {
      const doc = await this.db.collection(config.collections.userProfiles).doc(userId.toString()).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      Logger.error('Failed to get user profile:', error);
      throw error;
    }
  }

  async saveUserProfile(userId, profileData) {
    if (!this.enabled || !this.db) {
      Logger.warn('Firebase not available, skipping user profile save');
      return null;
    }

    try {
      const data = {
        ...profileData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db.collection(config.collections.userProfiles).doc(userId.toString()).set(data, { merge: true });
      Logger.debug(`User profile saved for user ${userId}`);
      return data;
    } catch (error) {
      Logger.error('Failed to save user profile:', error);
      throw error;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  isHealthy() {
    return this.enabled && this.isConnected;
  }

  getFirestore() {
    return this.db;
  }

  getMessaging() {
    return this.messaging;
  }

  getAdmin() {
    return this.admin;
  }

  async disconnect() {
    try {
      if (this.admin) {
        await this.admin.app().delete();
        this.isConnected = false;
        Logger.info('Firebase service disconnected');
      }
    } catch (error) {
      Logger.error('Error disconnecting Firebase:', error);
    }
  }
}

// Create singleton instance
const firebaseService = new FirebaseService();

module.exports = firebaseService;