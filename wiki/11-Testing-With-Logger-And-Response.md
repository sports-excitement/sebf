# Testing with Enhanced Logger and Response Helpers

This guide explains how to use the enhanced Logger and Response helpers for effective testing and debugging in the Sports Excitement Framework.

## Overview

The Logger and Response helpers have been enhanced with comprehensive testing support that allows you to:

- Capture and inspect logs during test execution
- Track response patterns and debug API responses
- Enable/disable logging based on testing needs
- Provide detailed debugging information when tests fail

## Logger Helper Testing Features

### Basic Usage

```javascript
const Logger = require('../../framework/helpers/Logger');

describe('My Feature Tests', () => {
  beforeEach(() => {
    // Clear logs before each test for clean slate
    Logger.clearTestLogs();
  });

  it('should log operations correctly', () => {
    Logger.info('Processing user data', { userId: 123 });
    Logger.auth('User authenticated', { role: 'admin' });
    
    // Inspect captured logs
    const logs = Logger.getTestLogs();
    expect(logs.length).toBe(2);
    
    // Find specific logs
    const authLogs = Logger.findTestLogs('authenticated');
    expect(authLogs.length).toBe(1);
    expect(authLogs[0].meta.role).toBe('admin');
  });
});
```

### Enabling Test Logging

By default, logging is minimal in tests. You can enable detailed logging:

```javascript
// Method 1: Use test utilities
global.testUtils.enableTestLogging();

// Method 2: Set environment variable
process.env.ENABLE_TEST_LOGGING = 'true';

// Method 3: Set LOG_LEVEL to debug in .env.testing
LOG_LEVEL=debug
```

### Logger Test Utilities

```javascript
// Get all captured logs
const logs = Logger.getTestLogs();

// Get logs by level
const errorLogs = Logger.getTestLogsByLevel('ERROR');
const infoLogs = Logger.getTestLogsByLevel('INFO');

// Find logs containing specific text
const userLogs = Logger.findTestLogs('user');

// Get the most recent log
const lastLog = Logger.getLastTestLog();

// Clear logs (useful in beforeEach)
Logger.clearTestLogs();

// Force logging even when silent
Logger.forceLog('info', 'This will always appear');
```

### Specialized Logging Methods

```javascript
Logger.api('API endpoint called', { endpoint: '/users' });
Logger.auth('Authentication attempt', { method: 'jwt' });
Logger.database('Query executed', { table: 'users', duration: '15ms' });
Logger.security('Security event', { type: 'failed_login' });
Logger.middleware('Middleware executed', { name: 'auth' });
Logger.service('Service called', { service: 'UserService' });
Logger.validation('Validation failed', { field: 'email' });
Logger.test('Test-specific log', { testData: true });
```

### Performance Timing

```javascript
it('should track operation timing', () => {
  const timer = Logger.timing('database query');
  
  // Perform operation
  await userService.findById(123);
  
  const duration = timer.end();
  expect(duration).toBeLessThan(1000); // Should complete in under 1 second
});
```

## Response Helper Testing Features

### Basic Usage

```javascript
const Response = require('../../framework/helpers/Response');

describe('API Response Tests', () => {
  let mockRes;
  
  beforeEach(() => {
    mockRes = Response.createMockResponse();
    Response.clearTestResponses();
  });

  it('should send success response', () => {
    const data = { id: 1, name: 'Test User' };
    Response.success(mockRes, 'User created', data, 201);
    
    // Verify the response
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
    
    const sentData = mockRes.sentData.json;
    expect(sentData.success).toBe(true);
    expect(sentData.data).toEqual(data);
    
    // Check response tracking
    const responses = Response.getTestResponses();
    expect(responses.length).toBe(1);
    expect(responses[0].statusCode).toBe(201);
  });
});
```

### Response Test Utilities

```javascript
// Get all tracked responses
const responses = Response.getTestResponses();

// Get responses by status code
const successResponses = Response.getTestResponsesByStatus(200);
const errorResponses = Response.getTestResponsesByStatus(400);

// Find responses containing specific text
const userResponses = Response.findTestResponses('user');

// Get the most recent response
const lastResponse = Response.getLastTestResponse();

// Clear responses (useful in beforeEach)
Response.clearTestResponses();
```

### Mock Response Helper

The enhanced mock response helper provides:

```javascript
const mockRes = Response.createMockResponse();

// Properties
mockRes.statusCode;     // Current status code
mockRes.headers;        // Response headers
mockRes.sentData;       // Data sent in response

// Methods work with or without Jest
mockRes.status(200);    // Set status code
mockRes.json(data);     // Send JSON response
mockRes.setHeader(key, value); // Set header
mockRes.get(key);       // Get header
```

