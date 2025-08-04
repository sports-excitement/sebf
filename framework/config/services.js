require('dotenv').config();

/**
 * Services Configuration
 * 
 * This file contains configuration for all external services
 * with proper failover and validation mechanisms
 */

/**
 * Service Enable/Disable Helper
 * Checks explicit enable/disable flags first, then falls back to auto-detection
 */
function isServiceEnabled(serviceName, autoDetectCondition) {
  const explicitEnable = process.env[`${serviceName.toUpperCase()}_ENABLED`];
  
  // If explicitly set, use that value
  if (explicitEnable !== undefined) {
    return explicitEnable === 'true';
  }
  
  // Otherwise, use auto-detection based on required config
  return autoDetectCondition;
}

const config = {
  // Database Configuration (Prisma/PostgreSQL) - Now Optional
  database: {
    url: process.env.DATABASE_URL,
    enabled: isServiceEnabled('database', !!process.env.DATABASE_URL),
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    required: false, // Database is now optional - users can choose between Prisma and MongoDB
  },

  // MongoDB Configuration (Mongoose ODM)
  mongodb: {
    enabled: isServiceEnabled('mongodb', !!(process.env.MONGODB_PRIMARY_HOST && process.env.MONGODB_PRIMARY_DATABASE)),
    required: false, // Optional database choice
    primary: {
      host: process.env.MONGODB_PRIMARY_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_PRIMARY_PORT || '27017', 10),
      database: process.env.MONGODB_PRIMARY_DATABASE,
      username: process.env.MONGODB_PRIMARY_USERNAME,
      password: process.env.MONGODB_PRIMARY_PASSWORD,
      options: {
        authSource: process.env.MONGODB_PRIMARY_AUTH_SOURCE || 'admin',
        ssl: process.env.MONGODB_PRIMARY_SSL === 'true',
        replicaSet: process.env.MONGODB_PRIMARY_REPLICA_SET,
        readPreference: process.env.MONGODB_PRIMARY_READ_PREFERENCE || 'primary'
      }
    },
    secondary: {
      enabled: isServiceEnabled('mongodb_secondary', !!(process.env.MONGODB_SECONDARY_HOST && process.env.MONGODB_SECONDARY_DATABASE)),
      host: process.env.MONGODB_SECONDARY_HOST || 'localhost',
      port: parseInt(process.env.MONGODB_SECONDARY_PORT || '27017', 10),
      database: process.env.MONGODB_SECONDARY_DATABASE,
      username: process.env.MONGODB_SECONDARY_USERNAME,
      password: process.env.MONGODB_SECONDARY_PASSWORD,
      options: {
        authSource: process.env.MONGODB_SECONDARY_AUTH_SOURCE || 'admin',
        ssl: process.env.MONGODB_SECONDARY_SSL === 'true',
        replicaSet: process.env.MONGODB_SECONDARY_REPLICA_SET,
        readPreference: process.env.MONGODB_SECONDARY_READ_PREFERENCE || 'secondary'
      }
    },
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000', 10),
      heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY || '10000', 10),
      retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
      w: process.env.MONGODB_WRITE_CONCERN || 'majority'
    }
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    enabled: isServiceEnabled('supabase', !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)),
    required: false,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    }
  },

  // MinIO Configuration (File Storage)
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET || 'sports-excitement',
    enabled: isServiceEnabled('minio', !!(process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY)),
    required: false,
    region: process.env.MINIO_REGION || 'us-east-1',
    options: {
      partSize: parseInt(process.env.MINIO_PART_SIZE || '64', 10) * 1024 * 1024, // 64MB
      maxRetries: parseInt(process.env.MINIO_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(process.env.MINIO_RETRY_DELAY || '1000', 10)
    }
  },

  // Redis Configuration (Caching & Sessions)
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || null,
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
    enabled: isServiceEnabled('redis', true), // Redis is enabled by default
    required: false,
    options: {
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
      maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      lazyConnect: true,
      keepAlive: true,
      family: 4, // 4 (IPv4) or 6 (IPv6)
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'sports-excitement:',
    }
  },

  // Typesense Configuration (Search Engine)
  typesense: {
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
    protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    apiKey: process.env.TYPESENSE_API_KEY,
    enabled: isServiceEnabled('typesense', !!process.env.TYPESENSE_API_KEY),
    required: false,
    connectionTimeout: parseInt(process.env.TYPESENSE_CONNECTION_TIMEOUT || '5', 10),
    healthcheckInterval: parseInt(process.env.TYPESENSE_HEALTHCHECK_INTERVAL || '30', 10),
    numRetries: parseInt(process.env.TYPESENSE_NUM_RETRIES || '3', 10),
    retryInterval: parseInt(process.env.TYPESENSE_RETRY_INTERVAL || '0.1', 10),
    logLevel: process.env.TYPESENSE_LOG_LEVEL || 'warn',
    collections: {
      users: process.env.TYPESENSE_USERS_COLLECTION || 'users',
      logs: process.env.TYPESENSE_LOGS_COLLECTION || 'system_logs',
      analytics: process.env.TYPESENSE_ANALYTICS_COLLECTION || 'analytics',
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    issuer: process.env.JWT_ISSUER || 'sports-excitement',
    audience: process.env.JWT_AUDIENCE || 'sports-excitement-app',
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-here',
    name: process.env.SESSION_NAME || 'sports-excitement-session',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.SESSION_SAME_SITE || 'strict',
  },

  // Firebase Configuration (Notifications & Analytics)
  firebase: {
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    databaseUrl: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    enabled: isServiceEnabled('firebase', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY),
    required: false,
    collections: {
      notifications: process.env.FIREBASE_NOTIFICATIONS_COLLECTION || 'notifications',
      deviceTokens: process.env.FIREBASE_DEVICE_TOKENS_COLLECTION || 'device_tokens',
      analytics: process.env.FIREBASE_ANALYTICS_COLLECTION || 'analytics',
      userProfiles: process.env.FIREBASE_USER_PROFILES_COLLECTION || 'user_profiles'
    }
  },

  // Email Configuration (SMTP)
  email: {
    enabled: isServiceEnabled('email', !!process.env.EMAIL_HOST),
    required: false,
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@sports-excitement.com',
    
    // Advanced settings
    maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES || '100', 10),
    rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '10', 10),
    maxEmailsPerMinute: parseInt(process.env.EMAIL_MAX_PER_MINUTE || '10', 10),
    rejectUnauthorized: process.env.EMAIL_REJECT_UNAUTHORIZED !== 'false',
    pool: process.env.EMAIL_POOL !== 'false',
    
    // Alternative providers
    apiKey: process.env.EMAIL_API_KEY, // For SendGrid, etc.
    accessKeyId: process.env.EMAIL_ACCESS_KEY_ID, // For AWS SES
    secretAccessKey: process.env.EMAIL_SECRET_ACCESS_KEY, // For AWS SES
    region: process.env.EMAIL_REGION || 'us-east-1', // For AWS SES
    
    // Bulk email settings
    bulkBatchSize: parseInt(process.env.EMAIL_BULK_BATCH_SIZE || '50', 10),
    testRecipient: process.env.EMAIL_TEST_RECIPIENT,
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
    destination: process.env.UPLOAD_DESTINATION || 'uploads/',
  },

  // SSE Configuration (Server-Sent Events)
  sse: {
    enabled: isServiceEnabled('sse', process.env.SSE_ENABLED !== 'false'),
    required: false,
    heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL || '30000', 10), // 30 seconds
    maxConnections: parseInt(process.env.SSE_MAX_CONNECTIONS || '1000', 10),
    maxConnectionsPerUser: parseInt(process.env.SSE_MAX_CONNECTIONS_PER_USER || '5', 10),
    connectionTimeout: parseInt(process.env.SSE_CONNECTION_TIMEOUT || '300000', 10), // 5 minutes
    retryInterval: parseInt(process.env.SSE_RETRY_INTERVAL || '5000', 10),
  },

  // Memory Monitoring Configuration
  memory: {
    enabled: isServiceEnabled('memory', process.env.MEMORY_MONITORING_ENABLED !== 'false'),
    required: false,
    interval: parseInt(process.env.MEMORY_MONITOR_INTERVAL || '60000', 10), // 1 minute
    threshold: parseInt(process.env.MEMORY_THRESHOLD || '80', 10), // 80% usage warning
  },

  // Error Handling Service Configuration
  error_handling: {
    enabled: isServiceEnabled('error_handling', process.env.ERROR_HANDLING_ENABLED !== 'false'),
    required: false, // Optional but recommended
    alertThresholds: {
      ratePerMinute: parseInt(process.env.ERROR_ALERT_RATE_PER_MINUTE || '10', 10),
      criticalErrors: parseInt(process.env.ERROR_ALERT_CRITICAL || '1', 10),
      consecutiveErrors: parseInt(process.env.ERROR_ALERT_CONSECUTIVE || '5', 10)
    },
    retentionPeriod: parseInt(process.env.ERROR_RETENTION_PERIOD || '86400000', 10), // 24 hours
    logLevel: process.env.ERROR_LOG_LEVEL || 'error'
  },

  // Authentication Service Configuration
  auth: {
    enabled: isServiceEnabled('auth', process.env.AUTH_SERVICE_ENABLED !== 'false'),
    required: false, // Handled by middleware primarily
    enforceIPValidation: process.env.AUTH_ENFORCE_IP_VALIDATION === 'true',
    enforceUserAgentValidation: process.env.AUTH_ENFORCE_UA_VALIDATION === 'true',
    maxTokenBlacklistSize: parseInt(process.env.AUTH_MAX_BLACKLIST_SIZE || '10000', 10),
    sessionCleanupInterval: parseInt(process.env.AUTH_SESSION_CLEANUP_INTERVAL || '3600000', 10) // 1 hour
  },

  // Security Service Configuration
  security: {
    enabled: isServiceEnabled('security', process.env.SECURITY_SERVICE_ENABLED !== 'false'),
    required: false, // Optional but recommended
    whitelistIPs: process.env.SECURITY_WHITELIST_IPS,
    blacklistIPs: process.env.SECURITY_BLACKLIST_IPS,
    rateLimitWindow: parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.SECURITY_RATE_LIMIT_MAX || '1000', 10),
    enableThreatDetection: process.env.SECURITY_THREAT_DETECTION !== 'false',
    enableIPTracking: process.env.SECURITY_IP_TRACKING !== 'false'
  },

  // CORS Service Configuration
  cors: {
    enabled: isServiceEnabled('cors', process.env.CORS_SERVICE_ENABLED !== 'false'),
    required: false, // Optional service
    origins: process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS,
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    methods: (process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,PATCH,OPTIONS').split(','),
    allowedHeaders: (process.env.CORS_HEADERS || 'Content-Type,Authorization,X-Requested-With,Accept,Origin').split(','),
    maxAge: parseInt(process.env.CORS_MAX_AGE || '3600', 10),
    defaultPolicy: process.env.CORS_DEFAULT_POLICY || 'restrictive'
  }
};

