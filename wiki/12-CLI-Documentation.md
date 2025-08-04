# SEBF Control CLI Documentation

## Overview

The **Sports Excitement Backend Framework (SEBF) Control CLI** is a powerful, intelligent command-line interface for managing your SEBF application. It provides comprehensive service management, smart package handling, environment configuration, and much more.

## Installation & Setup

The CLI is built into your SEBF project and available via the `control` command:

```bash
# Make sure it's executable
chmod +x control.js

# Run commands
./control.js --help
# or
node control.js --help

# If installed globally via npm link
control --help
```

## Core Features

### 🔧 **Intelligent Service Management**
- **Modular Services**: Enable/disable services based on your needs
- **Smart Dependencies**: Automatic package management for enabled services
- **Health Monitoring**: Real-time service health checks
- **Configuration Hints**: Guided setup for each service

### 📦 **Smart Package Management**
- **Dependency Analysis**: Only install packages for enabled services
- **Unused Package Detection**: Identify and remove unnecessary packages
- **Compatibility Checking**: Ensure package compatibility
- **Automatic Updates**: Keep dependencies current

### 🌍 **Environment Management**
- **Smart Validation**: Service-aware environment validation
- **Configuration Templates**: Pre-built setups (minimal, full, custom)
- **Environment Optimization**: Optimize settings for enabled services
- **Interactive Setup**: Guided configuration process

### 🗄️ **Database Management**
- **Multi-Database Support**: PostgreSQL (Prisma) and MongoDB
- **Database Switching**: Easy switching between database types
- **Smart Migrations**: Database-aware migration handling
- **Health Monitoring**: Database connection testing

## Command Reference

### Key Management

```bash
# Generate individual keys
control key generate              # Generate APP_KEY
control key jwt                   # Generate JWT_SECRET
control key session              # Generate SESSION_SECRET

# Generate all keys at once
control key all                   # Generate all application keys
control key all --force          # Force overwrite existing keys
```

### Environment Management

```bash
# Basic environment operations
control env copy                 # Copy .env.example to .env
control env validate            # Validate current configuration
control env check               # Check for missing variables

# Smart environment setup
control env setup               # Interactive setup
control env setup --minimal    # Minimal services only
control env setup --full       # All services enabled
control env optimize           # Optimize for enabled services
```

### Service Management

```bash
# Service information
control service list                    # List all services
control service list --enabled-only    # Show only enabled services
control service list --detailed        # Show detailed information

# Service health & testing
control service health                  # Check all service health
control service health --enabled-only  # Check only enabled services
control service test redis             # Test specific service

# Service control
control service enable redis           # Enable a service
control service enable redis --install-deps  # Enable and install dependencies
control service disable minio          # Disable a service
control service disable minio --remove-deps  # Disable and remove dependencies

# Service configuration
control service configure              # List configurable services
control service configure redis        # Show configuration hints for service
control service dependencies          # Show all service dependencies
control service dependencies redis    # Show dependencies for specific service

# Service templates
control service template myservice     # Generate custom service template
```

### Database Management

```bash
# Database operations (auto-detects database type)
control db migrate                     # Run migrations
control db generate                    # Generate client
control db seed                        # Seed database
control db reset --force              # Reset database
control db studio                     # Open database studio
control db status                     # Check database connections

# Database type specific operations
control db migrate --db prisma        # Run Prisma migrations
control db migrate --db mongodb       # Handle MongoDB setup
control db switch mongodb             # Switch to MongoDB
control db switch prisma              # Switch to PostgreSQL/Prisma
```

### Development Commands

```bash
# Development setup
control dev setup                     # Complete development setup
control dev setup --minimal           # Setup with minimal services
control dev setup --services redis,database  # Setup with specific services

# Development operations
control dev start                     # Start development server
control dev start --check-services    # Check services before starting
control dev test                      # Run tests
control dev test --services           # Test service connections
control dev lint                      # Run linting
control dev lint --fix               # Auto-fix linting issues
control dev doctor                    # Comprehensive health check
```

