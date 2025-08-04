const express = require('express');
const router = express.Router();
const servicesConfig = require('../config/services');
const { healthAuth } = require('../../app/Http/Middleware');

/**
 * Service Management Routes
 * These routes help manage and monitor service configurations
 */

// Get all services status
router.get('/services', healthAuth, (req, res) => {
  try {
    const allServices = servicesConfig.getAllServices();
    const enabledServices = servicesConfig.getEnabledServices();
    
    const serviceList = Object.entries(allServices).map(([name, config]) => ({
      name,
      enabled: config.enabled,
      required: config.required,
      configured: config.configured,
      status: config.enabled ? (config.configured ? 'active' : 'misconfigured') : 'disabled'
    }));

    res.json({
      success: true,
      message: 'Service status retrieved',
      data: {
        summary: {
          total: serviceList.length,
          enabled: Object.values(enabledServices).filter(Boolean).length,
          disabled: serviceList.filter(s => !s.enabled).length,
          misconfigured: serviceList.filter(s => s.enabled && !s.configured).length
        },
        services: serviceList
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service status',
      error: error.message
    });
  }
});

// Get specific service configuration
router.get('/services/:serviceName', healthAuth, (req, res) => {
  try {
    const serviceName = req.params.serviceName;
    const serviceConfig = servicesConfig.getServiceConfig(serviceName);
    
    if (!serviceConfig) {
      return res.status(404).json({
        success: false,
        message: `Service '${serviceName}' not found`,
        availableServices: Object.keys(servicesConfig.getAllServices())
      });
    }

    // Remove sensitive information from response
    const sanitizedConfig = { ...serviceConfig };
    ['password', 'secret', 'key', 'apiKey', 'accessKey', 'secretKey', 'serviceAccountKey'].forEach(key => {
      if (sanitizedConfig[key]) {
        sanitizedConfig[key] = '[HIDDEN]';
      }
    });

    res.json({
      success: true,
      message: `Service '${serviceName}' configuration`,
      data: {
        service: serviceName,
        ...sanitizedConfig,
        canDisable: servicesConfig.canDisableService(serviceName)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service configuration',
      error: error.message
    });
  }
});

// Get service dependencies
router.get('/services/dependencies', healthAuth, (req, res) => {
  try {
    const dependencies = servicesConfig.getServiceDependencies();
    
    res.json({
      success: true,
      message: 'Service dependencies retrieved',
      data: {
        dependencies,
        note: 'These show which services depend on others. Disabling a service may affect its dependents.'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get service dependencies',
      error: error.message
    });
  }
});

// Get service configuration help
router.get('/services/help/configuration', (req, res) => {
  try {
    const environmentVariables = {
      database: {
        required: ['DATABASE_URL'],
        optional: ['DATABASE_ENABLED', 'DB_MAX_CONNECTIONS', 'DB_CONNECTION_TIMEOUT']
      },
      redis: {
        required: [],
        optional: ['REDIS_ENABLED', 'REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD', 'REDIS_DATABASE']
      },
      typesense: {
        required: ['TYPESENSE_API_KEY'],
        optional: ['TYPESENSE_ENABLED', 'TYPESENSE_HOST', 'TYPESENSE_PORT', 'TYPESENSE_PROTOCOL']
      },
      minio: {
        required: ['MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'],
        optional: ['MINIO_ENABLED', 'MINIO_ENDPOINT', 'MINIO_PORT', 'MINIO_USE_SSL', 'MINIO_BUCKET']
      },
      supabase: {
        required: ['SUPABASE_URL', 'SUPABASE_KEY'],
        optional: ['SUPABASE_ENABLED']
      },
      firebase: {
        required: ['FIREBASE_SERVICE_ACCOUNT_KEY'],
        optional: ['FIREBASE_ENABLED', 'FIREBASE_DATABASE_URL', 'FIREBASE_STORAGE_BUCKET']
      },
      sse: {
        required: [],
        optional: ['SSE_ENABLED', 'SSE_HEARTBEAT_INTERVAL', 'SSE_MAX_CONNECTIONS']
      },
      memory: {
        required: [],
        optional: ['MEMORY_ENABLED', 'MEMORY_MONITOR_INTERVAL', 'MEMORY_THRESHOLD']
      },
      email: {
        required: ['EMAIL_HOST'],
        optional: ['EMAIL_ENABLED', 'EMAIL_PORT', 'EMAIL_SECURE', 'EMAIL_USER', 'EMAIL_PASS']
      }
    };

    const examples = {
      enableService: {
        description: 'Enable a service explicitly',
        example: 'REDIS_ENABLED=true'
      },
      disableService: {
        description: 'Disable a service explicitly',
        example: 'TYPESENSE_ENABLED=false'
      },
      autoDetection: {
        description: 'Let the system auto-detect based on required config',
        example: 'Set TYPESENSE_API_KEY and the service will be auto-enabled'
      }
    };

    res.json({
      success: true,
      message: 'Service configuration help',
      data: {
        environmentVariables,
        examples,
        notes: [
          'Services are auto-enabled when their required environment variables are set',
          'You can explicitly enable/disable services using [SERVICE]_ENABLED=true/false',
          'Required services cannot be disabled',
          'Check .env.services.example for complete configuration examples'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration help',
      error: error.message
    });
  }
});

module.exports = router;