# Configuration (`/config`)

This directory contains **legacy configuration files** that remain for backward compatibility. Most configuration has been moved to the framework.

---

## 📋 **Current Structure**

```
config/
├── app.js              # Basic app configuration (legacy)
└── database.js         # Basic database configuration (legacy)
```

## ⚠️ **Important Note**

**Most configuration is now in the framework:**

- **Service Configuration** → `framework/config/services.js`
- **Database Configuration** → `framework/config/prisma.js`
- **Test Database** → `framework/config/prisma.test.js`
- **Logging Configuration** → `framework/config/logging.js`

## 🔧 **Environment Variables**

Configuration values are read from environment variables:

```bash
# Core Database
DATABASE_URL=postgresql://username:password@localhost:5432/database

# Test Database  
TEST_DATABASE_URL=file:./prisma/test.db

# Session Management
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Service Configuration (Enable/Disable)
REDIS_ENABLED=true
TYPESENSE_ENABLED=false
FIREBASE_ENABLED=false
```

## 🎯 **Dynamic Service Configuration**

Services are now configured in `framework/config/services.js` with dynamic enable/disable:

```javascript
// Example service configuration
const config = {
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    required: true, // Required for JWT sessions
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  }
};
```

## 📚 **Adding New Configuration**

For new configuration values:

1. **Add to environment files** (`.env.example`, `.env.testing`)
2. **Use in your application code**:

```javascript
// In your service or controller
const myConfig = {
  apiKey: process.env.MY_API_KEY,
  timeout: parseInt(process.env.MY_TIMEOUT) || 5000,
  enabled: process.env.MY_SERVICE_ENABLED === 'true'
};
```

3. **For complex configuration**, extend `framework/config/services.js`

The framework handles environment loading, validation, and service management automatically. 🚀