/**
 * Validate service configurations
 */
function validateConfig() {
  const errors = [];

  // Validate required services
  Object.entries(config).forEach(([serviceName, serviceConfig]) => {
    if (serviceConfig.required && !serviceConfig.enabled) {
      errors.push(`${serviceName.toUpperCase()} is required but not enabled or configured`);
    }
  });

  // Validate JWT secret in production
  if (process.env.NODE_ENV === 'production' && config.jwt.secret === 'your-super-secret-jwt-key-here') {
    errors.push('JWT_SECRET must be set in production');
  }

  // Validate session secret in production
  if (process.env.NODE_ENV === 'production' && config.session.secret === 'your-super-secret-session-key-here') {
    errors.push('SESSION_SECRET must be set in production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get enabled services
 */
function getEnabledServices() {
  return {
    database: config.database.enabled,
    mongodb: config.mongodb.enabled,
    supabase: config.supabase.enabled,
    minio: config.minio.enabled,
    redis: config.redis.enabled,
    typesense: config.typesense.enabled,
    firebase: config.firebase.enabled,
    email: config.email.enabled,
    sse: config.sse.enabled,
    memory: config.memory.enabled,
    error_handling: config.error_handling.enabled,
    auth: config.auth.enabled,
    security: config.security.enabled,
    cors: config.cors.enabled,
  };
}

/**
 * Get all services with their status
 */
function getAllServices() {
  const services = {};
  
  Object.entries(config).forEach(([serviceName, serviceConfig]) => {
    if (serviceConfig.hasOwnProperty('enabled')) {
      services[serviceName] = {
        enabled: serviceConfig.enabled,
        required: serviceConfig.required || false,
        configured: isServiceConfigured(serviceName, serviceConfig)
      };
    }
  });
  
  return services;
}

/**
 * Check if a service is properly configured
 */
function isServiceConfigured(serviceName, serviceConfig) {
  switch (serviceName) {
    case 'database':
      return !!serviceConfig.url;
    case 'mongodb':
      return !!(serviceConfig.primary.host && serviceConfig.primary.database);
    case 'supabase':
      return !!(serviceConfig.url && serviceConfig.key);
    case 'minio':
      return !!(serviceConfig.accessKey && serviceConfig.secretKey);
    case 'redis':
      return true; // Redis always has default config
    case 'typesense':
      return !!serviceConfig.apiKey;
    case 'firebase':
      return !!serviceConfig.serviceAccountKey;
    case 'email':
      const provider = serviceConfig.provider || 'smtp';
      switch (provider) {
        case 'smtp':
          return !!serviceConfig.host;
        case 'sendgrid':
          return !!serviceConfig.apiKey;
        case 'ses':
          return !!(serviceConfig.accessKeyId && serviceConfig.secretAccessKey);
        default:
          return !!serviceConfig.host;
      }
    case 'sse':
      return true; // SSE doesn't require special config
    case 'memory':
      return true; // Memory monitoring doesn't require special config
    case 'error_handling':
      return true; // Error handling doesn't require special config
    case 'auth':
      return true; // Auth service doesn't require special config
    case 'security':
      return true; // Security service doesn't require special config
    case 'cors':
      return true; // CORS service doesn't require special config
    default:
      return true;
  }
}

/**
 * Get service configuration with status
 */
function getServiceConfig(serviceName) {
  const serviceConfig = config[serviceName];
  if (!serviceConfig) {
    return null;
  }
  
  return {
    ...serviceConfig,
    configured: isServiceConfigured(serviceName, serviceConfig),
    status: serviceConfig.enabled ? (isServiceConfigured(serviceName, serviceConfig) ? 'enabled' : 'misconfigured') : 'disabled'
  };
}

/**
 * Check if a service can be disabled
 */
function canDisableService(serviceName) {
  const serviceConfig = config[serviceName];
  return serviceConfig && !serviceConfig.required;
}

/**
 * Get service dependencies
 */
function getServiceDependencies() {
  return {
    redis: ['sse'], // SSE can use Redis for scaling
    database: [], // Prisma database is now optional
    mongodb: [], // MongoDB is optional and alternative to Prisma
    firebase: [], // Firebase is independent
    typesense: [], // Typesense is independent
    minio: [], // MinIO is independent
    supabase: [], // Supabase is independent
    email: [], // Email is independent
    memory: [], // Memory monitoring is independent
  };
}

// Validate configuration on load
if (process.env.NODE_ENV !== 'test') {
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  ...config,
  isServiceEnabled,
  validateConfig,
  getEnabledServices,
  getAllServices,
  getServiceConfig,
  canDisableService,
  getServiceDependencies,
  isServiceConfigured,
}; 