# Configuration

This document explains the comprehensive configuration system of the Sports Excitement Backend Framework, including the powerful dynamic service management capabilities.

---

## 🎛️ **Dynamic Service Configuration**

SEBF features a revolutionary **dynamic service configuration system** that allows you to enable or disable any service without changing code, making deployment flexible and cost-effective.

### **Service Control Philosophy**
- **Enable only what you need** - Reduce infrastructure costs
- **Environment-specific configurations** - Different services per environment  
- **Zero-code service management** - All controlled via environment variables
- **Graceful degradation** - Applications work even when optional services fail

---

## 🔧 **Environment Configuration**

### **Environment Files**
- **`.env`** - Your local configuration (gitignored)
- **`.env.example`** - Complete template with all services
- **`.env.testing`** - Test-optimized configuration
- **`ENVIRONMENT_UPDATES.md`** - Comprehensive change log

### **Quick Setup**
```bash
# Copy environment template
cp .env.example .env

# Generate secure keys
npm run control keys generate

# Validate configuration
npm run control env validate

# Check service status
npm run control services status
```

---

## 🎯 **Service Management**

### **Service Enable/Disable System**

Each service can be controlled with environment variables:

```env
# Service Control - Enable/Disable Any Service
DATABASE_ENABLED=true      # Required - cannot be disabled
REDIS_ENABLED=true         # Session management
TYPESENSE_ENABLED=false    # Search engine
MINIO_ENABLED=false        # Object storage
SUPABASE_ENABLED=false     # Alternative backend
FIREBASE_ENABLED=false     # Notifications
SSE_ENABLED=true          # Real-time events
MEMORY_ENABLED=true       # Performance monitoring
EMAIL_ENABLED=false       # Email service
```

### **Service Configuration Matrix**

| Service | Purpose | Default | Required | Fallback |
|---------|---------|---------|----------|----------|
| **Database** | PostgreSQL via Prisma | ✅ Enabled | ❗ Required | ❌ None |
| **Redis** | Caching & Sessions | ✅ Enabled | ❗ Required | ⚠️ Memory |
| **Typesense** | Search Engine | ❌ Disabled | ✅ Optional | ⚠️ Basic search |
| **Firebase** | Notifications | ❌ Disabled | ✅ Optional | ⚠️ SSE only |
| **MinIO** | Object Storage | ❌ Disabled | ✅ Optional | ⚠️ No file storage |
| **Supabase** | Alt Backend | ❌ Disabled | ✅ Optional | ⚠️ Main DB only |
| **SSE** | Real-time Events | ✅ Enabled | ✅ Optional | ❌ No real-time |
| **Memory** | Performance Monitor | ✅ Enabled | ✅ Optional | ❌ No monitoring |
| **Email** | SMTP Notifications | ❌ Disabled | ✅ Optional | ❌ No emails |

---

## 📋 **Configuration Categories**

### 🚀 **Core Application Settings**

```env
# Application Identity
APP_NAME="Your Application Name"
APP_VERSION="1.0.0"
APP_ENV=development
APP_KEY=your-generated-app-key-here
APP_DEBUG=true
APP_URL=http://localhost

# Server Configuration
PORT=3000
HOST=0.0.0.0

# Debug and Logging
DEBUG=false
LOG_LEVEL=info
LOG_CHANNEL=stack
```

### 🔐 **Enhanced Security Configuration**

```env
# JWT Authentication (Required)
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
JWT_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
JWT_ISSUER=your-app-name
JWT_AUDIENCE=your-app-audience

# Session Management (Required)
SESSION_SECRET=your-super-secret-session-key-here-at-least-32-characters-long
SESSION_NAME=your_app_session
SESSION_MAX_AGE=86400000
SESSION_SAME_SITE=strict
SESSION_SAVE_UNINITIALIZED=false
SESSION_RESAVE=false

# Health Check API Key (Required for monitoring)
HEALTH_CHECK_API_KEY=your-health-check-api-key-here

# API Security
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
API_RATE_LIMIT_MESSAGE="Too many requests, please try again later"
```

### 🗄️ **Database Configuration (Required)**

