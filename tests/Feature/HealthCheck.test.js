const request = require('supertest');
const { application } = require('../../bootstrap/app');

describe('Health Check API', () => {
  let app;

  beforeAll(async () => {
    // Initialize the application
    app = await application.initialize();
  });

  afterAll(async () => {
    // Cleanup
    await application.disconnectServices();
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('environment');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('services');
    });

    it('should include version in response headers', async () => {
      const res = await request(app).get('/');

      expect(res.headers).toHaveProperty('x-api-version');
      expect(res.headers).toHaveProperty('x-request-id');
      expect(res.headers).toHaveProperty('x-powered-by');
    });
  });

  describe('GET /api', () => {
    it('should return API information and endpoints', async () => {
      const res = await request(app).get('/api');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('endpoints');
    });
  });

  describe('GET /api/health', () => {
    it('should return basic health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('memory');
      expect(res.body.data.status).toBe('healthy');
    });

    it('should include system information', async () => {
      const res = await request(app).get('/api/health');

      expect(res.body.data.memory).toHaveProperty('rss');
      expect(res.body.data.memory).toHaveProperty('heapTotal');
      expect(res.body.data.memory).toHaveProperty('heapUsed');
      expect(typeof res.body.data.uptime).toBe('number');
      expect(typeof res.body.data.pid).toBe('number');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health status with services', async () => {
      const res = await request(app).get('/api/health/detailed');

      expect([200, 503]).toContain(res.statusCode); // Might be degraded if services are down
      expect(res.body).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('services');
      expect(res.body.data).toHaveProperty('system');
    });

    it('should include service statuses', async () => {
      const res = await request(app).get('/api/health/detailed');

      const services = res.body.data.services;
      expect(services).toHaveProperty('database');
      
      // Services might be optional, so we check if they exist
      if (services.redis) {
        expect(services.redis).toHaveProperty('status');
        expect(services.redis).toHaveProperty('responseTime');
      }
      
      if (services.typesense) {
        expect(services.typesense).toHaveProperty('status');
        expect(services.typesense).toHaveProperty('responseTime');
      }
    });

    it('should include system metrics', async () => {
      const res = await request(app).get('/api/health/detailed');

      const system = res.body.data.system;
      expect(system).toHaveProperty('memory');
      expect(system).toHaveProperty('cpu');
      expect(system).toHaveProperty('pid');
      expect(system).toHaveProperty('platform');
      expect(system).toHaveProperty('nodeVersion');
    });
  });

  describe('GET /api/health/services/:service', () => {
    it('should return database health status', async () => {
      const res = await request(app).get('/api/health/services/database');

      expect([200, 503]).toContain(res.statusCode);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('message');
    });

    it('should return 400 for invalid service name', async () => {
      const res = await request(app).get('/api/health/services/invalid');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid service name');
    });

    it('should list available services in error message', async () => {
      const res = await request(app).get('/api/health/services/invalid');

      expect(res.body.message).toContain('database');
      expect(res.body.message).toContain('redis');
      expect(res.body.message).toContain('typesense');
    });
  });

  describe('GET /api/health/version', () => {
    it('should return version information', async () => {
      const res = await request(app).get('/api/health/version');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('description');
      expect(res.body.data).toHaveProperty('dependencies');
      expect(res.body.data.dependencies).toHaveProperty('node');
    });

    it('should include build information', async () => {
      const res = await request(app).get('/api/health/version');

      expect(res.body.data).toHaveProperty('buildInfo');
      expect(res.body.data.buildInfo).toHaveProperty('timestamp');
      expect(res.body.data.buildInfo).toHaveProperty('environment');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return readiness status', async () => {
      const res = await request(app).get('/api/health/ready');

      expect([200, 503]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('success');
      expect(res.body.data).toHaveProperty('ready');
      expect(typeof res.body.data.ready).toBe('boolean');
    });
  });

  describe('GET /api/health/live', () => {
    it('should return liveness status', async () => {
      const res = await request(app).get('/api/health/live');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('alive');
      expect(res.body.data.alive).toBe(true);
      expect(res.body.data).toHaveProperty('uptime');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should include request tracking headers', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers).toHaveProperty('x-request-id');
      expect(res.headers).toHaveProperty('x-api-version');
    });
  });

  describe('Rate Limiting', () => {
    it('should not rate limit health checks', async () => {
      // Make multiple rapid requests to health endpoint
      const promises = Array(10).fill().map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed (no rate limiting on health checks)
      responses.forEach(res => {
        expect(res.statusCode).toBe(200);
      });
    });
  });

  describe('Response Format', () => {
    it('should have consistent response format', async () => {
      const res = await request(app).get('/api/health');

      expect(res.body).toHaveProperty('success');
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.success).toBe('boolean');
      expect(typeof res.body.message).toBe('string');
      expect(typeof res.body.timestamp).toBe('string');
    });

    it('should return valid timestamps', async () => {
      const res = await request(app).get('/api/health');

      const timestamp = new Date(res.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
}); 