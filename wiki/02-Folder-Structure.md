# Folder Structure

This document provides a comprehensive overview of the Sports Excitement Backend Framework's folder structure and organization, highlighting the clean separation between framework core and application code.

---

## 🏗️ **Architecture Overview**

The SEBF follows a **modular architecture** with clear separation between framework infrastructure and application code:

- **Framework Core** (`framework/`) - Infrastructure services, never modify ❌
- **Application Code** (`app/`, `routes/`) - Your business logic ✅
- **Configuration** (`.env`, `config/`) - Environment and settings
- **Documentation** (`wiki/`) - Comprehensive guides and references

---

## 📁 **Root Directory Structure**

```
sebf/
├── framework/              # 🏗️ Core Framework Infrastructure
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
├── routes/               # 📍 Application Routes
├── database/            # 🗄️ Database & Migrations
├── prisma/              # 📊 Prisma Schema & Clients
├── tests/               # 🧪 Test Suites
├── bootstrap/           # 🚀 Application Bootstrap
├── wiki/                # 📚 Documentation
├── storage/             # 💾 Runtime Storage
├── control.js           # 🔧 CLI Control Tool
├── server.js            # 🌐 Application Entry Point
├── package.json         # 📦 Dependencies & Scripts
├── .env.example         # ⚙️ Environment Template
└── jest.config.js       # 🧪 Testing Configuration
```

---

## 🏗️ **Framework Directory (`/framework`) - Core Infrastructure**

> **⚠️ IMPORTANT: Never modify files in the `framework/` directory!**
> 
> This contains the core framework infrastructure that should remain stable across projects.

### **Framework Structure**
```
framework/
├── core/                    # 🧠 Core Framework Classes
│   └── Application.js       # Base application class
│
├── routes/                  # 🛤️ System Routes
│   ├── kernel.js           # Framework routes (health, admin)
│   └── services.js         # Service management API
│
├── services/               # 🔧 Infrastructure Services
│   ├── TypesenseService.js  # Search engine service
│   ├── FirebaseService.js   # Notification service
│   ├── JWTSessionService.js # JWT session management
│   ├── MemoryService.js     # Memory monitoring
│   ├── RedisService.js      # Caching service
│   ├── SSEService.js        # Real-time events
│   ├── MinioService.js      # Object storage
│   └── SupabaseService.js   # Supabase integration
│
├── middleware/             # 🔐 Framework Middleware
│   ├── Auth.js             # Core authentication
│   ├── ErrorHandler.js     # Global error handling
│   └── Session.js          # Session management
│
├── helpers/                # 🛠️ Framework Utilities
│   ├── ApiHelpers.js       # API utilities
│   ├── Logger.js           # Logging service
│   ├── Response.js         # Response formatting
│   └── SSEHelpers.js       # SSE utilities
│
└── config/                 # ⚙️ Framework Configuration
    ├── services.js         # Service configurations
    ├── logging.js          # Logging configuration
    ├── prisma.js          # Main Prisma client
    └── prisma.test.js     # Test Prisma client
```

### **Key Framework Components**

#### **Core Application (`framework/core/Application.js`)**
- Base application class with common middleware setup
- Service initialization and management
- Graceful shutdown handling
- Health monitoring integration

#### **System Routes (`framework/routes/`)**
- **`kernel.js`** - Framework-level routes:
  - `/api` - API documentation
  - `/api/health/*` - Health check endpoints
  - `/api/sse` - Server-sent events
  - `/api/admin` - System administration
  
- **`services.js`** - Service management API:
  - `/admin/services` - List all services
  - `/admin/services/:name` - Service details
  - `/admin/services/dependencies` - Service dependencies

#### **Infrastructure Services (`framework/services/`)**
- **Self-contained service classes** with consistent interfaces
- **Health check methods** for monitoring
- **Connection management** with retry logic
- **Dynamic loading** based on configuration

#### **Framework Middleware (`framework/middleware/`)**
- **Core authentication logic** (JWT handling, token extraction)
- **Global error handling** with structured logging
- **Session management** with Redis integration

