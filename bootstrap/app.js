// Framework Core
const CoreApplication = require('../framework/core/Application');

// Configuration
const config = require('../framework/config/app');
const servicesConfig = require('../framework/config/services');

// Routes
const kernelRoutes = require('../framework/routes/kernel');
const apiRoutes = require('../routes/api');

// Helpers
const Response = require('../framework/helpers/Response');
const Logger = require('../framework/helpers/Logger');

// Middleware
const { sessionMiddleware, sessionActivityMiddleware } = require('../framework/middleware/Session');
const errorHandler = require('../framework/middleware/ErrorHandler');

// Core services
const { prismaService } = require('../framework/config/prisma');

// Service loader - dynamically loads services based on configuration
const serviceLoader = {
  async loadService(serviceName) {
    const serviceConfig = servicesConfig.getServiceConfig(serviceName);
    
    if (!serviceConfig || !serviceConfig.enabled) {
      return null;
    }
    
    try {
      switch (serviceName) {
        case 'redis':
          return require('../framework/services/RedisService');
        case 'typesense':
          return require('../framework/services/TypesenseService');
        case 'minio':
          return require('../framework/services/MinioService');
        case 'supabase':
          return require('../framework/services/SupabaseService');
        case 'firebase':
          return require('../framework/services/FirebaseService');
        case 'sse':
          return require('../framework/services/SSEService');
        case 'memory':
          return require('../framework/services/MemoryService');
        case 'email':
        case 'mailing':
          return require('../framework/services/MailingService');
        case 'error':
        case 'error_handling':
          return require('../framework/services/ErrorHandlingService');
        case 'auth':
        case 'authentication':
          return require('../framework/services/AuthService');
        case 'security':
          return require('../framework/services/SecurityService');
        case 'cors':
          return require('../framework/services/CORSService');
        default:
          Logger.warn(`Unknown service: ${serviceName}`);
          return null;
      }
    } catch (error) {
      Logger.error(`Failed to load service ${serviceName}:`, error.message);
      return null;
    }
  }
};

/**
 * Application Implementation
 * 
 * Extends the core framework with application-specific functionality
 * Optimized for memory safety and performance
 */
class Application extends CoreApplication {
  constructor() {
    // Initialize the framework with application configuration
    super({
      servicesConfig,
      appConfig: config,
      Logger,
      sessionMiddleware,
      sessionActivityMiddleware,
      errorHandler,
      initializeServices: async function() {
        await this.initializeApplicationServices();
      },
      setupRoutes: function() {
        this.setupApplicationRoutes();
      },
      cleanupServices: async function() {
        await this.disconnectServices();
      }
    });

    // Memory optimization properties
    this.memoryMonitor = null;
    this.gcInterval = null;
    this.maxMemoryThreshold = parseInt(process.env.MAX_MEMORY_THRESHOLD || '2048', 10) * 1024 * 1024; // 2GB default
    this.connectionPools = new Map();
    this.serviceHealthCache = new Map();
    this.lastGCTime = Date.now();
    
    // Bind methods to prevent memory leaks from event listeners
    this.handleMemoryWarning = this.handleMemoryWarning.bind(this);
    this.performGarbageCollection = this.performGarbageCollection.bind(this);
    this.monitorMemoryUsage = this.monitorMemoryUsage.bind(this);
    
    // Setup memory monitoring
    this.setupMemoryMonitoring();
  }

  // Note: initialization is now handled by the framework core

