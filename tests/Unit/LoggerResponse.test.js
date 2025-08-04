/**
 * Logger and Response Helper Tests
 * 
 * This test file demonstrates how to use the enhanced Logger and Response helpers
 * with proper testing support and debugging capabilities.
 */

const Logger = require('../../framework/helpers/Logger');
const Response = require('../../framework/helpers/Response');

describe('Logger Helper Tests', () => {
  beforeEach(() => {
    Logger.clearTestLogs();
  });

  describe('Core Functionality', () => {
    it('should log messages and provide test utilities', () => {
      // Test basic logging and specialized methods
      Logger.info('Info message');
      Logger.api('API call made', { endpoint: '/test' });
      Logger.auth('User authenticated', { userId: 123 });
      Logger.test('Test-specific log', { testData: true });

      // Test retrieval utilities
      const allLogs = Logger.getTestLogs();
      expect(allLogs.length).toBe(4);
      
      const apiLogs = Logger.findTestLogs('API call');
      expect(apiLogs.length).toBe(1);
      expect(apiLogs[0].message).toContain('[API]');
      
      const lastLog = Logger.getLastTestLog();
      expect(lastLog.message).toContain('Test-specific');
    });

    it('should provide timing and force logging utilities', () => {
      // Test timing
      const timer = Logger.timing('test operation');
      const start = Date.now();
      while (Date.now() - start < 5) { /* wait */ }
      const duration = timer.end();
      expect(duration).toBeGreaterThan(0);

      // Test force logging
      Logger.forceLog('info', 'Force logged message');
      const forceLogs = Logger.getTestLogs().filter(log => log.level.includes('FORCE'));
      expect(forceLogs.length).toBe(1);
      expect(forceLogs[0].message).toContain('Force logged');
    });

    it('should handle test logging configuration', () => {
      const originalSetting = process.env.ENABLE_TEST_LOGGING;
      
      process.env.ENABLE_TEST_LOGGING = 'false';
      expect(Logger.isTestLoggingEnabled()).toBe(false);
      
      process.env.ENABLE_TEST_LOGGING = 'true';
      expect(Logger.isTestLoggingEnabled()).toBe(true);
      
      process.env.ENABLE_TEST_LOGGING = originalSetting;
    });
  });
});

