const express = require('express');
const router = express.Router();

// Import middleware
const { healthAuth, optionalAuth } = require('../../app/Http/Middleware');
const SSEHelpers = require('../helpers/SSEHelpers');

// Import additional routes
const serviceRoutes = require('./services');

// Health check security configuration
const healthConfig = {
  // Security levels: 'public', 'protected', 'private', 'disabled'
  defaultLevel: process.env.HEALTH_CHECK_SECURITY_LEVEL || 'protected',
  enableDetailedHealth: process.env.HEALTH_ENABLE_DETAILED !== 'false',
  enableSystemInfo: process.env.HEALTH_ENABLE_SYSTEM_INFO !== 'false',
  enableServiceHealth: process.env.HEALTH_ENABLE_SERVICE_INFO !== 'false',
  enableVersionInfo: process.env.HEALTH_ENABLE_VERSION_INFO !== 'false',
  requireAPIKey: process.env.HEALTH_REQUIRE_API_KEY === 'true',
  maxSystemInfo: process.env.HEALTH_MAX_SYSTEM_INFO || 'basic', // 'none', 'basic', 'detailed'
  
  // Granular control over dangerous routes
  enableIndividualServiceHealth: process.env.HEALTH_ENABLE_INDIVIDUAL_SERVICES !== 'false',
  enableLivenessCheck: process.env.HEALTH_ENABLE_LIVENESS !== 'false',
  enableReadinessCheck: process.env.HEALTH_ENABLE_READINESS !== 'false',
  enableDynamicServiceCheck: process.env.HEALTH_ENABLE_DYNAMIC_SERVICES !== 'false',
  
  // Dangerous information control
  exposePID: process.env.HEALTH_EXPOSE_PID === 'true',
  exposeMemoryDetails: process.env.HEALTH_EXPOSE_MEMORY_DETAILS === 'true',
  exposePlatformInfo: process.env.HEALTH_EXPOSE_PLATFORM === 'true',
  exposeServiceConnectionDetails: process.env.HEALTH_EXPOSE_SERVICE_DETAILS === 'true',
  exposeDependencyVersions: process.env.HEALTH_EXPOSE_DEPENDENCY_VERSIONS === 'true',
  
  // Production safety
  disableInProduction: process.env.HEALTH_DISABLE_IN_PRODUCTION === 'true',
  productionSafeMode: process.env.HEALTH_PRODUCTION_SAFE_MODE !== 'false'
};

// Health route security helper
function isHealthRouteDisabled(routeType = 'basic') {
  // Check if health checks are completely disabled
  if (healthConfig.defaultLevel === 'disabled') {
    return true;
  }
  
  // Check if disabled in production
  if (process.env.NODE_ENV === 'production' && healthConfig.disableInProduction) {
    return true;
  }
  
  // Check specific route type restrictions
  if (routeType === 'detailed' && !healthConfig.enableDetailedHealth) {
    return true;
  }
  
  if (routeType === 'individual' && !healthConfig.enableIndividualServiceHealth) {
    return true;
  }
  
  if (routeType === 'liveness' && !healthConfig.enableLivenessCheck) {
    return true;
  }
  
  if (routeType === 'readiness' && !healthConfig.enableReadinessCheck) {
    return true;
  }
  
  if (routeType === 'dynamic' && !healthConfig.enableDynamicServiceCheck) {
    return true;
  }
  
  return false;
}

