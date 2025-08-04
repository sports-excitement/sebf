# SEBF - Sports Excitement Backend Framework

**Enterprise-Grade Node.js Framework** designed for large team development with modular architecture and dynamic service management.

---

## 🏗️ **Framework Architecture**

The framework enforces strict separation between core infrastructure and application code:

```
sebf/
├── framework/              # 🏗️ Core Framework (DO NOT MODIFY)
│   ├── core/              # Base application classes
│   ├── routes/            # System routes (health, admin)
│   ├── services/          # Infrastructure services
│   ├── middleware/        # Framework middleware
│   ├── helpers/           # Utility functions
│   └── config/            # Framework configuration
│
├── app/                   # 🎯 Your Application Code
│   ├── Http/
│   │   ├── Controllers/   # Business logic controllers
│   │   └── Middleware/    # Application middleware
│   └── Services/          # Business services
│
├── routes/               # 📍 Application routes
├── database/            # 🗄️ Migrations and seeders
├── tests/               # 🧪 Test suites
└── config/              # ⚙️ Configuration files
```

---

## 🚀 **Framework Features**

### **✅ Production-Ready Infrastructure**
- **Dynamic Service Management** - Enable/disable services via environment variables
- **Dual Database Support** - PostgreSQL for production, SQLite for testing
- **Redis-Backed Sessions** - Distributed session management for clustering
- **Memory Optimization** - Node.js v8 integration with automatic monitoring
- **Connection Pooling** - Optimized database connections with retry logic

### **✅ Modern Service Ecosystem**
- **Typesense Search** - Fast, typo-tolerant search engine
- **Firebase Integration** - Push notifications and analytics datastore
- **MinIO Object Storage** - S3-compatible file storage
- **Supabase Support** - Alternative backend-as-a-service integration
- **Server-Sent Events** - Real-time communication with automatic scaling

### **✅ Developer Experience**
- **Comprehensive CLI** - `control.js` for all development operations
- **Hot Reload Development** - Fast development with automatic service restart
- **Rich Documentation** - Complete wiki and API references
- **Feature Flags** - Toggle features without code deployment
- **Service Discovery** - Built-in service management and monitoring

### **✅ Enterprise Testing**
- **Dual Database Testing** - Fast SQLite unit tests, comprehensive PostgreSQL integration tests
- **Isolated Test Environment** - Separate Redis database and test collections
- **Service Mocking** - Complete service layer mocking capabilities
- **Performance Testing** - Load testing and memory profiling tools

---

## 🎛️ **Dynamic Service Configuration**

Enable or disable any service without changing code:

```bash
# Core Services (Required)
DATABASE_ENABLED=true         # PostgreSQL database
REDIS_ENABLED=true           # Session management

# Optional Services (Enable as needed)
TYPESENSE_ENABLED=false      # Search engine
FIREBASE_ENABLED=false       # Push notifications
MINIO_ENABLED=false          # Object storage
SUPABASE_ENABLED=false       # Alternative backend
SSE_ENABLED=true            # Real-time events
MEMORY_ENABLED=true         # Performance monitoring
EMAIL_ENABLED=false         # SMTP notifications
```

### **Configuration Scenarios**

**Minimal Setup** (Development):
```bash
DATABASE_ENABLED=true
REDIS_ENABLED=true
# All other services disabled for fast startup
```

**Full Featured** (Production):
```bash
# All services enabled for complete functionality
DATABASE_ENABLED=true
REDIS_ENABLED=true
TYPESENSE_ENABLED=true
FIREBASE_ENABLED=true
MINIO_ENABLED=true
SSE_ENABLED=true
MEMORY_ENABLED=true
```

---

## 🚀 **Quick Start**

### **1. Setup Development Environment**
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Generate secure keys
npm run control keys generate

# Setup databases
npm run prisma:generate
npm run prisma:push
npm run prisma:test:push
```

### **2. Start Development**
```bash
# Start with dynamic service loading
npm run dev

# Check service status
npm run control services status

# View API documentation
open http://localhost:3000/api
```

### **3. Development Commands**
```bash
# Database Operations
npm run prisma:studio         # Database admin interface
npm run prisma:reset          # Reset main database
npm run prisma:test:reset     # Reset test database

# Testing
npm test                      # All tests (dual database)
npm run test:unit            # Fast SQLite unit tests
npm run test:feature         # PostgreSQL integration tests
npm run test:coverage        # Coverage report

# Service Management
npm run control services test all        # Test all services
npm run control services test redis      # Test specific service
npm run control memory:check             # Memory analysis

# Development Tools
npm run control help                     # Show all commands
npm run control info                     # System information
```

---

## 🛡️ **Framework Rules**

### **❌ DO NOT MODIFY**
- **Anything in `framework/` directory** - Core framework infrastructure
- **Framework service files** - Use extension patterns instead
- **Base middleware configurations** - Extend in application layer

### **✅ SAFE TO MODIFY**
- **Everything in `app/` directory** - Your business logic
- **Routes in `routes/`** - Application-specific routes
- **Configuration files** - Environment and service settings
- **Tests in `tests/`** - All test files
- **Environment files** - `.env`, `.env.testing`

---

## 🔧 **Extending the Framework**

### **Adding Custom Services**
```javascript
// app/Services/CustomService.js
const Logger = require('../../framework/helpers/Logger');

