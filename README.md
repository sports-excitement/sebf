# Sports Excitement Backend Framework (SEBF) 🏆

**Modern, Enterprise-Grade Node.js API Framework** built with Express.js, Prisma, Redis, Typesense, and real-time features for scalable backend applications.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Features

### 🔥 **Core Framework**
- 🏗️ **Modular Architecture** - Clean separation between framework and application code
- 🔐 **JWT Authentication** - Redis-backed session management with clustering support
- 📊 **Dual Database Support** - PostgreSQL (Prisma) + SQLite for testing
- ⚡ **Dynamic Service Management** - Enable/disable services via environment configuration
- 🧠 **Memory Optimization** - Built-in Node.js performance monitoring and management

### 🚀 **Integrated Services**
- 🔍 **Typesense Search** - Modern search engine with real-time indexing
- 🔥 **Firebase Integration** - Push notifications and analytics datastore
- 📁 **MinIO Object Storage** - S3-compatible file storage
- 🌐 **Supabase Support** - Alternative backend-as-a-service integration
- 📡 **Server-Sent Events** - Real-time communication with automatic scaling

### 🛡️ **Security & Performance**
- 🛡️ **Enterprise Security** - Helmet, CORS, rate limiting, input validation
- 📝 **Structured Logging** - Winston-based logging with multiple levels
- 🧪 **Comprehensive Testing** - Jest with isolated test environment
- 🚀 **Production Optimized** - Clustering, compression, memory management
- 📈 **Health Monitoring** - Detailed health checks and metrics

### 🛠️ **Developer Experience**
- 🎛️ **CLI Control Tool** - Comprehensive command-line interface
- 📚 **Rich Documentation** - Complete wiki and API documentation
- 🔧 **Feature Flags** - Toggle features without code deployment
- 🎯 **Hot Reload** - Fast development with automatic restarts
- 🔍 **Service Discovery** - Built-in service management and monitoring

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** v18+ with npm
- **PostgreSQL** v13+ (for main database)
- **Redis** v6+ (for caching and sessions)
- **Git** for version control

*Optional services:*
- **Typesense** (for search functionality)
- **MinIO** (for object storage)
- **Firebase** (for push notifications)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/sebf.git
cd sebf
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate secure keys
npm run control keys generate
```

### 3. Configure Services

Edit your `.env` file. **Required services:**

```env
# Application Settings
APP_NAME="Your Application Name"
APP_ENV=development
PORT=3000

# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/your_db?schema=public"

# Authentication (Required)
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
SESSION_SECRET=your-super-secret-session-key-here-at-least-32-characters-long

# Redis (Required)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

**Optional services** (enable as needed):

```env
# Service Control - Enable/Disable Any Service
TYPESENSE_ENABLED=false     # Search engine
FIREBASE_ENABLED=false      # Push notifications
MINIO_ENABLED=false         # Object storage
SUPABASE_ENABLED=false      # Alternative backend
SSE_ENABLED=true           # Real-time events
MEMORY_ENABLED=true        # Memory monitoring
EMAIL_ENABLED=false        # Email notifications
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Set up database schema
npm run prisma:push

# (Optional) Seed with sample data
npm run db:seed
```

### 5. Start Development

```bash
# Start with dynamic service loading
npm run dev

# Check service status
npm run control services status

# View API documentation
open http://localhost:3000/api
```

---

## 🎛️ Service Management

### Dynamic Service Configuration

Enable/disable services without changing code:

```bash
# Enable Typesense search
TYPESENSE_ENABLED=true
TYPESENSE_API_KEY=your-api-key

# Enable Firebase notifications
FIREBASE_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/service-account.json

# Enable MinIO storage
MINIO_ENABLED=true
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

### Service Status Monitoring

```bash
# Check all services
npm run control services status

# Health check API
curl http://localhost:3000/api/health/detailed

# Service management API
curl http://localhost:3000/api/admin/services
```

### Configuration Scenarios

#### **Minimal Setup** (Database + Redis only)
```env
DATABASE_ENABLED=true
REDIS_ENABLED=true
# All other services disabled
```

#### **Full Featured** (All services enabled)
```env
DATABASE_ENABLED=true
REDIS_ENABLED=true
TYPESENSE_ENABLED=true
FIREBASE_ENABLED=true
MINIO_ENABLED=true
SSE_ENABLED=true
MEMORY_ENABLED=true
```

#### **Development Setup** (Lightweight)
```env
DATABASE_ENABLED=true
REDIS_ENABLED=true
SSE_ENABLED=true
# Optional services disabled for faster startup
```

---

## 📦 Available Scripts

### **Development**
```bash
npm run dev              # Start with dynamic service loading
npm run dev:watch        # Development with file watching
npm run dev:debug        # Debug mode with memory optimization
```

### **Database Operations**
```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