```env
# Service Control
DATABASE_ENABLED=true      # Cannot be disabled

# Main Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/your_db?schema=public"

# Test Database (SQLite - automatic)
TEST_DATABASE_URL="file:./prisma/test.db"

# Connection Settings
DB_CONNECTION=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=your_database
DB_USERNAME=your_user
DB_PASSWORD=your_password
DB_SCHEMA=public
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=5000
DB_IDLE_TIMEOUT=30000
```

### 🔴 **Redis Configuration (Required)**

```env
# Service Control
REDIS_ENABLED=true         # Required for sessions

# Connection Settings
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DATABASE=0

# Advanced Settings
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=5000
REDIS_RETRY_DELAY=100
REDIS_MAX_RETRIES=3
REDIS_FAMILY=4
REDIS_KEY_PREFIX=your-app:

# Fallback Strategy
REDIS_FALLBACK_TO_MEMORY=true
```

### 🔍 **Typesense Configuration (Optional)**

```env
# Service Control
TYPESENSE_ENABLED=false    # Enable for search functionality

# Connection Settings
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=your-typesense-api-key

# Performance Settings
TYPESENSE_CONNECTION_TIMEOUT=5
TYPESENSE_HEALTHCHECK_INTERVAL=30
TYPESENSE_NUM_RETRIES=3
TYPESENSE_RETRY_INTERVAL=0.1
TYPESENSE_LOG_LEVEL=warn

# Collections
TYPESENSE_USERS_COLLECTION=users
TYPESENSE_LOGS_COLLECTION=system_logs
TYPESENSE_ANALYTICS_COLLECTION=analytics
```

### 🔥 **Firebase Configuration (Optional)**

```env
# Service Control
FIREBASE_ENABLED=false     # Enable for push notifications

# Authentication
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/firebase-service-account-key.json
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Collections
FIREBASE_NOTIFICATIONS_COLLECTION=notifications
FIREBASE_DEVICE_TOKENS_COLLECTION=device_tokens
FIREBASE_ANALYTICS_COLLECTION=analytics
FIREBASE_USER_PROFILES_COLLECTION=user_profiles
```

### 🪣 **MinIO Configuration (Optional)**

```env
# Service Control
MINIO_ENABLED=false        # Enable for object storage

# Connection Settings
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-minio-access-key
MINIO_SECRET_KEY=your-minio-secret-key

# Storage Settings
MINIO_BUCKET=your-bucket
MINIO_REGION=us-east-1
MINIO_PART_SIZE=64
MINIO_MAX_RETRIES=3
MINIO_RETRY_DELAY=1000
MINIO_PRESIGNED_URL_EXPIRY=3600
```

### 🌐 **Supabase Configuration (Optional)**

```env
# Service Control
SUPABASE_ENABLED=false     # Enable as alternative backend

# Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key

# Features
SUPABASE_AUTH_ENABLED=true
SUPABASE_STORAGE_BUCKET=files
```

### 📧 **Email Configuration (Optional)**

```env
# Service Control
EMAIL_ENABLED=false        # Enable for SMTP notifications

# SMTP Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="Your App <noreply@yourapp.com>"
```

### 📡 **Server-Sent Events Configuration (Optional)**

```env
# Service Control
SSE_ENABLED=true           # Enable for real-time features

# Connection Settings
SSE_HEARTBEAT_INTERVAL=30000
SSE_MAX_CONNECTIONS=1000
SSE_CONNECTION_TIMEOUT=300000
SSE_RETRY_INTERVAL=5000
```

### 🧠 **Memory Monitoring Configuration (Optional)**

```env
# Service Control
MEMORY_ENABLED=true        # Enable for performance monitoring

# Monitoring Settings
MEMORY_MONITORING_ENABLED=true
MEMORY_MONITOR_INTERVAL=60000
MEMORY_THRESHOLD=80
```

---

## 🏗️ **Configuration Scenarios**

### **Scenario 1: Minimal Setup (Development)**

Perfect for rapid development with minimal infrastructure:

