const { createClient } = require('@supabase/supabase-js');
const config = require('../config/services').supabase;
const Logger = require('../helpers/Logger');

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.enabled = config.enabled;
    
    if (this.enabled) {
      this.initializeClient();
    } else {
      Logger.warn('Supabase is disabled - check SUPABASE_URL and SUPABASE_KEY environment variables');
    }
  }

  initializeClient() {
    try {
      this.client = createClient(config.url, config.key, {
        auth: config.options.auth,
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'x-application-name': 'sports-excitement-backend',
          },
        },
      });

      Logger.info('Supabase client initialized');
    } catch (error) {
      Logger.error('Failed to initialize Supabase client:', error);
      this.enabled = false;
    }
  }

  async connect() {
    if (!this.enabled) {
      Logger.warn('Supabase is disabled, skipping connection');
      return false;
    }

    try {
      // Test connection by getting session
      const { data, error } = await this.client.auth.getSession();
      
      if (error && error.message !== 'No session') {
        throw error;
      }

      this.isConnected = true;
      Logger.info('Supabase connected successfully');
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('Supabase connection failed:', error);
      return false;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      return { 
        status: 'disabled', 
        message: 'Supabase is disabled' 
      };
    }

    try {
      if (!this.client) {
        return { 
          status: 'error', 
          message: 'Supabase client not initialized' 
        };
      }

      // Test with a simple query to the auth endpoint
      const { data, error } = await this.client.auth.getSession();
      
      if (error && error.message !== 'No session') {
        throw error;
      }

      this.isConnected = true;
      return { 
        status: 'connected', 
        message: 'Supabase connection successful' 
      };
    } catch (error) {
      this.isConnected = false;
      Logger.error('Supabase connection test failed:', error);
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }

  // Authentication Methods

  async signUp(email, password, userData = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${process.env.APP_URL}/auth/callback`
        }
      });

      if (error) {
        Logger.error('Supabase sign up failed:', error);
        throw error;
      }

      Logger.info(`User signed up: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        Logger.error('Supabase sign in failed:', error);
        throw error;
      }

      Logger.info(`User signed in: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut(accessToken) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { error } = await this.client.auth.signOut();

      if (error) {
        Logger.error('Supabase sign out failed:', error);
        throw error;
      }

      Logger.info('User signed out successfully');
      return true;
    } catch (error) {
      Logger.error('Sign out error:', error);
      throw error;
    }
  }

  async resetPassword(email) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL}/auth/reset-password`
      });

      if (error) {
        Logger.error('Password reset failed:', error);
        throw error;
      }

      Logger.info(`Password reset email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Password reset error:', error);
      throw error;
    }
  }

  async updatePassword(accessToken, newPassword) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      // Set the session first
      await this.client.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // This might need to be provided
      });

      const { data, error } = await this.client.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Logger.error('Password update failed:', error);
        throw error;
      }

      Logger.info('Password updated successfully');
      return data;
    } catch (error) {
      Logger.error('Password update error:', error);
      throw error;
    }
  }

  async verifyToken(token) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.auth.getUser(token);

      if (error) {
        Logger.error('Token verification failed:', error);
        return null;
      }

      return data.user;
    } catch (error) {
      Logger.error('Token verification error:', error);
      return null;
    }
  }

  async refreshSession(refreshToken) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        Logger.error('Session refresh failed:', error);
        throw error;
      }

      return data;
    } catch (error) {
      Logger.error('Session refresh error:', error);
      throw error;
    }
  }

  // Database Methods

  async select(table, columns = '*', filters = {}, options = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      let query = this.client.from(table).select(columns);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'object' && value.operator) {
          switch (value.operator) {
            case 'eq':
              query = query.eq(key, value.value);
              break;
            case 'neq':
              query = query.neq(key, value.value);
              break;
            case 'gt':
              query = query.gt(key, value.value);
              break;
            case 'gte':
              query = query.gte(key, value.value);
              break;
            case 'lt':
              query = query.lt(key, value.value);
              break;
            case 'lte':
              query = query.lte(key, value.value);
              break;
            case 'like':
              query = query.like(key, value.value);
              break;
            case 'ilike':
              query = query.ilike(key, value.value);
              break;
            case 'in':
              query = query.in(key, value.value);
              break;
            default:
              query = query.eq(key, value.value);
          }
        } else {
          query = query.eq(key, value);
        }
      });

      // Apply options
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending !== false 
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        Logger.error(`Select from ${table} failed:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      Logger.error(`Database select error in ${table}:`, error);
      throw error;
    }
  }

  async insert(table, data, options = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      let query = this.client.from(table).insert(data);

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;

      if (error) {
        Logger.error(`Insert into ${table} failed:`, error);
        throw error;
      }

      Logger.debug(`Data inserted into ${table}`);
      return result;
    } catch (error) {
      Logger.error(`Database insert error in ${table}:`, error);
      throw error;
    }
  }

  async update(table, data, filters, options = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      let query = this.client.from(table).update(data);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (options.select) {
        query = query.select(options.select);
      }

      const { data: result, error } = await query;

      if (error) {
        Logger.error(`Update in ${table} failed:`, error);
        throw error;
      }

      Logger.debug(`Data updated in ${table}`);
      return result;
    } catch (error) {
      Logger.error(`Database update error in ${table}:`, error);
      throw error;
    }
  }

  async delete(table, filters) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      let query = this.client.from(table).delete();

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { error } = await query;

      if (error) {
        Logger.error(`Delete from ${table} failed:`, error);
        throw error;
      }

      Logger.debug(`Data deleted from ${table}`);
      return true;
    } catch (error) {
      Logger.error(`Database delete error in ${table}:`, error);
      throw error;
    }
  }

  // Storage Methods

  async uploadFile(bucket, path, file, options = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          ...options
        });

      if (error) {
        Logger.error(`File upload to ${bucket}/${path} failed:`, error);
        throw error;
      }

      Logger.info(`File uploaded to ${bucket}/${path}`);
      return data;
    } catch (error) {
      Logger.error('File upload error:', error);
      throw error;
    }
  }

  async downloadFile(bucket, path) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .download(path);

      if (error) {
        Logger.error(`File download from ${bucket}/${path} failed:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      Logger.error('File download error:', error);
      throw error;
    }
  }

  async deleteFile(bucket, paths) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .remove(Array.isArray(paths) ? paths : [paths]);

      if (error) {
        Logger.error(`File deletion from ${bucket} failed:`, error);
        throw error;
      }

      Logger.info(`Files deleted from ${bucket}`);
      return data;
    } catch (error) {
      Logger.error('File deletion error:', error);
      throw error;
    }
  }

  async getPublicUrl(bucket, path) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (error) {
      Logger.error('Get public URL error:', error);
      throw error;
    }
  }

  async createSignedUrl(bucket, path, expiresIn = 3600) {
    if (!this.enabled || !this.client) {
      throw new Error('Supabase not available');
    }

    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        Logger.error('Create signed URL failed:', error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      Logger.error('Create signed URL error:', error);
      throw error;
    }
  }

  // Realtime Methods

  subscribeToTable(table, callback, filter = '*') {
    if (!this.enabled || !this.client) {
      Logger.warn('Supabase not available, cannot subscribe to table');
      return null;
    }

    try {
      const subscription = this.client
        .channel(`public:${table}`)
        .on('postgres_changes', { 
          event: filter, 
          schema: 'public', 
          table: table 
        }, callback)
        .subscribe();

      Logger.info(`Subscribed to table: ${table}`);
      return subscription;
    } catch (error) {
      Logger.error(`Subscription to ${table} failed:`, error);
      return null;
    }
  }

  unsubscribe(subscription) {
    if (subscription) {
      subscription.unsubscribe();
      Logger.info('Unsubscribed from realtime channel');
    }
  }

  // Utility Methods

  isEnabled() {
    return this.enabled;
  }

  isHealthy() {
    return this.enabled && this.isConnected;
  }

  getClient() {
    return this.client;
  }

  // User management utilities

  async syncUserWithPrisma(supabaseUser, prismaUserService) {
    if (!this.enabled) {
      return null;
    }

    try {
      // Check if user exists in Prisma
      let prismaUser = await prismaUserService.getUserById(supabaseUser.id);

      if (!prismaUser) {
        // Create user in Prisma
        prismaUser = await prismaUserService.createUser({
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          emailVerified: !!supabaseUser.email_confirmed_at,
          emailVerifiedAt: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
          lastLoginAt: new Date()
        });
      } else {
        // Update last login
        await prismaUserService.updateUser(supabaseUser.id, {
          lastLoginAt: new Date()
        });
      }

      return prismaUser;
    } catch (error) {
      Logger.error('User sync with Prisma failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

module.exports = supabaseService; 