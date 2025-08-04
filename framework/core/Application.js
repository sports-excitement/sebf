const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

/**
 * Core Application Framework
 * 
 * This is the main framework class that handles application bootstrapping.
 * DO NOT MODIFY THIS FILE - It's part of the core framework.
 * 
 * To customize the application, modify files in the /app directory.
 */
class CoreApplication {
  constructor(config = {}) {
    this.app = express();
    this.server = null;
    this.isShuttingDown = false;
    this.services = [];
    this.healthChecks = [];
    this.config = config;
    
    // Framework metadata
    this.frameworkVersion = require('../../package.json').version;
    this.frameworkName = 'Sports Excitement Core';
  }

  /**
   * Initialize the application with framework defaults
   */
  async initialize() {
    try {
      console.log(`🚀 Starting ${this.frameworkName} v${this.frameworkVersion}...`);
      
      // Setup framework middleware in order
      this.setupSecurity();
      this.setupParsing();
      this.setupCors();
      this.setupCompression();
      
      // Initialize services (delegated to application)
      if (this.config.initializeServices) {
        await this.config.initializeServices.call(this);
      }
      
      // Setup application middleware
      this.setupRateLimit();
      this.setupSession();
      this.setupLogging();
      this.setupRequestTracking();
      
      // Setup routes (delegated to application)
      if (this.config.setupRoutes) {
        this.config.setupRoutes.call(this);
      }
      
      // Setup error handling
      this.setupErrorHandling();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('✅ Framework initialization completed');
      return this.app;
      
    } catch (error) {
      console.error('❌ Framework initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup security middleware (Framework Core)
   */
  setupSecurity() {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));
  }

  /**
   * Setup parsing middleware (Framework Core)
   */
  setupParsing() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  /**
   * Setup CORS (Framework Core)
   */
  setupCors() {
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
    }));
  }

  /**
   * Setup compression (Framework Core)
   */
  setupCompression() {
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));
  }

  /**
   * Setup rate limiting (Framework Core)
   */
  setupRateLimit() {
    const servicesConfig = this.config.servicesConfig || {};
    const rateConfig = servicesConfig.rateLimit || {
      windowMs: 900000, // 15 minutes
      max: 100,
      standardHeaders: true,
      legacyHeaders: false
    };

    const limiter = rateLimit({
      ...rateConfig,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/api/health');
      }
    });

    this.app.use('/api', limiter);
  }

  /**
   * Setup session middleware (Delegated to Application)
   */
  setupSession() {
    if (this.config.sessionMiddleware) {
      this.app.use(this.config.sessionMiddleware);
    }
    if (this.config.sessionActivityMiddleware) {
      this.app.use(this.config.sessionActivityMiddleware);
    }
  }

  /**
   * Setup logging (Framework Core)
   */
  setupLogging() {
    const Logger = this.config.Logger;
    const appConfig = this.config.appConfig || {};
    
    if (appConfig.debug) {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', {
        stream: Logger ? {
          write: (message) => Logger.info(message.trim())
        } : process.stdout
      }));
    }
  }

  /**
   * Setup request tracking (Framework Core)
   */
  setupRequestTracking() {
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Add framework headers
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-API-Version', this.frameworkVersion);
      res.setHeader('X-Powered-By', this.frameworkName);
      
      next();
    });
  }

  /**
   * Setup error handling (Delegated to Application)
   */
  setupErrorHandling() {
    if (this.config.errorHandler) {
      this.app.use(this.config.errorHandler);
    }
  }

  /**
   * Setup graceful shutdown (Framework Core)
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      
      console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
      this.isShuttingDown = true;

      try {
        // Stop accepting new connections
        if (this.server) {
          this.server.close(() => {
            console.log('HTTP server closed');
          });
        }

        // Cleanup services (delegated to application)
        if (this.config.cleanupServices) {
          await this.config.cleanupServices.call(this);
        }

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * Add service to the framework
   */
  addService(name, service, required = false) {
    this.services.push({ name, service, required });
    if (service.testConnection) {
      this.healthChecks.push({ name, service });
    }
  }

  /**
   * Get framework service status
   */
  getServiceStatus() {
    return this.services.reduce((status, { name, service }) => {
      status[name.toLowerCase()] = {
        enabled: service.isEnabled ? service.isEnabled() : true,
        healthy: service.isHealthy ? service.isHealthy() : true
      };
      return status;
    }, {});
  }

  /**
   * Start the server (Framework Core)
   */
  async start(port = 3000) {
    try {
      await this.initialize();
      
      this.server = this.app.listen(port, () => {
        console.log(`🌟 ${this.frameworkName} is running on port ${port}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Health check: http://localhost:${port}/api/health`);
        console.log('🎉 Application ready to accept connections!');
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use`);
        } else {
          console.error('❌ Server error:', error);
        }
        process.exit(1);
      });

      return this.server;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Get the Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get health check information
   */
  async getHealthInfo() {
    const healthResults = {};
    
    for (const { name, service } of this.healthChecks) {
      try {
        if (service.testConnection && typeof service.testConnection === 'function') {
          healthResults[name.toLowerCase()] = await service.testConnection();
        } else {
          healthResults[name.toLowerCase()] = {
            status: 'connected',
            message: 'Service is operational'
          };
        }
      } catch (error) {
        healthResults[name.toLowerCase()] = {
          status: 'error',
          message: error.message
        };
      }
    }
    
    return healthResults;
  }
}

module.exports = CoreApplication;