---

## 🎯 **Application Directory (`/app`) - Your Code**

This is where **all your business logic** resides. This code is specific to your application and should contain your domain logic.

### **Application Structure**
```
app/
├── Http/                      # 🌐 HTTP Layer
│   ├── Controllers/           # 📋 Request Handlers
│   │   ├── UserController.js  # User management
│   │   └── README.md          # Controller documentation
│   │
│   └── Middleware/            # 🔒 Application Middleware
│       ├── Auth.js            # App-specific auth (roles, permissions)
│       ├── Validation.js      # Request validation schemas
│       └── index.js           # Middleware exports
│
└── Services/                  # 💼 Business Services
    ├── UserService.js         # User business logic
    └── README.md              # Service documentation
```

### **HTTP Layer (`/app/Http`)**

#### **Controllers (`/app/Http/Controllers`)**
Handle incoming HTTP requests and coordinate with services:

- **`UserController.js`** - Complete user management:
  - User registration and authentication
  - Profile management and updates
  - User session management
  - Admin user operations
  - File upload handling

#### **Middleware (`/app/Http/Middleware`)**
Application-specific request processing:

- **`Auth.js`** - Application authentication logic:
  - Delegates core JWT handling to framework
  - Implements role-based access control
  - Permission checking and validation
  - User-specific rate limiting
  - Ownership verification

- **`Validation.js`** - Request validation schemas:
  - Joi schema definitions
  - Input sanitization
  - Custom validation rules
  - Error message formatting

### **Business Services (`/app/Services`)**
Encapsulated business logic:

- **`UserService.js`** - User-related business operations:
  - User creation and management
  - Authentication workflows
  - Password management
  - Session handling
  - User data validation

---

## 📍 **Routes Directory (`/routes`) - Application Routes**

```
routes/
├── api.js                 # 🎯 Business Logic Routes
└── README.md              # Routing documentation
```

**`api.js`** - Application-specific API routes:
- User management endpoints
- Authentication routes (`/auth/login`, `/auth/register`)
- Protected business logic routes
- File upload endpoints
- Application-specific features

> **Note**: System routes (health checks, admin) are handled by `framework/routes/kernel.js`

---

## 📊 **Database & Prisma (`/prisma`, `/database`)**

### **Prisma Directory (`/prisma`)**
```
prisma/
├── schema.prisma          # 📋 Main database schema (PostgreSQL)
├── schema.test.prisma     # 🧪 Test database schema (SQLite)
└── generated/             # 🔄 Generated Prisma clients
    ├── client/            # Main client
    └── test-client/       # Test client
```

**Dual Database Setup:**
- **Main Database** (PostgreSQL) - Production and development
- **Test Database** (SQLite) - Fast, isolated testing

### **Database Directory (`/database`)**
```
database/
├── seeders/               # 🌱 Database Seeding
│   └── UserSeeder.js      # User data seeding
└── README.md              # Database documentation
```

---

## 🚀 **Bootstrap Directory (`/bootstrap`)**

```
bootstrap/
└── app.js                 # 🎬 Application Initialization
```

**`app.js`** - Application setup and configuration:
- Extends `framework/core/Application.js`
- Initializes application-specific services
- Mounts application and system routes
- Configures middleware stack
- Handles graceful shutdown

---

## 🧪 **Testing Directory (`/tests`)**

```
tests/
├── Feature/               # 🎯 Integration Tests
│   └── HealthCheck.test.js # API endpoint testing
├── Unit/                  # 🔬 Unit Tests
├── setup.js              # 🔧 Test environment setup
├── globalSetup.js         # 🌍 Global test setup
└── globalTeardown.js      # 🧹 Global test cleanup
```

**Testing Architecture:**
- **Feature Tests** - End-to-end API testing with full database integration
- **Unit Tests** - Isolated component testing with mocks
- **Dual Database** - SQLite for fast unit tests, PostgreSQL for integration tests
- **Isolated Environment** - Separate Redis database and test data

