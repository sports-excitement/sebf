// Framework Core
const CoreApplication = require('../framework/core/Application');

// Configuration
const config = require('../config/app');
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
  }

  // Note: initialization is now handled by the framework core

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
   * Initialize a single service
   */
  async initializeService(name, service, required = false) {
    try {
      Logger.info(`   Initializing ${name}...`);
      
      if (service.connect && typeof service.connect === 'function') {
        // Add timeout for service connections to prevent hanging
        const connectPromise = service.connect();
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`${name} connection timeout`)), 15000);
        });
        
        try {
          const connected = await Promise.race([connectPromise, timeoutPromise]);
          
          if (connected) {
            this.addService(name, service, required);
            Logger.info(`   ✅ ${name} connected`);
          } else {
            if (required) {
              throw new Error(`${name} connection failed`);
            }
            Logger.warn(`   ⚠️ ${name} connection failed (optional service)`);
          }
        } catch (error) {
          throw error;
        } finally {
          clearTimeout(timeoutId); // Always clear timeout
        }
      } else {
        // Service doesn't need connection (like MemoryService)
        this.addService(name, service, required);
        Logger.info(`   ✅ ${name} initialized`);
      }
      
    } catch (error) {
      if (required) {
        Logger.error(`   ❌ ${name} initialization failed:`, error.message);
        
        // For database connection failures, provide recovery suggestions
        if (name === 'Database' && process.env.NODE_ENV === 'development') {
          Logger.error('   💡 Database connection failed. The server will continue without database functionality.');
          Logger.error('   💡 Please check your DATABASE_URL and ensure the database server is running.');
          
          // Don't throw in development for database - let app start without it
          Logger.warn(`   ⚠️ ${name} failed but continuing in development mode`);
          return;
        }
        
        throw error;
      } else {
        Logger.warn(`   ⚠️ ${name} initialization failed (optional):`, error.message);
      }
    }
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
   * Disconnect from all application services
   */
  async disconnectServices() {
    Logger.info('🔌 Disconnecting from application services...');
    
    const disconnectPromises = this.services.map(async ({ name, service }) => {
      try {
        // Special cleanup for specific services
        if (name === 'SSE' && service.cleanup && typeof service.cleanup === 'function') {
          service.cleanup();
          Logger.info(`   ✅ ${name} cleaned up`);
        } else if (name === 'Memory' && service.cleanup && typeof service.cleanup === 'function') {
          service.cleanup();
          Logger.info(`   ✅ ${name} monitoring stopped`);
        } else if (service.disconnect && typeof service.disconnect === 'function') {
          await service.disconnect();
          Logger.info(`   ✅ ${name} disconnected`);
        } else {
          Logger.info(`   ✅ ${name} (no cleanup needed)`);
        }
      } catch (error) {
        Logger.warn(`   ⚠️ Error disconnecting ${name}:`, error.message);
      }
    });

    await Promise.allSettled(disconnectPromises);
    Logger.info('Application services disconnected.');
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