function sanitizeHealthResponse(data, isAuthenticated = false) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  // Production safety mode - remove sensitive info unless authenticated
  if (process.env.NODE_ENV === 'production' && healthConfig.productionSafeMode && !isAuthenticated) {
    // Remove PID unless explicitly allowed
    if (!healthConfig.exposePID && sanitized.pid) {
      delete sanitized.pid;
    }
    
    // Sanitize memory information
    if (!healthConfig.exposeMemoryDetails && (sanitized.memory || sanitized.system?.memory)) {
      if (sanitized.memory) {
        sanitized.memory = { status: 'monitored' };
      }
      if (sanitized.system?.memory) {
        sanitized.system.memory = { status: 'monitored' };
      }
    }
    
    // Remove platform information
    if (!healthConfig.exposePlatformInfo) {
      delete sanitized.platform;
      delete sanitized.nodeVersion;
      if (sanitized.system) {
        delete sanitized.system.platform;
        delete sanitized.system.nodeVersion;
      }
    }
    
    // Sanitize service connection details
    if (!healthConfig.exposeServiceConnectionDetails && sanitized.services) {
      Object.keys(sanitized.services).forEach(serviceName => {
        if (sanitized.services[serviceName] && typeof sanitized.services[serviceName] === 'object') {
          sanitized.services[serviceName] = {
            status: sanitized.services[serviceName].status,
            message: sanitized.services[serviceName].status === 'connected' ? 'operational' : 'unavailable'
          };
        }
      });
    }
    
    // Remove dependency versions
    if (!healthConfig.exposeDependencyVersions && sanitized.dependencies) {
      delete sanitized.dependencies;
    }
  }
  
  return sanitized;
}

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
    // Check if health checks are disabled
    if (isHealthRouteDisabled('basic')) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    // Require API key if configured
    if (healthConfig.requireAPIKey && !req.authenticated) {
      return res.status(401).json({
        success: false,
        message: 'API key required for health check access'
      });
    }

    const packageJson = require('../../package.json');
    let responseData = {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };

    // Add basic system info based on security level
    if (healthConfig.enableSystemInfo && healthConfig.maxSystemInfo !== 'none') {
      if (healthConfig.maxSystemInfo === 'basic' || healthConfig.defaultLevel === 'public') {
        responseData.uptime = Math.floor(process.uptime());
        responseData.environment = process.env.NODE_ENV || 'development';
      }
      
      if (healthConfig.maxSystemInfo === 'detailed' && (req.authenticated || healthConfig.defaultLevel === 'protected')) {
        responseData.memory = {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        };
        
        // Only expose PID if explicitly allowed
        if (healthConfig.exposePID || process.env.NODE_ENV !== 'production') {
          responseData.pid = process.pid;
        }
      }
    }

    // Add version info if enabled
    if (healthConfig.enableVersionInfo) {
      responseData.version = packageJson.version || '1.0.0';
    }

    // Sanitize response for production
    responseData = sanitizeHealthResponse(responseData, req.authenticated);

    res.json({
      success: true,
      message: 'System is healthy',
      data: responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'System unavailable'
    });
  }
});

// Detailed Health Check
router.get('/health/detailed', healthAuth, async (req, res) => {
  try {
    // Check if detailed health checks are disabled
    if (isHealthRouteDisabled('detailed')) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    // Require authentication for detailed health checks
    const hasAccess = req.authenticated || 
                     (req.headers['x-health-api-key'] === process.env.HEALTH_CHECK_API_KEY) ||
                     (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') ||
                     (!process.env.HEALTH_CHECK_API_KEY && healthConfig.defaultLevel === 'public');

    if (!hasAccess) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for detailed health information'
      });
    }

    let responseData = {
      timestamp: new Date().toISOString()
    };

    // Test services if enabled
    if (healthConfig.enableServiceHealth) {
      const services = {};
      
      // Only test services that are enabled and safe to expose
      if (process.env.NODE_ENV !== 'production' || req.authenticated || !healthConfig.productionSafeMode) {
        services.database = await prismaService.healthCheck();
        services.redis = await RedisService.testConnection();
        services.typesense = await TypesenseService.testConnection();  
        services.minio = await MinioService.testConnection();
        services.supabase = await SupabaseService.testConnection();
        services.firebase = await FirebaseService.testConnection();
        services.sse = await SSEService.testConnection();
      }

      responseData.services = services;

      // Determine overall status
      const hasErrors = Object.values(services).some(service => service.status === 'error');
      responseData.status = hasErrors ? 'degraded' : 'healthy';
    } else {
      responseData.status = 'healthy';
    }

    // Add system information based on security level
    if (healthConfig.enableSystemInfo && healthConfig.maxSystemInfo !== 'none') {
      const system = {};
      
      if (healthConfig.maxSystemInfo === 'basic' || (healthConfig.maxSystemInfo === 'detailed' && req.authenticated)) {
        system.uptime = Math.floor(process.uptime());
        system.environment = process.env.NODE_ENV || 'development';
        
        if (healthConfig.maxSystemInfo === 'detailed' && req.authenticated) {
          // Only include detailed info if explicitly allowed or in non-production
          if (healthConfig.exposeMemoryDetails || process.env.NODE_ENV !== 'production') {
            system.memory = process.memoryUsage();
            system.cpu = process.cpuUsage();
          }
          
          if (healthConfig.exposePID || process.env.NODE_ENV !== 'production') {
            system.pid = process.pid;
          }
          
          if (healthConfig.exposePlatformInfo || process.env.NODE_ENV !== 'production') {
            system.platform = process.platform;
            system.nodeVersion = process.version;
          }
        }
      }
      
      responseData.system = system;
    }

    // Sanitize response for production safety
    responseData = sanitizeHealthResponse(responseData, req.authenticated);

    res.json({
      success: true,
      message: 'Detailed health check completed',
      data: responseData
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Detailed health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'System unavailable'
    });
  }
});

