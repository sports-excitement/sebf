#!/usr/bin/env node

const { Command } = require('commander');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const jwt = require('jsonwebtoken');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

/**
 * Sports Excitement Core Control CLI
 * A command-line interface for managing the Sports Excitement Core application
 */
class ControlCLI {
  constructor() {
    this.program = new Command();
    this.packageJson = require('./package.json');
    this.setupCommands();
  }

  /**
   * Setup all CLI commands
   */
  setupCommands() {
    this.program
      .name('control')
      .description('Sports Excitement Core Control CLI')
      .version(this.packageJson.version);

    // Key generation commands
    this.setupKeyCommands();

    // Environment commands
    this.setupEnvCommands();

    // Database commands
    this.setupDbCommands();

    // Service commands
    this.setupServiceCommands();

    // Development commands
    this.setupDevCommands();

    // Utility commands
    this.setupUtilityCommands();
  }

  /**
   * Setup key generation commands
   */
  setupKeyCommands() {
    const keyCommand = this.program
      .command('key')
      .description('Key generation commands');

    keyCommand
      .command('generate')
      .description('Generate application key')
      .option('-f, --force', 'Force overwrite existing key')
      .action((options) => this.generateAppKey(options));

    keyCommand
      .command('jwt')
      .description('Generate JWT secret key')
      .option('-f, --force', 'Force overwrite existing JWT secret')
      .action((options) => this.generateJwtKey(options));

    keyCommand
      .command('session')
      .description('Generate session secret key')
      .option('-f, --force', 'Force overwrite existing session secret')
      .action((options) => this.generateSessionKey(options));

    keyCommand
      .command('all')
      .description('Generate all keys (APP_KEY, JWT_SECRET, SESSION_SECRET)')
      .option('-f, --force', 'Force overwrite existing keys')
      .action((options) => this.generateAllKeys(options));
  }

  /**
   * Setup environment commands
   */
  setupEnvCommands() {
    const envCommand = this.program
      .command('env')
      .description('Environment management commands');

    envCommand
      .command('validate')
      .description('Validate environment configuration')
      .action(() => this.validateEnv());

    envCommand
      .command('copy')
      .description('Copy .env.example to .env')
      .option('-f, --force', 'Force overwrite existing .env file')
      .action((options) => this.copyEnvExample(options));

    envCommand
      .command('check')
      .description('Check for missing environment variables')
      .action(() => this.checkEnvVariables());
  }

  /**
   * Setup database commands
   */
  setupDbCommands() {
    const dbCommand = this.program
      .command('db')
      .description('Database management commands');

    dbCommand
      .command('migrate')
      .description('Run database migrations')
      .action(() => this.runMigrations());

    dbCommand
      .command('generate')
      .description('Generate Prisma client')
      .action(() => this.generatePrisma());

    dbCommand
      .command('seed')
      .description('Seed the database')
      .option('-c, --count <number>', 'Number of users to create', '10')
      .option('-n, --notifications', 'Create sample notifications')
      .action((options) => this.seedDatabase(options));

    dbCommand
      .command('reset')
      .description('Reset database (migrations + seed)')
      .option('-f, --force', 'Force reset without confirmation')
      .action((options) => this.resetDatabase(options));

    dbCommand
      .command('studio')
      .description('Open Prisma Studio')
      .action(() => this.openPrismaStudio());

    dbCommand
      .command('status')
      .description('Check database connection status')
      .action(() => this.checkDatabaseStatus());
  }

  /**
   * Setup service commands
   */
  setupServiceCommands() {
    const serviceCommand = this.program
      .command('service')
      .description('Service management commands');

    serviceCommand
      .command('health')
      .description('Check all services health')
      .action(() => this.checkServicesHealth());

    serviceCommand
      .command('test')
      .description('Test specific service connection')
      .argument('<service>', 'Service name (redis, typesense, minio, supabase, firebase)')
      .action((service) => this.testServiceConnection(service));

    serviceCommand
      .command('list')
      .description('List all available services')
      .action(() => this.listServices());
  }