class CustomService {
  constructor() {
    this.config = require('../../framework/config/services').custom || {};
    this.isEnabled = this.config.enabled || false;
  }

  async initialize() {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }
    
    // Initialize your service
    Logger.info('Custom service initialized');
    return { status: 'connected' };
  }

  async testConnection() {
    const startTime = Date.now();
    try {
      // Test your service
      return {
        status: 'connected',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async shutdown() {
    Logger.info('Custom service shut down');
  }
}

module.exports = new CustomService();
```

### **Adding Business Controllers**
```javascript
// app/Http/Controllers/CustomController.js
const Response = require('../../../framework/helpers/Response');
const CustomService = require('../../Services/CustomService');

class CustomController {
  async index(req, res) {
    try {
      const data = await CustomService.getData();
      return Response.success(res, data, 'Data retrieved successfully');
    } catch (error) {
      return Response.error(res, 'Failed to retrieve data', error.message, 500);
    }
  }

  async store(req, res) {
    try {
      const result = await CustomService.createData(req.body);
      return Response.created(res, result, 'Data created successfully');
    } catch (error) {
      return Response.error(res, 'Failed to create data', error.message, 500);
    }
  }
}

module.exports = new CustomController();
```

---

## 🎯 **Production Deployment**

### **Environment Configuration**
```bash
# Production Settings
NODE_ENV=production
APP_ENV=production

# Performance Optimization
NODE_OPTIONS="--max_old_space_size=4096"
CLUSTER_WORKERS=auto

# Security
TRUST_PROXY=true
ENABLE_COMPRESSION=true

# Service Configuration
DATABASE_ENABLED=true
REDIS_ENABLED=true
TYPESENSE_ENABLED=true
FIREBASE_ENABLED=true
MEMORY_ENABLED=true

# Monitoring
HEALTH_CHECK_API_KEY=your-secure-api-key
MONITORING_ENABLED=true
```

### **Production Commands**
```bash
# Start with clustering
npm start

# Start with memory optimization
npm run memory:optimize

# Health monitoring
curl http://localhost:3000/api/health/detailed \
  -H "X-Health-API-Key: your-api-key"
```

---

## 🧪 **Testing Guidelines**

### **Test Architecture**
- **Unit Tests** - Fast SQLite database, service mocking
- **Integration Tests** - Full PostgreSQL database, real service connections
- **Feature Tests** - End-to-end API testing with authentication
- **Performance Tests** - Load testing and memory profiling

### **Writing Tests**
```javascript
// tests/Unit/Services/CustomService.test.js
describe('CustomService', () => {
  test('should initialize correctly', async () => {
    const result = await CustomService.initialize();
    expect(result.status).toBe('connected');
  });
});

// tests/Feature/CustomApi.test.js
describe('Custom API', () => {
  test('should create data via API', async () => {
    const response = await request(app)
      .post('/api/custom')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testData)
      .expect(201);

    expect(response.body.success).toBe(true);
  });
});
```

---

## 🔍 **Troubleshooting**

### **Service Issues**
```bash
# Check all service status
npm run control services status

# Test specific service
npm run control services test database
npm run control services test redis

# View service configuration
npm run control services help configuration
```

### **Database Issues**
```bash
# Reset databases
npm run prisma:reset         # Main database
npm run prisma:test:reset    # Test database

# Check database health
npm run control db:health

# Generate fresh clients
npm run prisma:generate
npm run prisma:test:generate
```

### **Memory Issues**
```bash
# Memory analysis
npm run control memory:check

# Start with optimization
npm run memory:optimize

# Monitor in production
curl http://localhost:3000/api/health/detailed
```

---

## 📚 **Documentation**

- **[Main README](../README.md)** - Complete framework overview
- **[Wiki Documentation](../wiki/)** - Comprehensive guides
- **[Configuration Guide](../wiki/03-Configuration.md)** - Service setup
- **[API Documentation](http://localhost:3000/api)** - Live API docs

---

## 🤝 **Contributing**

### **Development Guidelines**
1. **Never modify `framework/` directory** - Extend instead
2. **Follow established patterns** - Controllers, services, middleware
3. **Write comprehensive tests** - Unit, integration, and feature tests
4. **Update documentation** - Keep docs current with changes
5. **Use CLI tools** - Leverage built-in development tools

### **Code Standards**
- **Separation of Concerns** - Framework vs application code
- **Service-Oriented Architecture** - Business logic in services
- **Consistent Error Handling** - Use Response helpers
- **Comprehensive Testing** - Test all business logic
- **Performance Awareness** - Monitor memory and response times

---

**SEBF - Building enterprise applications with confidence.** 🚀