describe('Response Helper Tests', () => {
  let mockRes;

  beforeEach(() => {
    // Create a fresh mock response and clear test responses
    mockRes = Response.createMockResponse();
    Response.clearTestResponses();
  });

  describe('Success Responses', () => {
    it('should create successful response and track it', () => {
      const message = 'Operation successful';
      const data = { id: 1, name: 'Test' };

      Response.success(mockRes, message, data);

      // Check that response was called correctly
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalled();

      // Check the response data
      const sentData = mockRes.sentData.json;
      expect(sentData.success).toBe(true);
      expect(sentData.message).toBe(message);
      expect(sentData.data).toEqual(data);

      // Check test responses tracking
      const testResponses = Response.getTestResponses();
      expect(testResponses.length).toBe(1);
      expect(testResponses[0].success).toBe(true);
      expect(testResponses[0].statusCode).toBe(200);
    });

    it('should create different types of success responses', () => {
      Response.success(mockRes, 'Success', null, 200);
      Response.created(mockRes, 'Created', { id: 1 });
      Response.noContent(mockRes);

      const testResponses = Response.getTestResponses();
      expect(testResponses.length).toBe(2); // noContent doesn't track metrics
      
      const successResponses = Response.getTestResponsesByStatus(200);
      const createdResponses = Response.getTestResponsesByStatus(201);
      
      expect(successResponses.length).toBe(1);
      expect(createdResponses.length).toBe(1);
    });
  });

  describe('Error Responses', () => {
    it('should create error response and track it', () => {
      const message = 'Operation failed';
      const error = { code: 'VALIDATION_ERROR', details: 'Invalid input' };

      Response.error(mockRes, message, error, 400);

      // Check that response was called correctly
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalled();

      // Check the response data
      const sentData = mockRes.sentData.json;
      expect(sentData.success).toBe(false);
      expect(sentData.message).toBe(message);
      expect(sentData.error).toEqual(error);

      // Check test responses tracking
      const testResponses = Response.getTestResponses();
      expect(testResponses.length).toBe(1);
      expect(testResponses[0].success).toBe(false);
      expect(testResponses[0].statusCode).toBe(400);
    });

    it('should create different types of error responses', () => {
      Response.badRequest(mockRes, 'Bad request');
      Response.unauthorized(mockRes, 'Unauthorized');
      Response.forbidden(mockRes, 'Forbidden');
      Response.notFound(mockRes, 'Not found');
      Response.internalServerError(mockRes, 'Server error');

      const testResponses = Response.getTestResponses();
      expect(testResponses.length).toBe(5);

      const badRequestResponses = Response.getTestResponsesByStatus(400);
      const unauthorizedResponses = Response.getTestResponsesByStatus(401);
      const forbiddenResponses = Response.getTestResponsesByStatus(403);
      const notFoundResponses = Response.getTestResponsesByStatus(404);
      const serverErrorResponses = Response.getTestResponsesByStatus(500);

      expect(badRequestResponses.length).toBe(1);
      expect(unauthorizedResponses.length).toBe(1);
      expect(forbiddenResponses.length).toBe(1);
      expect(notFoundResponses.length).toBe(1);
      expect(serverErrorResponses.length).toBe(1);
    });
  });

  describe('Test Utilities', () => {
    it('should provide comprehensive response tracking utilities', () => {
      Response.success(mockRes, 'First success', { id: 1 });
      Response.error(mockRes, 'First error', null, 400);
      Response.success(mockRes, 'Second success', { id: 2 });

      // Test getting all responses
      const allResponses = Response.getTestResponses();
      expect(allResponses.length).toBe(3);

      // Test getting last response
      const lastResponse = Response.getLastTestResponse();
      expect(lastResponse.message).toBe('Second success');

      // Test finding responses
      const foundResponses = Response.findTestResponses('First');
      expect(foundResponses.length).toBe(2);

      // Test getting by status
      const successResponses = Response.getTestResponsesByStatus(200);
      const errorResponses = Response.getTestResponsesByStatus(400);
      expect(successResponses.length).toBe(2);
      expect(errorResponses.length).toBe(1);
    });

    it('should validate response structure', () => {
      const validSuccessResponse = {
        success: true,
        message: 'Test message',
        data: { test: true },
        timestamp: new Date().toISOString()
      };

      const validErrorResponse = {
        success: false,
        message: 'Error message',
        timestamp: new Date().toISOString()
      };

      expect(() => {
        Response.validateResponseStructure(validSuccessResponse, true);
      }).not.toThrow();

      expect(() => {
        Response.validateResponseStructure(validErrorResponse, false);
      }).not.toThrow();

      expect(() => {
        Response.validateResponseStructure({ invalid: true }, true);
      }).toThrow();
    });
  });

  describe('Mock Response Helper', () => {
    it('should create properly functioning mock response', () => {
      const mock = Response.createMockResponse();

      expect(mock).toHaveProperty('json');
      expect(mock).toHaveProperty('status');
      expect(mock).toHaveProperty('setHeader');
      expect(mock).toHaveProperty('get');
      expect(mock).toHaveProperty('sentData');

      // Test chaining
      const result = mock.status(201).json({ test: true });
      expect(result).toBe(mock);
      expect(mock.sentData.status).toBe(201);
      expect(mock.sentData.json).toEqual({ test: true });
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    // Enable test logging for integration tests
    global.testUtils.enableTestLogging();
  });

  afterEach(() => {
    // Disable test logging after integration tests
    global.testUtils.disableTestLogging();
  });

  it('should integrate Logger and Response for comprehensive debugging', () => {
    const mockRes = Response.createMockResponse();

    // Log some operations
    Logger.api('Processing user request', { userId: 123 });
    Logger.database('Fetching user data', { query: 'SELECT * FROM users' });
    
    // Send response
    Response.success(mockRes, 'User data retrieved', { id: 123, name: 'Test User' });
    
    Logger.response('Response sent successfully', { statusCode: 200 });

    // Verify logs and responses were captured
    const logs = Logger.getTestLogs();
    const responses = Response.getTestResponses();

    expect(logs.length).toBeGreaterThan(0);
    expect(responses.length).toBe(1);

    // Verify we can find specific logs
    const apiLogs = Logger.findTestLogs('Processing user');
    const dbLogs = Logger.findTestLogs('Fetching user');
    const responseLogs = Logger.findTestLogs('Response sent');

    expect(apiLogs.length).toBe(1);
    expect(dbLogs.length).toBe(1);  
    expect(responseLogs.length).toBe(1);

    // Verify response tracking
    const successResponses = Response.getTestResponsesByStatus(200);
    expect(successResponses.length).toBe(1);
    expect(successResponses[0].message).toBe('User data retrieved');
  });

  it('should provide useful debugging utilities for test development', () => {
    // Use test utilities for debugging
    global.testUtils.debugTest('Starting integration test', { userId: 123 });

    Logger.test('Test-specific logging', { step: 'authentication' });
    
    const mockRes = Response.createMockResponse();
    Response.error(mockRes, 'Authentication failed', { reason: 'invalid_token' }, 401);

    // Use assertion with logging
    const responses = Response.getTestResponses();
    global.testUtils.expectWithLog(responses.length, 'Should have 1 response').toBe(1);
    global.testUtils.expectWithLog(responses[0].statusCode, 'Should be 401').toBe(401);

    global.testUtils.debugTest('Integration test completed', { 
      logCount: Logger.getTestLogs().length,
      responseCount: responses.length 
    });
  });
});