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
}); 