// Individual Service Health Checks
router.get('/health/db', healthAuth, async (req, res) => {
  try {
    // Check if individual service health checks are disabled
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

    let health = await prismaService.healthCheck();
    health = sanitizeHealthResponse(health, req.authenticated);
    
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
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    let health = await RedisService.testConnection();
    health = sanitizeHealthResponse(health, req.authenticated);
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
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    let health = await TypesenseService.testConnection();
    health = sanitizeHealthResponse(health, req.authenticated);
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
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    let health = await MinioService.testConnection();
    health = sanitizeHealthResponse(health, req.authenticated);
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
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    let health = await SupabaseService.testConnection();
    health = sanitizeHealthResponse(health, req.authenticated);
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
    if (isHealthRouteDisabled('individual')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    
    let health = await FirebaseService.testConnection();
    health = sanitizeHealthResponse(health, req.authenticated);
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
    if (!healthConfig.enableVersionInfo || isHealthRouteDisabled('basic')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const packageJson = require('../../package.json');
    let responseData = {
      name: packageJson.name || 'Sports Excitement Backend',
      version: packageJson.version || '1.0.0',
      description: packageJson.description || 'Custom Node.js Backend Framework',
      buildInfo: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Only include dependency versions if explicitly allowed
    if (healthConfig.exposeDependencyVersions || process.env.NODE_ENV !== 'production') {
      responseData.dependencies = {
        node: process.version
      };
      responseData.buildInfo.nodeVersion = process.version;
    }

    // Sanitize response for production
    responseData = sanitizeHealthResponse(responseData, req.authenticated);

    res.json({
      success: true,
      message: 'Version information',
      data: responseData
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
    if (isHealthRouteDisabled('readiness')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // Check if all critical services are ready
    const ready = true; // In a real app, you'd check service readiness
    let responseData = {
      ready: ready,
      timestamp: new Date().toISOString()
    };

    // Only include service details if safe to expose
    if (healthConfig.enableServiceHealth && (process.env.NODE_ENV !== 'production' || !healthConfig.productionSafeMode)) {
      responseData.services = {
        database: 'ready',
        redis: 'ready'
      };
    }

    responseData = sanitizeHealthResponse(responseData, req.authenticated);

    res.json({
      success: true,
      message: 'Readiness check',
      data: responseData
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
    if (isHealthRouteDisabled('liveness')) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    let responseData = {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    // Only expose PID if explicitly allowed
    if (healthConfig.exposePID || process.env.NODE_ENV !== 'production') {
      responseData.pid = process.pid;
    }

    responseData = sanitizeHealthResponse(responseData, req.authenticated);

    res.json({
      success: true,
      message: 'Liveness check',
      data: responseData
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
    if (isHealthRouteDisabled('dynamic')) {
      return res.status(404).json({
        success: false,
        message: 'Not found'
      });
    }

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

    // Sanitize health response for production safety
    health = sanitizeHealthResponse(health, req.authenticated);

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