  /**
   * Setup development commands
   */
  setupDevCommands() {
    const devCommand = this.program
      .command('dev')
      .description('Development commands');

    devCommand
      .command('setup')
      .description('Complete development setup')
      .option('-f, --force', 'Force overwrite existing files')
      .action((options) => this.setupDevelopment(options));

    devCommand
      .command('start')
      .description('Start development server')
      .action(() => this.startDevelopment());

    devCommand
      .command('test')
      .description('Run tests')
      .option('-w, --watch', 'Watch mode')
      .option('-c, --coverage', 'Generate coverage report')
      .action((options) => this.runTests(options));

    devCommand
      .command('lint')
      .description('Run ESLint')
      .option('-f, --fix', 'Auto-fix issues')
      .action((options) => this.runLint(options));
  }

  /**
   * Setup utility commands
   */
  setupUtilityCommands() {
    this.program
      .command('clear')
      .description('Clear application cache and logs')
      .option('-a, --all', 'Clear everything including node_modules')
      .action((options) => this.clearCache(options));

    this.program
      .command('info')
      .description('Display application information')
      .action(() => this.showInfo());

    this.program
      .command('routes')
      .description('List all available routes')
      .action(() => this.listRoutes());

    this.program
      .command('jwt:decode')
      .description('Decode JWT token')
      .argument('<token>', 'JWT token to decode')
      .action((token) => this.decodeJwt(token));
  }

  /**
   * Generate application key
   */
  generateAppKey(options = {}) {
    try {
      const key = crypto.randomBytes(32).toString('base64');
      this.updateEnvVariable('APP_KEY', key, options.force);
      this.success(`Application key generated: ${key}`);
    } catch (error) {
      this.error('Failed to generate application key:', error.message);
    }
  }

  /**
   * Generate JWT secret key
   */
  generateJwtKey(options = {}) {
    try {
      const secret = crypto.randomBytes(64).toString('hex');
      this.updateEnvVariable('JWT_SECRET', secret, options.force);
      this.success(`JWT secret generated: ${secret.substring(0, 16)}...`);
    } catch (error) {
      this.error('Failed to generate JWT secret:', error.message);
    }
  }

  /**
   * Generate session secret key
   */
  generateSessionKey(options = {}) {
    try {
      const secret = crypto.randomBytes(64).toString('hex');
      this.updateEnvVariable('SESSION_SECRET', secret, options.force);
      this.success(`Session secret generated: ${secret.substring(0, 16)}...`);
    } catch (error) {
      this.error('Failed to generate session secret:', error.message);
    }
  }

  /**
   * Generate all keys
   */
  generateAllKeys(options = {}) {
    this.info('Generating all application keys...');
    this.generateAppKey(options);
    this.generateJwtKey(options);
    this.generateSessionKey(options);
    this.success('All keys generated successfully!');
  }

  /**
   * Validate environment configuration
   */
  validateEnv() {
    try {
      require('dotenv').config();
      const config = require('./config/services');
      
      this.info('Validating environment configuration...');
      
      const validationResults = [];
      
      // Check required variables
      const required = [
        'DATABASE_URL',
        'JWT_SECRET',
        'SESSION_SECRET'
      ];

      required.forEach(variable => {
        if (!process.env[variable]) {
          validationResults.push({
            variable,
            status: 'missing',
            level: 'error'
          });
        } else if (process.env[variable].includes('your-') || process.env[variable].includes('password')) {
          validationResults.push({
            variable,
            status: 'default',
            level: 'warning'
          });
        } else {
          validationResults.push({
            variable,
            status: 'ok',
            level: 'success'
          });
        }
      });

      // Check optional service variables
      const optional = [
        'REDIS_HOST',
        'TYPESENSE_API_KEY',
        'MINIO_ACCESS_KEY',
        'SUPABASE_URL',
        'FIREBASE_SERVICE_ACCOUNT_KEY'
      ];

      optional.forEach(variable => {
        if (process.env[variable]) {
          validationResults.push({
            variable,
            status: 'configured',
            level: 'info'
          });
        }
      });

      // Display results
      console.log('\n📋 Environment Validation Results:');
      console.log('=====================================');

      validationResults.forEach(result => {
        const icon = {
          ok: '✅',
          configured: '🔧',
          default: '⚠️',
          missing: '❌'
        }[result.status];

        const color = {
          success: colors.green,
          info: colors.cyan,
          warning: colors.yellow,
          error: colors.red
        }[result.level];

        console.log(`${icon} ${color}${result.variable}${colors.reset} - ${result.status}`);
      });

      const errors = validationResults.filter(r => r.level === 'error');
      const warnings = validationResults.filter(r => r.level === 'warning');

      if (errors.length > 0) {
        this.error(`\n${errors.length} critical issues found. Please fix them before starting the application.`);
      } else if (warnings.length > 0) {
        this.warning(`\n${warnings.length} warnings found. Consider updating default values for production.`);
      } else {
        this.success('\n✅ Environment configuration is valid!');
      }

    } catch (error) {
      this.error('Environment validation failed:', error.message);
    }
  }