```env
# Required Services Only
DATABASE_ENABLED=true
REDIS_ENABLED=true

# Optional Services (Disabled)
TYPESENSE_ENABLED=false
FIREBASE_ENABLED=false
MINIO_ENABLED=false
SUPABASE_ENABLED=false

# Development Features
SSE_ENABLED=true
MEMORY_ENABLED=true
EMAIL_ENABLED=false
```

**Benefits:**
- ✅ Fast startup time
- ✅ Minimal infrastructure requirements
- ✅ Low resource usage
- ✅ Easy debugging

### **Scenario 2: Full-Featured (Production)**

Complete feature set with all services enabled:

```env
# All Services Enabled
DATABASE_ENABLED=true
REDIS_ENABLED=true
TYPESENSE_ENABLED=true
FIREBASE_ENABLED=true
MINIO_ENABLED=true
SUPABASE_ENABLED=true
SSE_ENABLED=true
MEMORY_ENABLED=true
EMAIL_ENABLED=true
```

**Benefits:**
- ✅ Complete functionality
- ✅ Advanced search capabilities
- ✅ Push notifications
- ✅ File storage
- ✅ Real-time features

### **Scenario 3: Search-Focused Application**

Optimized for search-heavy applications:

```env
# Core Services
DATABASE_ENABLED=true
REDIS_ENABLED=true

# Search & Analytics
TYPESENSE_ENABLED=true
FIREBASE_ENABLED=true    # For analytics

# Optional
SSE_ENABLED=true
MEMORY_ENABLED=true
MINIO_ENABLED=false
SUPABASE_ENABLED=false
EMAIL_ENABLED=false
```

### **Scenario 4: Supabase-Only Backend**

Using Supabase as primary backend with minimal local services:

```env
# Minimal Local Services
DATABASE_ENABLED=true    # Keep for sessions/local data
REDIS_ENABLED=true

# Supabase Primary
SUPABASE_ENABLED=true
FIREBASE_ENABLED=true    # Firebase + Supabase complement

# Disable Competing Services
TYPESENSE_ENABLED=false  # Use Supabase search
MINIO_ENABLED=false      # Use Supabase storage
EMAIL_ENABLED=false      # Use Supabase auth emails

# Keep Real-time
SSE_ENABLED=true
MEMORY_ENABLED=true
```

---

## 🔧 **Framework Configuration Files**

### **`framework/config/services.js`**

The heart of the dynamic service system:

```javascript
// Dynamic service enablement
function isServiceEnabled(serviceName, autoDetectCondition) {
  const explicitEnable = process.env[`${serviceName.toUpperCase()}_ENABLED`];
  if (explicitEnable !== undefined) {
    return explicitEnable === 'true';
  }
  return autoDetectCondition;
}

const config = {
  database: {
    enabled: isServiceEnabled('database', !!process.env.DATABASE_URL),
    required: true,
    url: process.env.DATABASE_URL,
    // ... full configuration
  },
  
  redis: {
    enabled: isServiceEnabled('redis', !!process.env.REDIS_HOST),
    required: true,
    host: process.env.REDIS_HOST || '127.0.0.1',
    // ... full configuration
  },
  
  typesense: {
    enabled: isServiceEnabled('typesense', !!(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY)),
    required: false,
    host: process.env.TYPESENSE_HOST,
    // ... full configuration
  }
  
  // ... all other services
};

// Service management functions
function validateConfig() { /* ... */ }
function getEnabledServices() { /* ... */ }
function getAllServices() { /* ... */ }

module.exports = {
  ...config,
  validateConfig,
  getEnabledServices,
  getAllServices
};
```

### **`framework/config/prisma.js`**

Enhanced Prisma client with dual database support:

```javascript
class PrismaService {
  constructor() {
    // Automatically switch to test client in test environment
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
      this.testService = new TestPrismaClient();
    } else {
      this.initializeClient();
    }
  }

  initializeClient() {
    this.client = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
  }

  // Methods automatically delegate to test service when in test mode
  async connect() {
    if (this.testService) {
      return this.testService.connect();
    }
    // ... main database connection logic
  }
  
  // ... other methods with test delegation
}
```

### **`framework/config/logging.js`**