### Project Management

```bash
# Project initialization
control project init                          # Initialize new project
control project init --template minimal      # Use minimal template
control project init --template api          # Use API template
control project init --template fullstack    # Use fullstack template
control project init --services redis,db     # Custom service selection

# Project templates
control project templates                     # List available templates

# Project analysis
control project analyze                       # Analyze current configuration
control project optimize                      # Optimize project setup
control project optimize --remove-unused     # Remove unused dependencies

# Configuration management
control project clone sports-excitement/sebf  # Clone config from GitHub
control export --output config.json          # Export configuration
control import config.json                   # Import configuration
```

### Package Management

```bash
# Package operations
control package install               # Install packages for enabled services
control package install --force      # Force reinstall all packages
control package remove               # Remove unused packages (dry run)
control package remove --force       # Actually remove unused packages
control package audit                # Security audit
control package update               # Update packages
control package check                # Check compatibility
```

### Utility Commands

```bash
# Information & diagnostics
control info                         # Basic application info
control info --services             # Include service status
control info --config               # Include configuration details
control routes                       # List API routes
control routes --format json        # Output as JSON
control benchmark                    # Performance benchmarks

# Maintenance
control clear                        # Clear cache and logs
control clear --all                 # Clear everything including node_modules
control clear --services            # Clear service-specific caches

# JWT utilities
control jwt:decode <token>           # Decode and validate JWT token
```

## Service Templates

### Available Services

| Service | Description | Dependencies | Required Config |
|---------|------------|--------------|-----------------|
| `database` | PostgreSQL via Prisma | `@prisma/client`, `prisma` | `DATABASE_URL` |
| `mongodb` | MongoDB via Mongoose | `mongoose` | `MONGODB_PRIMARY_HOST`, `MONGODB_PRIMARY_DATABASE` |
| `redis` | Redis cache/sessions | `ioredis`, `connect-redis` | Optional (has defaults) |
| `typesense` | Search engine | `typesense` | `TYPESENSE_API_KEY` |
| `minio` | Object storage | `minio` | `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` |
| `supabase` | Backend-as-a-Service | `@supabase/supabase-js` | `SUPABASE_URL`, `SUPABASE_KEY` |
| `firebase` | Firebase/Firestore | `firebase-admin` | `FIREBASE_SERVICE_ACCOUNT_KEY` |
| `email` | Email service | `nodemailer` | `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` |
| `sse` | Server-Sent Events | Built-in | Optional |
| `memory` | Memory monitoring | Built-in | Optional |
| `error_handling` | Error management | Built-in | Optional |
| `auth` | Authentication | Built-in | Optional |
| `security` | Security headers/rate limiting | `helmet`, `express-rate-limit` | Optional |
| `cors` | CORS management | Built-in | Optional |

### Project Templates

#### Minimal Template
- **Services**: `database`, `redis`, `cors`, `error_handling`, `memory`, `sse`
- **Use Case**: Simple API projects, minimal overhead
- **Dependencies**: ~8 packages

#### API Template  
- **Services**: Minimal + `auth`, `security`
- **Use Case**: REST API with authentication and security
- **Dependencies**: ~12 packages

#### Fullstack Template
- **Services**: API + `minio`, `email`
- **Use Case**: Complete web applications with file uploads and emails
- **Dependencies**: ~15 packages

#### Microservice Template
- **Services**: `redis`, `cors`, `error_handling`, `auth`, `typesense`
- **Use Case**: Microservice architecture with search capabilities
- **Dependencies**: ~10 packages

## Configuration Management

### Environment Variables

The CLI intelligently manages environment variables based on enabled services:

```bash
# Core variables (always required)
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Service enable/disable flags
DATABASE_ENABLED=true
MONGODB_ENABLED=false
REDIS_ENABLED=true
TYPESENSE_ENABLED=false
# ... etc for each service

# Service-specific configuration
DATABASE_URL=postgresql://user:pass@localhost/db
REDIS_HOST=localhost
REDIS_PORT=6379
TYPESENSE_API_KEY=your-api-key
# ... etc
```

