# HTTP Controllers (`/app/Http/Controllers`)

This directory contains your application's **Controllers** - the HTTP interface layer that handles requests and coordinates responses.

---

## 🎯 **Controller Responsibilities**

Controllers are the **"glue"** between HTTP requests and business logic. They should be kept **lean** and only:

1. **Parse request data** (`req.params`, `req.body`, `req.query`)
2. **Call service methods** to perform business logic
3. **Return standardized responses** using the `Response` helper
4. **Handle HTTP-specific concerns** (status codes, headers)

❌ **Controllers should NOT contain business logic** - that belongs in `app/Services`

## 🏗️ **Controller Pattern**

```javascript
// app/Http/Controllers/ExampleController.js
const ExampleService = require('../../Services/ExampleService');
const Response = require('../../../framework/helpers/Response');

class ExampleController {
  async index(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await ExampleService.getAllExamples({ page, limit });
      return Response.success(res, result, 'Examples retrieved successfully');
    } catch (error) {
      return Response.error(res, 'Failed to retrieve examples', error.message, 500);
    }
  }

  async store(req, res) {
    try {
      const example = await ExampleService.createExample(req.body);
      return Response.created(res, example, 'Example created successfully');
    } catch (error) {
      return Response.error(res, 'Failed to create example', error.message, 500);
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const example = await ExampleService.getExampleById(parseInt(id));
      
      if (!example) {
        return Response.notFound(res, 'Example not found');
      }
      
      return Response.success(res, example, 'Example retrieved successfully');
    } catch (error) {
      return Response.error(res, 'Failed to retrieve example', error.message, 500);
    }
  }
}

module.exports = new ExampleController();
```

## 📋 **Current Controllers**

- **`UserController.js`** - User management, authentication, profiles

## 🔗 **Framework Integration**

Controllers use framework helpers and let the global error handler process unhandled errors:

```javascript
const Response = require('../../../framework/helpers/Response');

// Always use Response helper for consistent API responses
return Response.success(res, data, message, statusCode);
return Response.error(res, message, details, statusCode);
```

## 🧪 **Testing Controllers**

```javascript
// tests/Feature/ExampleController.test.js
const request = require('supertest');
const app = require('../../../bootstrap/app');

describe('ExampleController', () => {
  test('GET /api/examples should return examples list', async () => {
    const response = await request(app)
      .get('/api/examples')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

Keep controllers **thin** and **focused** on HTTP concerns while delegating all business logic to services! 🚀