  /**
   * Copy .env.example to .env
   */
  copyEnvExample(options = {}) {
    try {
      const envPath = '.env';
      const examplePath = '.env.example';

      if (fs.existsSync(envPath) && !options.force) {
        this.warning('.env file already exists. Use --force to overwrite.');
        return;
      }

      if (!fs.existsSync(examplePath)) {
        this.error('.env.example file not found.');
        return;
      }

      fs.copyFileSync(examplePath, envPath);
      this.success('.env file created from .env.example');
      this.info('Don\'t forget to update the configuration values!');
    } catch (error) {
      this.error('Failed to copy .env.example:', error.message);
    }
  }

  /**
   * Check for missing environment variables
   */
  checkEnvVariables() {
    try {
      require('dotenv').config();
      
      const exampleContent = fs.readFileSync('.env.example', 'utf8');
      const exampleVars = exampleContent
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => line.split('=')[0]);

      const missing = exampleVars.filter(variable => !process.env[variable]);

      if (missing.length === 0) {
        this.success('All environment variables are defined!');
      } else {
        this.warning('Missing environment variables:');
        missing.forEach(variable => {
          console.log(`  ❌ ${variable}`);
        });
      }
    } catch (error) {
      this.error('Failed to check environment variables:', error.message);
    }
  }

  /**
   * Run database migrations
   */
  runMigrations() {
    try {
      this.info('Running database migrations...');
      execSync('npm run prisma:migrate', { stdio: 'inherit' });
      this.success('Database migrations completed successfully!');
    } catch (error) {
      this.error('Migration failed:', error.message);
    }
  }

  /**
   * Generate Prisma client
   */
  generatePrisma() {
    try {
      this.info('Generating Prisma client...');
      execSync('npm run prisma:generate', { stdio: 'inherit' });
      this.success('Prisma client generated successfully!');
    } catch (error) {
      this.error('Prisma generation failed:', error.message);
    }
  }

  /**
   * Seed the database
   */
  seedDatabase(options = {}) {
    try {
      this.info('Seeding database...');
      
      const env = { ...process.env };
      if (options.count) {
        env.SEED_USER_COUNT = options.count;
      }
      if (options.notifications) {
        env.SEED_NOTIFICATIONS = 'true';
      }

      execSync('npm run db:seed', { 
        stdio: 'inherit',
        env
      });
      
      this.success('Database seeded successfully!');
    } catch (error) {
      this.error('Database seeding failed:', error.message);
    }
  }

  /**
   * Reset database
   */
  resetDatabase(options = {}) {
    try {
      if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        rl.question('⚠️  This will reset your database. Are you sure? (yes/no): ', (answer) => {
          rl.close();
          if (answer.toLowerCase() === 'yes') {
            this.performDatabaseReset();
          } else {
            this.info('Database reset cancelled.');
          }
        });
      } else {
        this.performDatabaseReset();
      }
    } catch (error) {
      this.error('Database reset failed:', error.message);
    }
  }

  /**
   * Perform database reset
   */
  performDatabaseReset() {
    try {
      this.info('Resetting database...');
      execSync('npm run prisma:reset', { stdio: 'inherit' });
      this.success('Database reset completed successfully!');
    } catch (error) {
      this.error('Database reset failed:', error.message);
    }
  }

  /**
   * Open Prisma Studio
   */
  openPrismaStudio() {
    try {
      this.info('Opening Prisma Studio...');
      execSync('npm run prisma:studio', { stdio: 'inherit' });
    } catch (error) {
      this.error('Failed to open Prisma Studio:', error.message);
    }
  }

  /**
   * Check database status
   */
  async checkDatabaseStatus() {
    try {
      const { prismaService } = require('./config/prisma');
      const health = await prismaService.healthCheck();
      
      if (health.status === 'connected') {
        this.success('✅ Database connection is healthy');
      } else {
        this.error('❌ Database connection failed:', health.message);
      }
    } catch (error) {
      this.error('Failed to check database status:', error.message);
    }
  }

  /**
   * Check all services health
   */
  async checkServicesHealth() {
    try {
      this.info('Checking services health...');
      
      const services = [
        { name: 'Redis', service: require('./app/Services/RedisService') },
        { name: 'Typesense', service: require('./app/Services/TypesenseService') },
        { name: 'MinIO', service: require('./app/Services/MinioService') },
        { name: 'Supabase', service: require('./app/Services/SupabaseService') },
        { name: 'Firebase', service: require('./app/Services/FirebaseService') },
        { name: 'Database', service: require('./config/prisma').prismaService }
      ];

      console.log('\n🏥 Services Health Check:');
      console.log('=========================');

      for (const { name, service } of services) {
        try {
          const health = await service.testConnection();
          const icon = health.status === 'connected' ? '✅' : 
                      health.status === 'disabled' ? '⚠️' : '❌';
          console.log(`${icon} ${name}: ${health.message}`);
        } catch (error) {
          console.log(`❌ ${name}: ${error.message}`);
        }
      }
    } catch (error) {
      this.error('Health check failed:', error.message);
    }
  }

  /**
   * Test specific service connection
   */
  async testServiceConnection(serviceName) {
    try {
      const services = {
        redis: require('./app/Services/RedisService'),
        typesense: require('./app/Services/TypesenseService'),
        minio: require('./app/Services/MinioService'),
        supabase: require('./app/Services/SupabaseService'),
        firebase: require('./app/Services/FirebaseService'),
        database: require('./config/prisma').prismaService
      };

      const service = services[serviceName.toLowerCase()];
      if (!service) {
        this.error('Invalid service name. Available services: redis, typesense, minio, supabase, firebase, database');
        return;
      }

      this.info(`Testing ${serviceName} connection...`);
      const health = await service.testConnection();
      
      if (health.status === 'connected') {
        this.success(`✅ ${serviceName} connection successful: ${health.message}`);
      } else {
        this.warning(`⚠️ ${serviceName} connection issue: ${health.message}`);
      }
    } catch (error) {
      this.error(`${serviceName} connection test failed:`, error.message);
    }
  }

  /**
   * List all services
   */
  listServices() {
    console.log('\n📋 Available Services:');
    console.log('======================');
    console.log('• redis        - Redis cache and session store');
    console.log('• typesense    - Search and analytics engine');
    console.log('• minio        - Object storage service');
    console.log('• supabase     - Core-as-a-Service platform');
    console.log('• firebase     - Firebase/Firestore for notifications');
    console.log('• database     - PostgreSQL database via Prisma');
    console.log('\nUse: control service test <service-name>');
  }

  /**
   * Complete development setup
   */
  setupDevelopment(options = {}) {
    try {
      this.info('🚀 Setting up development environment...');
      
      // Copy .env if needed
      if (!fs.existsSync('.env')) {
        this.copyEnvExample(options);
      }
      
      // Generate keys
      this.generateAllKeys(options);
      
      // Generate Prisma client
      this.generatePrisma();
      
      // Run migrations
      this.runMigrations();
      
      // Seed database
      this.seedDatabase({ count: '10', notifications: true });
      
      this.success('🎉 Development environment setup completed!');
      this.info('You can now run: npm run dev');
    } catch (error) {
      this.error('Development setup failed:', error.message);
    }
  }

  /**
   * Start development server
   */
  startDevelopment() {
    try {
      this.info('Starting development server...');
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      this.error('Failed to start development server:', error.message);
    }
  }

  /**
   * Run tests
   */
  runTests(options = {}) {
    try {
      let command = 'npm test';
      
      if (options.watch) {
        command = 'npm run test';
      } else if (options.coverage) {
        command = 'npm run test:coverage';
      }
      
      this.info('Running tests...');
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      this.error('Tests failed:', error.message);
    }
  }

  /**
   * Run ESLint
   */
  runLint(options = {}) {
    try {
      const command = options.fix ? 'npm run lint:fix' : 'npm run lint';
      this.info('Running ESLint...');
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      this.error('Linting failed:', error.message);
    }
  }

  /**
   * Clear cache and logs
   */
  clearCache(options = {}) {
    try {
      this.info('Clearing cache and temporary files...');
      
      const pathsToClear = [
        'storage/cache',
        'storage/sessions',
        'storage/logs'
      ];

      pathsToClear.forEach(dirPath => {
        if (fs.existsSync(dirPath)) {
          execSync(`rm -rf ${dirPath}/*`, { stdio: 'pipe' });
          this.success(`Cleared: ${dirPath}`);
        }
      });

      if (options.all) {
        this.warning('Removing node_modules...');
        execSync('rm -rf node_modules package-lock.json', { stdio: 'inherit' });
        this.info('Run npm install to reinstall dependencies');
      }

      this.success('Cache cleared successfully!');
    } catch (error) {
      this.error('Failed to clear cache:', error.message);
    }
  }

  /**
   * Show application information
   */
  showInfo() {
    require('dotenv').config();
    
    console.log(`\n${colors.cyan}${colors.bright}Sports Excitement Core${colors.reset}`);
    console.log('================================');
    console.log(`Version: ${this.packageJson.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Port: ${process.env.PORT || 3000}`);
    
    console.log('\n📦 Dependencies:');
    const deps = this.packageJson.dependencies;
    Object.keys(deps).slice(0, 5).forEach(dep => {
      console.log(`  • ${dep}: ${deps[dep]}`);
    });
    
    if (Object.keys(deps).length > 5) {
      console.log(`  ... and ${Object.keys(deps).length - 5} more`);
    }
  }

  /**
   * List all routes
   */
  listRoutes() {
    console.log('\n🛣️  Available Routes:');
    console.log('===================');
    console.log('GET    /                  - API information');
    console.log('GET    /api               - API endpoints list');
    console.log('GET    /api/health        - Basic health check');
    console.log('GET    /api/health/*      - Detailed health endpoints');
    console.log('GET    /api/users         - List users');
    console.log('POST   /api/users         - Create user');
    console.log('GET    /api/users/:id     - Get user by ID');
    console.log('PUT    /api/users/:id     - Update user');
    console.log('DELETE /api/users/:id     - Delete user');
    console.log('GET    /api/sse           - Server-sent events');
    console.log('GET    /api/protected     - Protected route demo');
    console.log('GET    /api/session-info  - Session information');
  }

  /**
   * Decode JWT token
   */
  decodeJwt(token) {
    try {
      // Load configuration for JWT verification
      require('dotenv').config();
      const config = require('./framework/config/services');
      
      // Verify token signature for security
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        complete: true
      });
      
      if (!decoded) {
        this.error('Invalid JWT token');
        return;
      }

      console.log('\n🔑 JWT Token Information:');
      console.log('========================');
      console.log(`Header:`, JSON.stringify(decoded.header, null, 2));
      console.log(`\nPayload:`, JSON.stringify(decoded.payload, null, 2));
      
      // Check expiration
      if (decoded.payload.exp) {
        const expDate = new Date(decoded.payload.exp * 1000);
        const isExpired = expDate < new Date();
        console.log(`\nExpires: ${expDate.toISOString()}`);
        console.log(`Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
      }

    } catch (error) {
      this.error('Failed to decode JWT token:', error.message);
    }
  }

  /**
   * Update environment variable
   */
  updateEnvVariable(key, value, force = false) {
    const envPath = '.env';
    
    if (!fs.existsSync(envPath)) {
      this.error('.env file not found. Run: control env copy');
      return;
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    
    if (keyRegex.test(envContent)) {
      if (!force) {
        this.warning(`${key} already exists. Use --force to overwrite.`);
        return;
      }
      envContent = envContent.replace(keyRegex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent);
  }

  /**
   * Console output methods
   */
  success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  }

  error(message, details = '') {
    console.log(`${colors.red}❌ ${message}${colors.reset}`);
    if (details) {
      console.log(`${colors.red}   ${details}${colors.reset}`);
    }
  }

  warning(message) {
    console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  }

  info(message) {
    console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
  }

  /**
   * Run the CLI
   */
  run() {
    this.program.parse(process.argv);
  }
}

// Create and run CLI
const cli = new ControlCLI();
cli.run(); 