npm run prisma:test:generate  # Generate test database client
npm run prisma:test:push      # Set up test database
npm run prisma:test:reset     # Reset test database
```

### **Testing**
```bash
npm test                 # Run all tests (isolated environment)
npm run test:unit        # Unit tests only
npm run test:feature     # Feature/integration tests
npm run test:coverage    # Coverage report
npm run test:watch       # Watch mode
```

### **Production**
```bash
npm run build            # Build for production
npm start                # Start production server
npm run memory:optimize  # Memory optimization analysis
```

### **CLI Control Tool**
```bash
npm run control help                    # Show all commands
npm run control services status         # Service status
npm run control services test redis     # Test specific service
npm run control keys generate          # Generate secure keys
npm run control env validate          # Validate configuration
npm run control db:health             # Database health check
npm run control memory:check          # Memory usage analysis
```

---

## 🏗️ Architecture Overview

### **Framework Structure**

```
sebf/
├── framework/              # 🏗️ Core Framework (Do Not Modify)
│   ├── core/              # Core application class
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
└── wiki/                # 📚 Documentation
```

### **Clean Separation of Concerns**

- **Framework Code** (`framework/`) - Core infrastructure, don't modify
- **Application Code** (`app/`, `routes/`) - Your business logic
- **Configuration** (`.env`) - Environment-specific settings
- **Documentation** (`wiki/`) - Comprehensive guides

---

## 🌐 API Documentation

### **Core Endpoints**

```bash
GET  /                      # API information
GET  /api                   # API documentation
GET  /api/health            # Basic health check
GET  /api/health/detailed   # Detailed system status
GET  /api/health/services   # Service status list
```

### **Authentication Endpoints**

```bash
POST /api/auth/register     # User registration
POST /api/auth/login        # User login
POST /api/auth/logout       # User logout
POST /api/auth/refresh      # Refresh JWT token
```

### **User Management**

```bash
GET    /api/users           # List users (admin)
GET    /api/users/profile   # Current user profile
PUT    /api/users/profile   # Update profile
GET    /api/users/:id       # Get user details
DELETE /api/users/:id       # Delete user (admin)
```

### **Real-time Features**

```bash
GET /api/sse                # Server-sent events
GET /api/sse/subscribe/:channel  # Subscribe to channel
```

### **Admin & System**

```bash
GET /api/admin/services     # Service management
GET /api/admin/system       # System information
GET /api/admin/dashboard    # Admin dashboard data
```

---

## 🧪 Testing

### **Test Environment**

The framework uses **dual database testing**:
- **Main Database**: PostgreSQL for integration tests
- **Test Database**: SQLite for fast unit tests

### **Running Tests**

```bash
# All tests with coverage
npm test

# Specific test suites
npm run test:unit           # Unit tests (SQLite)
npm run test:feature        # Integration tests (PostgreSQL)

# Watch mode for development
npm run test:watch

# Test specific files
npm test UserController
npm test auth
```

### **Test Configuration**

Tests run in isolated environment with:
- Separate Redis database (DB 1)
- SQLite test database
- Disabled external services
- Mock data and fixtures
- Automatic cleanup

---

## 🔧 Configuration Guide

### **Environment Variables**

See [`.env.example`](.env.example) for complete configuration options.

#### **Service Control**
```env
# Enable/disable any service
DATABASE_ENABLED=true      # Required
REDIS_ENABLED=true         # Session management
TYPESENSE_ENABLED=false    # Search engine
MINIO_ENABLED=false        # Object storage
FIREBASE_ENABLED=false     # Notifications
SSE_ENABLED=true          # Real-time events
MEMORY_ENABLED=true       # Performance monitoring
EMAIL_ENABLED=false       # Email service
```

#### **Database Configuration**
```env
# Main database (required)
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# Test database (automatic)
TEST_DATABASE_URL="file:./prisma/test.db"