### Response Validation

```javascript
it('should validate response structure', () => {
  const response = {
    success: true,
    message: 'Operation successful',
    data: { id: 1 },
    timestamp: new Date().toISOString()
  };
  
  // This will throw if structure is invalid
  expect(() => {
    Response.validateResponseStructure(response, true);
  }).not.toThrow();
});
```

## Environment Configuration

### .env.testing Configuration

```bash
# Minimal logging (default)
LOG_LEVEL=error
ENABLE_TEST_LOGGING=false

# Detailed logging for debugging
LOG_LEVEL=debug
ENABLE_TEST_LOGGING=true
```

### .env.example Configuration

```bash
# Production/Development logging
LOG_LEVEL=info
ENABLE_TEST_LOGGING=false
```

## Global Test Utilities

The framework provides global test utilities for enhanced debugging:

```javascript
// Enable/disable test logging
global.testUtils.enableTestLogging();
global.testUtils.disableTestLogging();

// Get captured data
global.testUtils.getTestLogs();
global.testUtils.getTestResponses();

// Clear captured data
global.testUtils.clearTestLogs();
global.testUtils.clearTestResponses();

// Debug helpers
global.testUtils.debugTest('Debug message', { data: 'value' });
global.testUtils.expectWithLog(condition, 'Description').toBe(expected);
```

## Integration Testing Example

```javascript
describe('User API Integration', () => {
  beforeEach(() => {
    // Enable detailed logging for integration tests
    global.testUtils.enableTestLogging();
  });

  afterEach(() => {
    global.testUtils.disableTestLogging();
  });

  it('should handle complete user creation flow', async () => {
    global.testUtils.debugTest('Starting user creation test');
    
    const userData = { email: 'test@example.com', name: 'Test User' };
    
    const res = await request(app)
      .post('/api/users')
      .send(userData);
    
    // Check response
    global.testUtils.expectWithLog(res.status, 'Response status').toBe(201);
    global.testUtils.expectWithLog(res.body.success, 'Response success').toBe(true);
    
    // Inspect logs for debugging
    const logs = global.testUtils.getTestLogs();
    const apiLogs = logs.filter(log => log.message.includes('[API]'));
    const dbLogs = logs.filter(log => log.message.includes('[DATABASE]'));
    
    global.testUtils.debugTest('Test completed', { 
      apiLogCount: apiLogs.length,
      dbLogCount: dbLogs.length,
      responseStatus: res.status 
    });
    
    expect(apiLogs.length).toBeGreaterThan(0);
    expect(dbLogs.length).toBeGreaterThan(0);
  });
});
```

## Debugging Failed Tests

When tests fail, you can enable detailed logging to understand what happened:

1. **Set environment variable:**
   ```bash
   ENABLE_TEST_LOGGING=true npm test
   ```

2. **Or modify your test:**
   ```javascript
   beforeEach(() => {
     global.testUtils.enableTestLogging();
   });
   ```

3. **Inspect captured data:**
   ```javascript
   afterEach(() => {
     if (this.currentTest.state === 'failed') {
       console.log('Captured logs:', global.testUtils.getTestLogs());
       console.log('Captured responses:', global.testUtils.getTestResponses());
     }
   });
   ```

## Best Practices

1. **Clean slate for each test:**
   ```javascript
   beforeEach(() => {
     Logger.clearTestLogs();
     Response.clearTestResponses();
   });
   ```

2. **Use descriptive log messages:**
   ```javascript
   Logger.test('User validation started', { userId: 123, step: 'email_check' });
   ```

3. **Enable logging only when debugging:**
   ```javascript
   // Only enable in specific tests that need debugging
   const debug = process.env.DEBUG_TESTS === 'true';
   if (debug) {
     global.testUtils.enableTestLogging();
   }
   ```

4. **Inspect logs in failed tests:**
   ```javascript
   it('should process user correctly', async () => {
     try {
       // Test logic here
     } catch (error) {
       console.log('Debug logs:', Logger.getTestLogs());
       console.log('Debug responses:', Response.getTestResponses());
       throw error;
     }
   });
   ```

5. **Use timing for performance tests:**
   ```javascript
   it('should complete operation quickly', async () => {
     const timer = Logger.timing('operation');
     await performOperation();
     const duration = timer.end();
     expect(duration).toBeLessThan(500);
   });
   ```

## Summary

The enhanced Logger and Response helpers provide comprehensive testing support that makes debugging failed tests much easier. By capturing logs and responses during test execution, developers can:

- Understand exactly what happened during test runs
- Debug complex integration tests effectively
- Track performance and identify bottlenecks
- Validate that proper logging is occurring in production code

Use these tools to build more reliable tests and debug issues more effectively during development.