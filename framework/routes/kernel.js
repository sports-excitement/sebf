const express = require('express');
const router = express.Router();

// Import middleware
const { healthAuth, optionalAuth } = require('../../app/Http/Middleware');
const SSEHelpers = require('../helpers/SSEHelpers');

// Import additional routes
const serviceRoutes = require('./services');

// Import services
const { prismaService } = require('../config/prisma');
const RedisService = require('../services/RedisService');
const TypesenseService = require('../services/TypesenseService');
const MinioService = require('../services/MinioService');
const SupabaseService = require('../services/SupabaseService');
const FirebaseService = require('../services/FirebaseService');
const SSEService = require('../services/SSEService');

// =============================================================================
// SYSTEM INFORMATION ROUTES
// =============================================================================

// API Information
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Sports Excitement Core API',
    data: {
      name: process.env.APP_NAME || 'Sports Excitement Core',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.APP_ENV || 'development',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/api/health',
        users: '/api/users',
        auth: '/api/auth',
        sse: '/api/sse'
      }
    }
  });
});

// =============================================================================
// HEALTH CHECK ROUTES (Public or API Key protected)
// =============================================================================

// Basic Health Check
router.get('/health', healthAuth, async (req, res) => {
  try {
    const packageJson = require('../../package.json');
    res.json({
      success: true,
      message: 'System is healthy',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: packageJson.version || '1.0.0',
        memory: process.memoryUsage(),
        pid: process.pid
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Detailed Health Check
router.get('/health/detailed', healthAuth, async (req, res) => {
  try {
    // Check if user is authenticated or has health check API key
    const hasAccess = req.authenticated || 
                     (req.headers['x-health-api-key'] === process.env.HEALTH_CHECK_API_KEY) ||
                     (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') ||
                     !process.env.HEALTH_CHECK_API_KEY; // Allow access if no API key is configured

    if (!hasAccess) {
      return res.status(401).json({
        success: false,
        message: 'Health check API key or authentication required'
      });
    }

    const services = {};

    // Test all services
    services.database = await prismaService.healthCheck();
    services.redis = await RedisService.testConnection();
    services.typesense = await TypesenseService.testConnection();
    services.minio = await MinioService.testConnection();
    services.supabase = await SupabaseService.testConnection();
    services.firebase = await FirebaseService.testConnection();
    services.sse = await SSEService.testConnection();

    // Determine overall status
    const hasErrors = Object.values(services).some(service => service.status === 'error');
    const overall = hasErrors ? 'degraded' : 'healthy';

    res.json({
      success: true,
      message: 'Detailed health check completed',
      data: {
        status: overall,
        services: services,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

// Individual Service Health Checks
router.get('/health/db', healthAuth, async (req, res) => {
  try {
    const health = await prismaService.healthCheck();
    const status = health.status === 'connected' ? 200 : 503;
    res.status(status).json({
      success: health.status === 'connected',
      message: 'Database health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message
    });
  }
});

router.get('/health/redis', healthAuth, async (req, res) => {
  try {
    const health = await RedisService.testConnection();
    const status = health.status === 'connected' ? 200 : 503;
    res.status(status).json({
      success: health.status === 'connected',
      message: 'Redis health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Redis health check failed',
      error: error.message
    });
  }
});

router.get('/health/typesense', healthAuth, async (req, res) => {
  try {
    const health = await TypesenseService.testConnection();
    const status = ['connected', 'disabled'].includes(health.status) ? 200 : 503;
    res.status(status).json({
      success: ['connected', 'disabled'].includes(health.status),
      message: 'Typesense health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Typesense health check failed',
      error: error.message
    });
  }
});

router.get('/health/minio', healthAuth, async (req, res) => {
  try {
    const health = await MinioService.testConnection();
    const status = ['connected', 'disabled'].includes(health.status) ? 200 : 503;
    res.status(status).json({
      success: ['connected', 'disabled'].includes(health.status),
      message: 'MinIO health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'MinIO health check failed',
      error: error.message
    });
  }
});

router.get('/health/supabase', healthAuth, async (req, res) => {
  try {
    const health = await SupabaseService.testConnection();
    const status = ['connected', 'disabled'].includes(health.status) ? 200 : 503;
    res.status(status).json({
      success: ['connected', 'disabled'].includes(health.status),
      message: 'Supabase health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Supabase health check failed',
      error: error.message
    });
  }
});

router.get('/health/firebase', healthAuth, async (req, res) => {
  try {
    const health = await FirebaseService.testConnection();
    const status = ['connected', 'disabled'].includes(health.status) ? 200 : 503;
    res.status(status).json({
      success: ['connected', 'disabled'].includes(health.status),
      message: 'Firebase health check',
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Firebase health check failed',
      error: error.message
    });
  }
});

// Version information
router.get('/health/version', (req, res) => {
  try {
    const packageJson = require('../../package.json');
    res.json({
      success: true,
      message: 'Version information',
      data: {
        name: packageJson.name || 'Sports Excitement Backend',
        version: packageJson.version || '1.0.0',
        description: packageJson.description || 'Custom Node.js Backend Framework',
        dependencies: {
          node: process.version
        },
        buildInfo: {
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get version information',
      error: error.message
    });
  }
});

// Readiness check
router.get('/health/ready', (req, res) => {
  try {
    // Check if all critical services are ready
    const ready = true; // In a real app, you'd check service readiness
    res.json({
      success: true,
      message: 'Readiness check',
      data: {
        ready: ready,
        timestamp: new Date().toISOString(),
        services: {
          database: 'ready',
          redis: 'ready'
        }
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Readiness check failed',
      data: {
        ready: false
      }
    });
  }
});

// Liveness check
router.get('/health/live', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Liveness check',
      data: {
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Liveness check failed',
      data: {
        alive: false
      }
    });
  }
});

// Dynamic service health check
router.get('/health/services/:service', async (req, res) => {
  try {
    const serviceName = req.params.service;
    const availableServices = ['database', 'redis', 'typesense', 'minio', 'supabase', 'firebase', 'sse'];
    
    if (!availableServices.includes(serviceName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service name '${serviceName}'. Available services: ${availableServices.join(', ')}`
      });
    }

    let health;
    switch (serviceName) {
      case 'database':
        health = await prismaService.healthCheck();
        break;
      case 'redis':
        health = await RedisService.testConnection();
        break;
      case 'typesense':
        health = await TypesenseService.testConnection();
        break;
      case 'minio':
        health = await MinioService.testConnection();
        break;
      case 'supabase':
        health = await SupabaseService.testConnection();
        break;
      case 'firebase':
        health = await FirebaseService.testConnection();
        break;
      case 'sse':
        health = await SSEService.testConnection();
        break;
      default:
        throw new Error(`Service ${serviceName} not implemented`);
    }

    const status = ['connected', 'disabled'].includes(health.status) ? 200 : 503;
    res.status(status).json({
      success: ['connected', 'disabled'].includes(health.status),
      message: `${serviceName} health check`,
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: `${req.params.service} health check failed`,
      error: error.message
    });
  }
});

// =============================================================================
// SERVER-SENT EVENTS ROUTES (Optional Auth)
// =============================================================================

// SSE Connection (Optional Auth - user info if available)
router.get('/sse', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || null;
    const channels = req.query.channels ? req.query.channels.split(',') : ['general'];
    
    SSEService.addConnection(req, res, userId, channels);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to establish SSE connection',
      error: error.message
    });
  }
});

// SSE Channel Subscription (Optional Auth)
router.get('/sse/subscribe/:channel', optionalAuth, (req, res) => {
  try {
    const userId = req.user?.id || null;
    const channel = req.params.channel;
    
    SSEService.addConnection(req, res, userId, [channel]);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to SSE channel',
      error: error.message
    });
  }
});

// =============================================================================
// GENERIC SYSTEM ROUTES
// =============================================================================

// Session Management (Generic)
router.get('/session-info', (req, res) => {
  const { SessionHelpers } = require('../app/Http/Middleware');
  
  res.json({
    success: true,
    message: 'Session information retrieved',
    data: {
      user: req.user || null,
      session: SessionHelpers ? SessionHelpers.getSessionInfo(req) : null,
      authenticated: !!req.user,
      timestamp: new Date().toISOString()
    }
  });
});

router.post('/session/destroy', async (req, res) => {
  try {
    const { SessionHelpers } = require('../../app/Http/Middleware');
    if (SessionHelpers && req.session) {
      await SessionHelpers.destroySession(req);
    }
    
    res.json({
      success: true,
      message: 'Session destroyed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to destroy session',
      error: error.message
    });
  }
});

// =============================================================================
// TESTING ROUTES (Development only)
// =============================================================================

if (process.env.APP_ENV === 'development' || process.env.APP_ENV === 'testing') {
  const { auth, validate, schemas } = require('../../app/Http/Middleware');
  
  // Protected route demo
  router.get('/protected', auth, (req, res) => {
    res.json({
      success: true,
      message: 'This is a protected route',
      data: {
        user: req.user,
        authenticated: req.authenticated,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Validation demo  
  router.post('/test/validation', validate(schemas.userRegistration), (req, res) => {
    res.json({
      success: true,
      message: 'Validation passed',
      data: req.body
    });
  });

  // Error demo
  router.get('/test/error', (req, res) => {
    throw new Error('This is a test error');
  });
}

// Mount service management routes
router.use('/admin', serviceRoutes);

module.exports = router;