# Connection settings
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=5000
```

#### **Redis Configuration**
```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0
REDIS_KEY_PREFIX=your-app:
```

#### **Search Engine (Typesense)**
```env
TYPESENSE_ENABLED=true
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_API_KEY=your-api-key
```

#### **Object Storage (MinIO)**
```env
MINIO_ENABLED=true
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=your-bucket
```

#### **Notifications (Firebase)**
```env
FIREBASE_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
FIREBASE_DATABASE_URL=https://project-id-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=project-id.appspot.com
```

For complete configuration options, see [`ENVIRONMENT_UPDATES.md`](ENVIRONMENT_UPDATES.md).

---

## 🚀 Production Deployment

### **Environment Setup**

1. **Set production environment**:
```env
NODE_ENV=production
APP_ENV=production
```

2. **Configure secure keys**:
```bash
npm run control keys generate --production
```

3. **Enable required services**:
```env
DATABASE_ENABLED=true
REDIS_ENABLED=true
# Enable optional services as needed
```

### **Performance Optimization**

```env
# Node.js optimization
NODE_OPTIONS="--max_old_space_size=4096"

# Clustering
CLUSTER_WORKERS=auto

# Compression and security
ENABLE_COMPRESSION=true
TRUST_PROXY=true
```

### **Monitoring**

```env
# Health check endpoint
HEALTH_CHECK_API_KEY=your-secure-api-key

# Memory monitoring
MEMORY_ENABLED=true
MEMORY_THRESHOLD=80

# External monitoring
MONITORING_ENABLED=true
MONITORING_ENDPOINT=https://your-monitoring-service.com
```

---

## 📚 Documentation

### **Wiki Documentation**

Comprehensive guides available in the [`wiki/`](wiki/) directory:

1. **[Introduction](wiki/01-Introduction.md)** - Framework overview and philosophy
2. **[Folder Structure](wiki/02-Folder-Structure.md)** - Project organization
3. **[Configuration](wiki/03-Configuration.md)** - Environment and service setup
4. **[Routing](wiki/04-Routing.md)** - API routes and middleware
5. **[Controllers](wiki/05-Controllers.md)** - Request handling and responses
6. **[Services](wiki/06-Services.md)** - Business logic and external integrations
7. **[Database & Models](wiki/07-Database-And-Models.md)** - Prisma ORM and database
8. **[Error Handling](wiki/08-Error-Handling.md)** - Error management and logging
9. **[Testing](wiki/09-Testing.md)** - Test strategies and utilities
10. **[Middleware System](wiki/10-Middleware-System.md)** - Authentication and validation

### **Additional Documentation**

- **[Service Configuration](SERVICE_CONFIGURATION.md)** - Dynamic service management
- **[Environment Updates](ENVIRONMENT_UPDATES.md)** - Configuration change log
- **[CLI Reference](wiki/CLI-Reference.md)** - Command-line tool guide

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

### **Development Workflow**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `npm test`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to your branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### **Code Standards**

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Keep framework and application code separate

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### **Getting Help**

- 📚 **Documentation**: Check the [wiki](wiki/) first
- 🐛 **Bug Reports**: [Open an issue](https://github.com/your-org/sebf/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/your-org/sebf/discussions)
- 💬 **Community**: [Join our Discord](https://discord.gg/sebf)

### **Troubleshooting**

**Service Connection Issues:**
```bash
npm run control services test [service-name]
npm run control env validate
```

**Database Problems:**
```bash
npm run control db:health
npm run prisma:reset  # WARNING: Deletes all data
```

**Memory Issues:**
```bash
npm run control memory:check
npm run memory:optimize
```

---

## 🙏 Acknowledgments

Built with ❤️ using these amazing technologies:

- **[Express.js](https://expressjs.com/)** - Fast, unopinionated web framework
- **[Prisma](https://prisma.io/)** - Type-safe database toolkit
- **[Redis](https://redis.io/)** - In-memory data structure store
- **[Typesense](https://typesense.org/)** - Fast, typo-tolerant search engine  
- **[Firebase](https://firebase.google.com/)** - App development platform
- **[Jest](https://jestjs.io/)** - JavaScript testing framework
- **[Winston](https://github.com/winstonjs/winston)** - Logging library

---

**Sports Excitement Backend Framework** - *Build faster, scale better, ship with confidence.* 🚀