# Application Services (`/app/Services`)

This directory contains the **Service Layer** of your application - the heart of your business logic that's separate from HTTP handling and framework infrastructure.

## 🎯 **Service Architecture**

Services are **stateless classes** that encapsulate distinct pieces of functionality:

- **`UserService`** - User management, authentication, profiles
- **`OrderService`** - Order processing, cart management, payments  
- **`NotificationService`** - Email, push notifications, alerts

## 💼 **Service Responsibilities**

✅ **Database Operations** - CRUD operations via Prisma  
✅ **Business Rules** - Domain-specific logic and validation  
✅ **External APIs** - Third-party service integrations  
✅ **Complex Calculations** - Mathematical operations and algorithms  
✅ **Transaction Management** - Multi-step database operations  

❌ **HTTP Concerns** - Request/response handling (belongs in controllers)  
❌ **Framework Logic** - Infrastructure concerns (belongs in framework)  

## 🏗️ **Service Pattern**

```javascript
// app/Services/ExampleService.js
const prismaService = require('../../framework/config/prisma');
const Logger = require('../../framework/helpers/Logger');

class ExampleService {
  constructor() {
    this.prisma = prismaService;
  }

  async createExample(data) {
    try {
      // 1. Validate business rules
      this.validateExampleData(data);

      // 2. Database operation
      const example = await this.prisma.example.create({ data });

      // 3. Post-processing (events, notifications)
      await this.handleExampleCreated(example);

      return example;
    } catch (error) {
      Logger.error('Failed to create example:', error.message);
      throw error;
    }
  }

  validateExampleData(data) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Name is required');
    }
  }

  async handleExampleCreated(example) {
    Logger.info(`Example created: ${example.id}`);
  }
}

module.exports = new ExampleService();
```

## 🔗 **Framework Integration**

```javascript
// Use framework services
const prismaService = require('../../framework/config/prisma');
const JWTSessionService = require('../../framework/services/JWTSessionService');
const Logger = require('../../framework/helpers/Logger');

class MyService {
  constructor() {
    this.prisma = prismaService; // Auto-handles test/production databases
  }
}
```

## 📋 **Best Practices**

1. **Single Responsibility** - One service per domain area
2. **Stateless Design** - No instance variables that change
3. **Error Handling** - Always log and re-throw errors
4. **Input Validation** - Validate business rules in services
5. **Transaction Management** - Use transactions for multi-step operations

## 🧪 **Testing Services**

```javascript
// tests/Unit/Services/ExampleService.test.js
const ExampleService = require('../../../app/Services/ExampleService');
const prismaService = require('../../../framework/config/prisma');

jest.mock('../../../framework/config/prisma');

describe('ExampleService', () => {
  test('should create example with valid data', async () => {
    const mockExample = { id: 1, name: 'Test' };
    prismaService.example.create.mockResolvedValue(mockExample);

    const result = await ExampleService.createExample({ name: 'Test' });

    expect(result).toEqual(mockExample);
  });
});
```

By placing business logic in services, you create **reusable, testable, and maintainable** code that's separate from HTTP concerns. 🚀 