Winston logger configuration:

```javascript
module.exports = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'storage/logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'storage/logs/combined.log'
    })
  ]
};
```

---

## 🛠️ **CLI Configuration Management**

### **Service Management Commands**

```bash
# Check all service status
npm run control services status

# Test specific service connection
npm run control services test redis
npm run control services test typesense
npm run control services test all

# List all services with configuration
npm run control services list

# Get service configuration help
npm run control services help
```

### **Environment Commands**

```bash
# Environment validation
npm run control env validate
npm run control env check

# Key generation
npm run control keys generate
npm run control keys jwt

# Configuration analysis
npm run control services dependencies
npm run control services help configuration
```

### **Service API Endpoints**

```bash
# Runtime service information
GET /api/admin/services              # List all services
GET /api/admin/services/:name        # Service details
GET /api/admin/services/dependencies # Service dependency tree
GET /api/admin/services/help/configuration # Configuration help

# Health monitoring
GET /api/health                      # Basic health
GET /api/health/detailed             # All services health
GET /api/health/services/:service    # Specific service health
```

---

## 🎯 **Configuration Best Practices**

### **Security Best Practices**

1. **Generate Strong Keys**
   ```bash
   npm run control keys generate
   ```

2. **Use Environment-Specific Configurations**
   ```env
   # Development
   JWT_EXPIRES_IN=7d
   
   # Production
   JWT_EXPIRES_IN=1d
   ```

3. **Validate Configuration**
   ```bash
   npm run control env validate
   ```

### **Performance Optimization**

1. **Enable Only Required Services**
   ```env
   # Disable unused services to save resources
   TYPESENSE_ENABLED=false
   MINIO_ENABLED=false
   ```

2. **Optimize Connection Settings**
   ```env
   # Adjust based on your infrastructure
   DB_MAX_CONNECTIONS=20
   REDIS_MAX_RETRIES=5
   ```

3. **Memory Management**
   ```env
   # Enable monitoring and set appropriate limits
   MEMORY_ENABLED=true
   MEMORY_THRESHOLD=80
   NODE_OPTIONS="--max_old_space_size=4096"
   ```

### **Development Workflow**

1. **Start with Minimal Configuration**
   ```env
   DATABASE_ENABLED=true
   REDIS_ENABLED=true
   # Everything else disabled
   ```

2. **Add Services Incrementally**
   ```bash
   # Test service before enabling
   npm run control services test typesense
   
   # Enable if test passes
   TYPESENSE_ENABLED=true
   ```

3. **Validate Before Deployment**
   ```bash
   npm run control env validate
   npm run control services status
   npm test
   ```

---

## 🚨 **Troubleshooting Configuration**

### **Common Issues**

1. **Service Connection Failures**
   ```bash
   npm run control services test [service-name]
   npm run control services status
   ```

2. **Missing Environment Variables**
   ```bash
   npm run control env validate
   npm run control env check
   ```

3. **Configuration Conflicts**
   ```bash
   npm run control services dependencies
   ```

### **Debug Mode**

Enable detailed logging for configuration debugging:

```env
LOG_LEVEL=debug
DEBUG=true
APP_DEBUG=true
```

### **Service Health Monitoring**

Monitor service health in real-time:

```bash
# Check service health
curl http://localhost:3000/api/health/detailed

# Monitor specific service
curl http://localhost:3000/api/health/services/redis
```

---

## 🎉 **Configuration Summary**

The SEBF configuration system provides:

✅ **Dynamic Service Management** - Enable/disable services without code changes
✅ **Environment-Specific Configs** - Different settings per environment
✅ **Automatic Service Discovery** - Framework detects available services
✅ **Comprehensive Validation** - Validate configuration before startup
✅ **Health Monitoring** - Real-time service health tracking
✅ **CLI Management** - Powerful command-line tools
✅ **Production Ready** - Optimized for enterprise deployment
✅ **Developer Friendly** - Clear documentation and helpful errors

This flexible configuration system enables you to deploy the same codebase with different service combinations, making it perfect for development, testing, staging, and production environments with varying infrastructure requirements.