  /**
   * Setup memory monitoring and optimization
   */
  setupMemoryMonitoring() {
    // Monitor memory usage periodically
    this.memoryMonitor = setInterval(this.monitorMemoryUsage, 30000); // Every 30 seconds
    
    // Setup garbage collection interval (less aggressive in production)
    const gcInterval = process.env.NODE_ENV === 'production' ? 300000 : 60000; // 5min prod, 1min dev
    this.gcInterval = setInterval(this.performGarbageCollection, gcInterval);
    
    // Listen for memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning' || warning.name === 'MemoryWarning') {
        this.handleMemoryWarning(warning);
      }
    });
    
    Logger.info('🧠 Memory monitoring initialized');
  }

  /**
   * Monitor memory usage and take action if needed
   */
  monitorMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    
    // Log memory usage in development or if above threshold
    if (process.env.NODE_ENV === 'development' || memUsage.heapUsed > this.maxMemoryThreshold * 0.8) {
      Logger.info(`🧠 Memory: ${usedMB}MB / ${totalMB}MB heap, ${externalMB}MB external`);
    }
    
    // Take action if memory usage is too high
    if (memUsage.heapUsed > this.maxMemoryThreshold) {
      this.handleHighMemoryUsage(memUsage);
    }
    
    // Update service health cache periodically
    this.cleanupServiceHealthCache();
  }

  /**
   * Handle high memory usage
   */
  handleHighMemoryUsage(memUsage) {
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    Logger.warn(`⚠️ High memory usage detected: ${usedMB}MB`);
    
    // Force garbage collection
    this.performGarbageCollection(true);
    
    // Clean up service caches
    this.cleanupServiceCaches();
    
    // Close idle connections
    this.closeIdleConnections();
    
    // Emit warning for monitoring systems
    process.emit('memoryWarning', { usage: memUsage, threshold: this.maxMemoryThreshold });
  }

  /**
   * Handle memory warnings
   */
  handleMemoryWarning(warning) {
    Logger.warn(`⚠️ Memory warning: ${warning.name} - ${warning.message}`);
    
    // Take immediate action for memory-related warnings
    if (warning.name === 'MemoryWarning') {
      this.performGarbageCollection(true);
      this.cleanupServiceCaches();
    }
  }

  /**
   * Perform garbage collection if available
   */
  performGarbageCollection(force = false) {
    if (global.gc) {
      const now = Date.now();
      
      // Don't run GC too frequently unless forced
      if (force || (now - this.lastGCTime) > 60000) { // 1 minute minimum
        try {
          const beforeMem = process.memoryUsage().heapUsed;
          global.gc();
          const afterMem = process.memoryUsage().heapUsed;
          const freedMB = Math.round((beforeMem - afterMem) / 1024 / 1024);
          
          if (freedMB > 0) {
            Logger.info(`🧹 Garbage collection freed ${freedMB}MB`);
          }
          
          this.lastGCTime = now;
        } catch (error) {
          Logger.warn('Failed to run garbage collection:', error.message);
        }
      }
    }
  }

  /**
   * Clean up service caches
   */
  cleanupServiceCaches() {
    // Clear service health cache
    this.serviceHealthCache.clear();
    
    // Ask services to clean up their caches
    this.services.forEach(({ name, service }) => {
      if (service.cleanupCache && typeof service.cleanupCache === 'function') {
        try {
          service.cleanupCache();
        } catch (error) {
          Logger.warn(`Failed to cleanup cache for ${name}:`, error.message);
        }
      }
    });
    
    Logger.info('🧹 Service caches cleaned up');
  }

  /**
   * Close idle connections
   */
  closeIdleConnections() {
    this.services.forEach(({ name, service }) => {
      if (service.closeIdleConnections && typeof service.closeIdleConnections === 'function') {
        try {
          service.closeIdleConnections();
        } catch (error) {
          Logger.warn(`Failed to close idle connections for ${name}:`, error.message);
        }
      }
    });
  }

  /**
   * Clean up service health cache
   */
  cleanupServiceHealthCache() {
    const now = Date.now();
    const cacheMaxAge = 300000; // 5 minutes
    
    for (const [key, entry] of this.serviceHealthCache.entries()) {
      if (now - entry.timestamp > cacheMaxAge) {
        this.serviceHealthCache.delete(key);
      }
    }
  }

  /**
   * Initialize application-specific services
   */
  async initializeApplicationServices() {
    Logger.info('🔧 Initializing services...');
    
    const allServices = servicesConfig.getAllServices();
    const enabledServices = Object.entries(allServices).filter(([_, config]) => config.enabled);
    const initPromises = [];
    
    Logger.info(`📋 Services status:`);
    
    // Log all services status
    Object.entries(allServices).forEach(([serviceName, serviceConfig]) => {
      const status = serviceConfig.enabled ? 
        (serviceConfig.configured ? '✅ enabled' : '⚠️ enabled (misconfigured)') : 
        '❌ disabled';
      const required = serviceConfig.required ? ' (required)' : '';
      Logger.info(`   ${serviceName}: ${status}${required}`);
    });
    
    // Always initialize database first (required)
    Logger.info('\n🔧 Initializing core services...');
    await this.initializeService('Database', prismaService, true);
    
    // Initialize optional services
    Logger.info('🔧 Initializing optional services...');
    
    for (const [serviceName, serviceConfig] of enabledServices) {
      // Skip database as it's already initialized
      if (serviceName === 'database') continue;
      
      try {
        const service = await serviceLoader.loadService(serviceName);
        if (service) {
          const displayName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
          initPromises.push(
            this.initializeService(displayName, service, serviceConfig.required)
          );
        }
      } catch (error) {
        Logger.error(`Failed to load ${serviceName} service:`, error.message);
        if (serviceConfig.required) {
          throw error;
        }
      }
    }
    
    // Wait for all optional services to initialize
    const results = await Promise.allSettled(initPromises);
    
    // Log results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    Logger.info(`\n✅ Service initialization complete:`);
    Logger.info(`   Active services: ${this.services.length}`);
    Logger.info(`   Successful: ${successful + 1} (including database)`);
    if (failed > 0) {
      Logger.warn(`   Failed: ${failed}`);
    }
  }

  /**
   * Initialize a single service with optimized resource management
   */
  async initializeService(name, service, required = false) {
    const startTime = Date.now();
    let timeoutId = null;
    
    try {
      Logger.info(`   Initializing ${name}...`);
      
      if (service.connect && typeof service.connect === 'function') {
        // Create connection with timeout and memory monitoring
        const connectPromise = service.connect();
        const timeout = this.getServiceTimeout(name);
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`${name} connection timeout after ${timeout}ms`));
          }, timeout);
        });
        
        try {
          const connected = await Promise.race([connectPromise, timeoutPromise]);
          
          if (connected) {
            this.addService(name, service, required);
            
            // Store connection in pool if service supports pooling
            if (service.getConnectionPool && typeof service.getConnectionPool === 'function') {
              this.connectionPools.set(name, service.getConnectionPool());
            }
            
            const initTime = Date.now() - startTime;
            Logger.info(`   ✅ ${name} connected (${initTime}ms)`);
          } else {
            if (required) {
              throw new Error(`${name} connection failed`);
            }
            Logger.warn(`   ⚠️ ${name} connection failed (optional service)`);
          }
        } catch (error) {
          // Enhanced error handling with retry logic for non-critical failures
          if (!required && this.shouldRetryServiceConnection(error, name)) {
            Logger.warn(`   🔄 Retrying ${name} connection in 5 seconds...`);
            
            setTimeout(async () => {
              try {
                await this.initializeService(name, service, false);
              } catch (retryError) {
                Logger.warn(`   ⚠️ ${name} retry failed:`, retryError.message);
              }
            }, 5000);
            
            return;
          }
          
          throw error;
        } finally {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      } else {
        // Service doesn't need connection (like MemoryService)
        this.addService(name, service, required);
        const initTime = Date.now() - startTime;
        Logger.info(`   ✅ ${name} initialized (${initTime}ms)`);
      }
      
    } catch (error) {
      if (required) {
        Logger.error(`   ❌ ${name} initialization failed:`, error.message);
        
        // Enhanced recovery suggestions
        if (name === 'Database') {
          this.handleDatabaseConnectionFailure(error);
          
          // Don't throw in development for database - let app start without it
          if (process.env.NODE_ENV === 'development') {
            Logger.warn(`   ⚠️ ${name} failed but continuing in development mode`);
            return;
          }
        }
        
        throw error;
      } else {
        Logger.warn(`   ⚠️ ${name} initialization failed (optional):`, error.message);
        
        // Cache failed service info for monitoring
        this.serviceHealthCache.set(`${name}_last_error`, {
          error: error.message,
          timestamp: Date.now()
        });
      }
    } finally {
      // Cleanup timeout if still set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Get appropriate timeout for service initialization
   */
  getServiceTimeout(serviceName) {
    const timeouts = {
      'Database': 30000,    // 30s for database
      'Redis': 10000,       // 10s for Redis
      'Typesense': 15000,   // 15s for Typesense
      'MinIO': 15000,       // 15s for MinIO
      'Supabase': 20000,    // 20s for Supabase
      'Firebase': 20000,    // 20s for Firebase
      'Email': 10000,       // 10s for email
      'SSE': 5000,          // 5s for SSE
      'Memory': 2000        // 2s for memory service
    };
    
    return timeouts[serviceName] || 15000; // Default 15s
  }

  /**
   * Determine if service connection should be retried
   */
  shouldRetryServiceConnection(error, serviceName) {
    // Don't retry for certain error types
    const nonRetryableErrors = [
      'ENOTFOUND',           // DNS resolution failed
      'EACCES',             // Permission denied
      'authentication',      // Auth failures
      'invalid credentials'  // Bad credentials
    ];
    
    const errorMessage = error.message.toLowerCase();
    const shouldNotRetry = nonRetryableErrors.some(errType => 
      errorMessage.includes(errType)
    );
    
    return !shouldNotRetry;
  }

  /**
   * Handle database connection failure with detailed diagnostics
   */
  handleDatabaseConnectionFailure(error) {
    Logger.error('   💡 Database connection failed. Diagnostic information:');
    Logger.error(`   📊 Error: ${error.message}`);
    
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      const urlWithoutCredentials = dbUrl.replace(/:\/\/[^@]+@/, '://***:***@');
      Logger.error(`   🔗 Database URL: ${urlWithoutCredentials}`);
    } else {
      Logger.error('   ❌ DATABASE_URL environment variable is not set');
    }
    
    Logger.error('   🔧 Troubleshooting steps:');
    Logger.error('   1. Verify database server is running');
    Logger.error('   2. Check DATABASE_URL format and credentials');
    Logger.error('   3. Ensure database exists and is accessible');
    Logger.error('   4. Check network connectivity and firewall settings');
  }

  // Note: Core middleware setup is now handled by the framework

  /**
   * Setup application routes
   */
  setupApplicationRoutes() {
    // Root endpoint (redirect to API info)
    this.app.get('/', (req, res) => {
      try {
        const packageJson = require('../package.json');
        res.json({
          success: true,
          message: 'Sports Excitement Core API',
          data: {
            name: config.name || 'Sports Excitement Core',
            version: packageJson.version || '1.0.0',
            environment: config.env || 'development',
            documentation: '/api',
            health: '/api/health',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: 'available at /api/health/detailed'
          }
        });
      } catch (error) {
        console.error('Root route error:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          error: error.message
        });
      }
    });
    
    // Kernel routes (system/framework routes)
    this.app.use('/api', kernelRoutes);
    
    // API routes (controller-based business logic routes)
    this.app.use('/api', apiRoutes);

    // 404 handler
    this.app.use((req, res, next) => {
      return Response.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
    });
  }

  // Note: Error handling and graceful shutdown are now handled by the framework

  /**
   * Disconnect from all application services with optimized cleanup
   */
  async disconnectServices() {
    Logger.info('🔌 Disconnecting from application services...');
    
    // Cleanup memory monitoring first
    this.cleanupMemoryMonitoring();
    
    // Disconnect services in reverse dependency order for graceful shutdown
    const disconnectPromises = this.services.map(async ({ name, service }) => {
      const startTime = Date.now();
      
      try {
        // Special cleanup for specific services
        if (name === 'SSE' && service.cleanup && typeof service.cleanup === 'function') {
          service.cleanup();
          Logger.info(`   ✅ ${name} cleaned up`);
        } else if (name === 'Memory' && service.cleanup && typeof service.cleanup === 'function') {
          service.cleanup();
          Logger.info(`   ✅ ${name} monitoring stopped`);
        } else if (service.disconnect && typeof service.disconnect === 'function') {
          // Add timeout for disconnection to prevent hanging
          const disconnectPromise = service.disconnect();
          let timeoutId;
          const timeoutPromise = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve(), 10000); // 10s timeout
          });
          
          try {
            await Promise.race([disconnectPromise, timeoutPromise]);
          } finally {
            // Clear timeout to prevent Jest handles
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
          
          const disconnectTime = Date.now() - startTime;
          Logger.info(`   ✅ ${name} disconnected (${disconnectTime}ms)`);
        } else {
          Logger.info(`   ✅ ${name} (no cleanup needed)`);
        }
        
        // Clean up connection pools
        if (this.connectionPools.has(name)) {
          this.connectionPools.delete(name);
        }
        
      } catch (error) {
        Logger.warn(`   ⚠️ Error disconnecting ${name}:`, error.message);
      }
    });

    await Promise.allSettled(disconnectPromises);
    
    // Final cleanup
    this.connectionPools.clear();
    this.serviceHealthCache.clear();
    
    // Force garbage collection one last time
    if (global.gc) {
      try {
        global.gc();
        Logger.info('🧹 Final garbage collection completed');
      } catch (error) {
        Logger.warn('Failed final garbage collection:', error.message);
      }
    }
    
    Logger.info('Application services disconnected.');
  }

  /**
   * Cleanup memory monitoring resources
   */
  cleanupMemoryMonitoring() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    
    // Remove event listeners to prevent memory leaks
    process.removeListener('warning', this.handleMemoryWarning);
    
    Logger.info('🧠 Memory monitoring cleanup completed');
  }

  // Note: Service status and health checks are now handled by the framework
  
  /**
   * Override framework start method to add application-specific logging
   */
  async start(port = config.port) {
    const server = await super.start(port);
    
    // Add application-specific startup messages
    Logger.info(`📖 API documentation: http://localhost:${port}/api`);
    
    // Check if SSE service is enabled
    const enabledServices = servicesConfig.getEnabledServices();
    if (enabledServices.sse) {
      Logger.info(`📡 SSE endpoint: http://localhost:${port}/api/sse`);
    }
    
    return server;
  }
}

// Create and export the application instance
const application = new Application();

module.exports = application.getApp();
module.exports.application = application; 