---

## 📚 **Documentation (`/wiki`)**

```
wiki/
├── 01-Introduction.md         # 📖 Framework overview
├── 02-Folder-Structure.md     # 📁 This document
├── 03-Configuration.md        # ⚙️ Environment setup
├── 04-Routing.md             # 🛤️ API routes
├── 05-Controllers.md         # 📋 Request handling
├── 06-Services.md            # 💼 Business logic
├── 07-Database-And-Models.md # 🗄️ Data management
├── 08-Error-Handling.md      # 🚨 Error management
├── 09-Testing.md             # 🧪 Testing strategies
└── 10-Middleware-System.md   # 🔒 Middleware pipeline
```

---

## 🔧 **Configuration & Tools**

### **Configuration Files**
- **`.env.example`** - Complete environment template with all services
- **`.env.testing`** - Test-optimized environment configuration
- **`jest.config.js`** - Testing framework configuration
- **`package.json`** - Dependencies, scripts, and project metadata

### **Control CLI (`control.js`)**
Comprehensive command-line interface:

```bash
# Service Management
npm run control services status         # Check all services
npm run control services test [name]    # Test specific service

# Environment & Keys
npm run control keys generate           # Generate secure keys
npm run control env validate            # Validate configuration

# Database Operations
npm run control db:health               # Database health check
npm run control memory:check            # Memory analysis

# Development Tools
npm run control help                    # Show all commands
npm run control info                    # System information
```

### **Application Entry (`server.js`)**
Clean application startup:
- Environment validation
- Service health checks
- Graceful startup and shutdown
- Error handling and logging

---

## 🏛️ **Design Principles**

### **🧩 Framework Separation**
- **Framework Core** (`framework/`) provides infrastructure
- **Application Code** (`app/`, `routes/`) contains business logic
- **Clear boundaries** prevent accidental framework modifications
- **Stable interfaces** allow framework updates without breaking applications

### **⚙️ Service-Oriented Architecture**
- **Self-contained services** with consistent interfaces
- **Dynamic service loading** based on environment configuration
- **Health monitoring** and connection management
- **Graceful degradation** when optional services are unavailable

### **🔧 Configuration-Driven**
- **Environment variables** control all service behavior
- **Dynamic service enable/disable** without code changes
- **Multiple deployment scenarios** (minimal, full-featured, etc.)
- **Validation and documentation** of all configuration options

### **🧪 Testing-First Design**
- **Dual database setup** for fast and comprehensive testing
- **Isolated test environment** with separate Redis database
- **Service mocking** capabilities for unit testing
- **Comprehensive test utilities** and fixtures

### **👥 Team-Friendly**
- **Clear separation of concerns** prevents merge conflicts
- **Consistent patterns** across all components
- **Comprehensive documentation** for onboarding
- **CLI tools** for common development tasks

### **🚀 Production-Ready**
- **Health monitoring** for all services and system components
- **Graceful shutdown** handling for zero-downtime deployments
- **Memory optimization** and performance monitoring
- **Security best practices** built into the framework

---

## 🎯 **Development Workflow**

### **For Framework Development**
1. **Never modify `framework/` directory** in application projects
2. **Create framework PRs** in the main framework repository
3. **Update via npm** when framework updates are available
4. **Test thoroughly** before deploying framework updates

### **For Application Development**
1. **Work only in `app/` and `routes/`** directories
2. **Use services** for all business logic
3. **Configure via environment variables** instead of hardcoding
4. **Write tests** for all business logic and API endpoints
5. **Use CLI tools** for common development tasks

### **Service Integration**
1. **Enable services** via environment variables
2. **Test service connections** using CLI tools
3. **Monitor service health** via API endpoints
4. **Handle service failures** gracefully in your code

This architecture provides a solid foundation for building scalable, maintainable applications while ensuring clear separation between framework infrastructure and application-specific code. The modular design supports teams of any size and enables easy maintenance and upgrades.