### Smart Validation

The CLI validates configuration based on enabled services:

```bash
control env validate
```

Output example:
```
📋 Environment Validation Results:
=====================================

CORE Configuration:
✅ JWT_SECRET - Properly configured
✅ SESSION_SECRET - Properly configured

DATABASE Configuration:
✅ DATABASE_URL - Properly configured

REDIS Configuration:
⚠️ REDIS_PASSWORD - Using default Redis password
```

## Advanced Usage

### Custom Service Creation

Generate a custom service template:

```bash
control service template MyCustomService --overwrite
```

This creates `app/Services/MyCustomService.js` with a complete service template including:
- Connection management
- Health checking
- Configuration handling
- Error handling
- Logging integration

### Modular Project Setup

Create a project with only the services you need:

1. **Start with minimal setup**:
```bash
control project init --template minimal
```

2. **Add services as needed**:
```bash
control service enable typesense --install-deps
control service enable minio --install-deps
```

3. **Configure services**:
```bash
control service configure typesense
# Shows configuration hints for Typesense
```

4. **Verify setup**:
```bash
control dev doctor
# Runs comprehensive health check
```

### Package Optimization

Keep your project lean by managing packages intelligently:

```bash
# See what packages you have
control project analyze

# Remove unused packages
control package remove --dry-run  # See what would be removed
control package remove --force    # Actually remove them

# Check for security issues
control package audit
```

### Database Switching

Switch between database types easily:

```bash
# Switch from Prisma to MongoDB
control db switch mongodb

# Switch back to Prisma
control db switch prisma

# Check database status
control db status
```

## Best Practices

### 1. Start Minimal
Always start with the minimal template and add services as needed:
```bash
control project init --template minimal
```

### 2. Use Service-Specific Commands
Enable services with dependency installation:
```bash
control service enable redis --install-deps
```

### 3. Regular Health Checks
Monitor your services regularly:
```bash
control dev doctor  # Comprehensive check
control service health --enabled-only  # Quick service check
```

### 4. Environment Optimization
Periodically optimize your environment:
```bash
control env optimize
control package remove --dry-run
```

### 5. Configuration Management
Export configurations for backup/sharing:
```bash
control export --output my-project-config.json
```

## Troubleshooting

### Common Issues

1. **Service Configuration Errors**
```bash
control service configure <service-name>
# Shows configuration hints
```

2. **Package Issues**
```bash
control package check  # Check compatibility
control package install --force  # Reinstall all packages
```

3. **Database Connection Issues**
```bash
control db status  # Check connections
control db switch <type>  # Switch database type
```

4. **Environment Issues**
```bash
control env validate  # Check configuration
control env optimize  # Fix common issues
```

### Getting Help

```bash
control --help                 # General help
control service --help         # Service command help
control service enable --help  # Specific command help
```

## Migration Guide

### From Old control.js

If you're upgrading from the old control.js:

1. **Backup your current setup**:
```bash
cp control.js control.js.old
```

2. **Update to new CLI** (already done if you're reading this)

3. **Analyze your current setup**:
```bash
control project analyze
```

4. **Optimize your configuration**:
```bash
control env optimize
control package remove --dry-run
```

5. **Test everything**:
```bash
control dev doctor
```

The new CLI is backward compatible with your existing `.env` files and configuration.

## Contributing

The SEBF Control CLI is designed to be extensible. You can:

1. **Add new services** by extending the service management system
2. **Create new templates** by defining service combinations
3. **Add new commands** by extending the CLI class
4. **Improve validation** by adding more environment checks

## Support

For issues, feature requests, or questions:

1. Check this documentation first
2. Run `control dev doctor` for diagnostic information
3. Use `control --help` for command-specific help
4. Check the GitHub repository for known issues

---

*The SEBF Control CLI - Making backend development intelligent and efficient.*