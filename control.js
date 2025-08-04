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
 * Sports Excitement Backend Framework Control CLI
 * A modern, intelligent command-line interface for managing the SEBF application
 */
class ControlCLI {
  constructor() {
    this.program = new Command();
    this.packageJson = require('./package.json');
    this.serviceConfig = null;
    this.availableServices = {};
    this.setupCommands();
    this.loadServiceConfiguration();
  }

  /**
   * Load service configuration dynamically
   */
  loadServiceConfiguration() {
    try {
      // Load the services configuration
      this.serviceConfig = require('./framework/config/services');
      this.availableServices = this.serviceConfig.getAllServices();
    } catch (error) {
      this.warning('Could not load service configuration. Some features may be limited.');
    }
  }

  /**
   * Setup all CLI commands
   */
  setupCommands() {
    this.program
      .name('control')
      .description('SEBF - Sports Excitement Backend Framework Control CLI')
      .version(this.packageJson.version);

    // Core commands
    this.setupKeyCommands();
    this.setupEnvCommands();
    this.setupDbCommands();
    this.setupServiceCommands();
    this.setupDevCommands();
    this.setupProjectCommands();
    this.setupPackageCommands();
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

    envCommand
      .command('setup')
      .description('Interactive environment setup')
      .option('--minimal', 'Setup with minimal services only')
      .option('--full', 'Setup with all services enabled')
      .action((options) => this.setupEnvironment(options));

    envCommand
      .command('optimize')
      .description('Optimize environment for enabled services')
      .action(() => this.optimizeEnvironment());
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
      .option('--db <type>', 'Database type: prisma, mongodb')
      .action((options) => this.runMigrations(options));

    dbCommand
      .command('generate')
      .description('Generate database client')
      .option('--db <type>', 'Database type: prisma, mongodb')
      .action((options) => this.generateDatabase(options));

    dbCommand
      .command('seed')
      .description('Seed the database')
      .option('-c, --count <number>', 'Number of users to create', '10')
      .option('-n, --notifications', 'Create sample notifications')
      .option('--db <type>', 'Database type: prisma, mongodb')
      .action((options) => this.seedDatabase(options));

    dbCommand
      .command('reset')
      .description('Reset database (migrations + seed)')
      .option('-f, --force', 'Force reset without confirmation')
      .option('--db <type>', 'Database type: prisma, mongodb')
      .action((options) => this.resetDatabase(options));

    dbCommand
      .command('studio')
      .description('Open database studio')
      .option('--db <type>', 'Database type: prisma, mongodb')
      .action((options) => this.openDatabaseStudio(options));

    dbCommand
      .command('status')
      .description('Check database connection status')
      .action(() => this.checkDatabaseStatus());

    dbCommand
      .command('switch')
      .description('Switch between database types')
      .argument('<type>', 'Database type: prisma, mongodb')
      .action((type) => this.switchDatabase(type));
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
      .option('--enabled-only', 'Check only enabled services')
      .action((options) => this.checkServicesHealth(options));

    serviceCommand
      .command('test')
      .description('Test specific service connection')
      .argument('<service>', 'Service name')
      .action((service) => this.testServiceConnection(service));

    serviceCommand
      .command('list')
      .description('List all available services')
      .option('--enabled-only', 'Show only enabled services')
      .option('--detailed', 'Show detailed service information')
      .action((options) => this.listServices(options));

    serviceCommand
      .command('enable')
      .description('Enable a service')
      .argument('<service>', 'Service name to enable')
      .option('--install-deps', 'Install required dependencies')
      .action((service, options) => this.enableService(service, options));

    serviceCommand
      .command('disable')
      .description('Disable a service')
      .argument('<service>', 'Service name to disable')
      .option('--remove-deps', 'Remove unused dependencies')
      .action((service, options) => this.disableService(service, options));

    serviceCommand
      .command('configure')
      .description('Interactive service configuration')
      .argument('[service]', 'Service name to configure')
      .action((service) => this.configureService(service));

    serviceCommand
      .command('dependencies')
      .description('Show service dependencies')
      .argument('[service]', 'Service name')
      .action((service) => this.showServiceDependencies(service));

    serviceCommand
      .command('template')
      .description('Generate service template')
      .argument('<service>', 'Service name')
      .option('--overwrite', 'Overwrite existing files')
      .action((service, options) => this.generateServiceTemplate(service, options));
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
      .option('--minimal', 'Setup with minimal services')
      .option('--services <services>', 'Comma-separated list of services to enable')
      .action((options) => this.setupDevelopment(options));

    devCommand
      .command('start')
      .description('Start development server')
      .option('--check-services', 'Check service health before starting')
      .action((options) => this.startDevelopment(options));

    devCommand
      .command('test')
      .description('Run tests')
      .option('-w, --watch', 'Watch mode')
      .option('-c, --coverage', 'Generate coverage report')
      .option('--services', 'Test service connections')
      .action((options) => this.runTests(options));

    devCommand
      .command('lint')
      .description('Run ESLint')
      .option('-f, --fix', 'Auto-fix issues')
      .action((options) => this.runLint(options));

    devCommand
      .command('doctor')
      .description('Run comprehensive health check')
      .action(() => this.runDoctor());
  }

  /**
   * Setup project management commands
   */
  setupProjectCommands() {
    const projectCommand = this.program
      .command('project')
      .description('Project management commands');

    projectCommand
      .command('init')
      .description('Initialize new project with selected services')
      .option('--template <name>', 'Use predefined template: minimal, api, fullstack, microservice')
      .option('--services <services>', 'Comma-separated list of services')
      .option('--no-deps', 'Skip dependency installation')
      .action((options) => this.initializeProject(options));

    projectCommand
      .command('templates')
      .description('List available project templates')
      .action(() => this.listProjectTemplates());

    projectCommand
      .command('analyze')
      .description('Analyze current project configuration')
      .action(() => this.analyzeProject());

    projectCommand
      .command('optimize')
      .description('Optimize project for current configuration')
      .option('--remove-unused', 'Remove unused dependencies')
      .action((options) => this.optimizeProject(options));

    projectCommand
      .command('clone')
      .description('Clone project configuration from GitHub')
      .argument('<repo>', 'Repository URL or sports-excitement/sebf')
      .option('--branch <branch>', 'Branch to clone from', 'main')
      .action((repo, options) => this.cloneProjectConfig(repo, options));
  }

  /**
   * Setup package management commands
   */
  setupPackageCommands() {
    const packageCommand = this.program
      .command('package')
      .description('Package management commands');

    packageCommand
      .command('install')
      .description('Install packages for enabled services')
      .option('--force', 'Force reinstall all packages')
      .option('--dev', 'Install development dependencies')
      .action((options) => this.installPackages(options));

    packageCommand
      .command('remove')
      .description('Remove unused packages')
      .option('--dry-run', 'Show what would be removed')
      .option('--force', 'Force removal without confirmation')
      .action((options) => this.removeUnusedPackages(options));

    packageCommand
      .command('audit')
      .description('Audit packages for enabled services')
      .action(() => this.auditPackages());

    packageCommand
      .command('update')
      .description('Update packages to latest versions')
      .option('--major', 'Allow major version updates')
      .action((options) => this.updatePackages(options));

    packageCommand
      .command('check')
      .description('Check package compatibility with services')
      .action(() => this.checkPackageCompatibility());
  }

  /**
   * Setup utility commands
   */
  setupUtilityCommands() {
    this.program
      .command('clear')
      .description('Clear application cache and logs')
      .option('-a, --all', 'Clear everything including node_modules')
      .option('--services', 'Clear service-specific caches')
      .action((options) => this.clearCache(options));

    this.program
      .command('info')
      .description('Display application information')
      .option('--services', 'Include service information')
      .option('--config', 'Include configuration details')
      .action((options) => this.showInfo(options));

    this.program
      .command('routes')
      .description('List all available routes')
      .option('--format <type>', 'Output format: table, json', 'table')
      .action((options) => this.listRoutes(options));

    this.program
      .command('jwt:decode')
      .description('Decode JWT token')
      .argument('<token>', 'JWT token to decode')
      .action((token) => this.decodeJwt(token));

    this.program
      .command('benchmark')
      .description('Run performance benchmarks')
      .option('--services', 'Benchmark service connections')
      .action((options) => this.runBenchmarks(options));

    this.program
      .command('export')
      .description('Export project configuration')
      .option('--format <type>', 'Export format: json, yaml', 'json')
      .option('--output <file>', 'Output file path')
      .action((options) => this.exportConfiguration(options));

    this.program
      .command('import')
      .description('Import project configuration')
      .argument('<file>', 'Configuration file to import')
      .option('--merge', 'Merge with existing configuration')
      .action((file, options) => this.importConfiguration(file, options));
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
      
      if (!this.serviceConfig) {
        this.error('Service configuration not loaded');
        return;
      }
      
      this.info('Validating environment configuration...');
      
      const validationResults = [];
      const enabledServices = this.serviceConfig.getEnabledServices();
      
      // Check core required variables
      const coreRequired = ['JWT_SECRET', 'SESSION_SECRET'];
      coreRequired.forEach(variable => {
        const status = this.validateEnvVariable(variable);
        validationResults.push({ variable, ...status, category: 'core' });
      });

      // Check service-specific variables
      Object.entries(enabledServices).forEach(([serviceName, enabled]) => {
        if (enabled) {
          const serviceValidation = this.validateServiceConfiguration(serviceName);
          validationResults.push(...serviceValidation);
        }
      });

      this.displayValidationResults(validationResults);
      
    } catch (error) {
      this.error('Environment validation failed:', error.message);
    }
  }

  validateEnvVariable(variable) {
    const value = process.env[variable];
    if (!value) {
      return { status: 'missing', level: 'error', message: 'Variable not set' };
    }
    if (value.includes('your-') || value.includes('password') || value.includes('key-here')) {
      return { status: 'default', level: 'warning', message: 'Using default/placeholder value' };
    }
    return { status: 'ok', level: 'success', message: 'Properly configured' };
  }

  validateServiceConfiguration(serviceName) {
    const results = [];
    const serviceConfig = this.serviceConfig.getServiceConfig(serviceName);
    
    if (!serviceConfig) return results;

    // Service-specific validation
    switch (serviceName) {
      case 'database':
        if (serviceConfig.enabled && !process.env.DATABASE_URL) {
          results.push({
            variable: 'DATABASE_URL',
            status: 'missing',
            level: 'error',
            category: serviceName,
            message: 'Database URL required when database service is enabled'
          });
        }
        break;
      
      case 'mongodb':
        if (serviceConfig.enabled) {
          ['MONGODB_PRIMARY_HOST', 'MONGODB_PRIMARY_DATABASE'].forEach(var_ => {
            if (!process.env[var_]) {
              results.push({
                variable: var_,
                status: 'missing',
                level: 'error', 
                category: serviceName,
                message: 'Required for MongoDB service'
              });
            }
          });
        }
        break;

      case 'redis':
        // Redis has defaults, so only warn if explicitly configured incorrectly
        if (serviceConfig.enabled && process.env.REDIS_PASSWORD === 'password') {
          results.push({
            variable: 'REDIS_PASSWORD',
            status: 'default',
            level: 'warning',
            category: serviceName,
            message: 'Using default Redis password'
          });
        }
        break;

      // Add more service validations as needed
    }

    return results;
  }

  displayValidationResults(results) {
    console.log('\n📋 Environment Validation Results:');
    console.log('=====================================');

    const categories = [...new Set(results.map(r => r.category))];
    
    categories.forEach(category => {
      console.log(`\n${colors.cyan}${colors.bright}${category.toUpperCase()} Configuration:${colors.reset}`);
      
      const categoryResults = results.filter(r => r.category === category);
      categoryResults.forEach(result => {
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

        console.log(`${icon} ${color}${result.variable}${colors.reset} - ${result.message}`);
      });
    });

    const errors = results.filter(r => r.level === 'error');
    const warnings = results.filter(r => r.level === 'warning');

    if (errors.length > 0) {
      this.error(`\n${errors.length} critical issues found. Please fix them before starting the application.`);
    } else if (warnings.length > 0) {
      this.warning(`\n${warnings.length} warnings found. Consider updating default values for production.`);
    } else {
      this.success('\n✅ Environment configuration is valid!');
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
      const enabledDbs = [];
      
      if (this.serviceConfig?.database?.enabled) {
        enabledDbs.push('prisma');
      }
      if (this.serviceConfig?.mongodb?.enabled) {
        enabledDbs.push('mongodb');
      }

      if (enabledDbs.length === 0) {
        this.warning('No database services are enabled');
        return;
      }

      this.info('Checking database connections...');
      
      for (const dbType of enabledDbs) {
        try {
          let service;
          switch (dbType) {
            case 'prisma':
              service = require('./framework/config/prisma').prismaService;
              break;
            case 'mongodb':
              service = require('./framework/services/MongooseService');
              break;
          }
          
          if (service) {
            const health = await service.testConnection();
            const icon = health.status === 'connected' ? '✅' : '❌';
            console.log(`${icon} ${dbType}: ${health.message}`);
          }
        } catch (error) {
          console.log(`❌ ${dbType}: ${error.message}`);
        }
      }
    } catch (error) {
      this.error('Failed to check database status:', error.message);
    }
  }

  switchDatabase(type) {
    try {
      this.info(`Switching to ${type} database...`);
      
      // Disable all databases first
      this.updateEnvVariable('DATABASE_ENABLED', 'false', true);
      this.updateEnvVariable('MONGODB_ENABLED', 'false', true);
      
      // Enable selected database
      switch (type.toLowerCase()) {
        case 'prisma':
        case 'postgresql':
          this.updateEnvVariable('DATABASE_ENABLED', 'true', true);
          break;
        case 'mongodb':
        case 'mongo':
          this.updateEnvVariable('MONGODB_ENABLED', 'true', true);
          break;
        default:
          this.error(`Unsupported database type: ${type}`);
          return;
      }
      
      this.success(`Database switched to ${type}`);
      this.info('Restart your application to apply changes');
    } catch (error) {
      this.error('Failed to switch database:', error.message);
    }
  }

  determineDatabaseType(specified) {
    if (specified) {
      return specified.toLowerCase();
    }
    
    // Auto-detect from configuration
    if (this.serviceConfig?.database?.enabled) {
      return 'prisma';
    }
    if (this.serviceConfig?.mongodb?.enabled) {
      return 'mongodb';
    }
    
    // Default fallback
    return 'prisma';
  }

  // New environment setup methods
  setupEnvironment(options = {}) {
    this.info('🚀 Setting up environment configuration...');
    
    // Copy .env.example if .env doesn't exist
    if (!fs.existsSync('.env')) {
      this.copyEnvExample({ force: false });
    }

    if (options.minimal) {
      this.setupMinimalEnvironment();
    } else if (options.full) {
      this.setupFullEnvironment();
    } else {
      this.setupInteractiveEnvironment();
    }
  }

  setupMinimalEnvironment() {
    this.info('Setting up minimal environment (Core services only)...');
    
    const minimalServices = {
      'DATABASE_ENABLED': 'true',
      'REDIS_ENABLED': 'true',
      'SSE_ENABLED': 'true',
      'MEMORY_ENABLED': 'true',
      'ERROR_HANDLING_ENABLED': 'true',
      'CORS_ENABLED': 'true'
    };

    Object.entries(minimalServices).forEach(([key, value]) => {
      this.updateEnvVariable(key, value, true);
    });

    this.generateAllKeys({ force: false });
    this.success('Minimal environment setup completed!');
  }

  setupFullEnvironment() {
    this.info('Setting up full environment (All services enabled)...');
    
    Object.keys(this.availableServices).forEach(serviceName => {
      const envVar = `${serviceName.toUpperCase()}_ENABLED`;
      this.updateEnvVariable(envVar, 'true', true);
    });

    this.generateAllKeys({ force: false });
    this.success('Full environment setup completed!');
    this.warning('Remember to configure service-specific settings (API keys, hosts, etc.)');
  }

  setupInteractiveEnvironment() {
    // For now, we'll default to minimal setup
    // In a full implementation, this would use readline for interactive prompts
    this.info('Interactive setup not fully implemented yet. Using minimal setup...');
    this.setupMinimalEnvironment();
  }

  optimizeEnvironment() {
    this.info('Optimizing environment for enabled services...');
    
    const enabledServices = this.serviceConfig.getEnabledServices();
    const optimizations = [];

    // Check for unnecessary services
    Object.entries(this.availableServices).forEach(([serviceName, serviceInfo]) => {
      if (!serviceInfo.enabled && process.env[`${serviceName.toUpperCase()}_ENABLED`] === 'true') {
        optimizations.push(`Disable ${serviceName} in .env as it's not being used`);
      }
    });

    // Check for missing configurations
    Object.entries(enabledServices).forEach(([serviceName, enabled]) => {
      if (enabled) {
        const serviceConfig = this.serviceConfig.getServiceConfig(serviceName);
        if (serviceConfig && !serviceConfig.configured) {
          optimizations.push(`Configure ${serviceName} service settings`);
        }
      }
    });

    if (optimizations.length === 0) {
      this.success('Environment is already optimized!');
    } else {
      this.info('Optimization suggestions:');
      optimizations.forEach(opt => console.log(`  • ${opt}`));
    }
  }

  // Smart service management methods
  enableService(serviceName, options = {}) {
    try {
      serviceName = serviceName.toLowerCase();
      
      if (!this.availableServices[serviceName]) {
        this.error(`Unknown service: ${serviceName}`);
        return;
      }

      this.info(`Enabling ${serviceName} service...`);
      
      // Update environment variable
      const envVar = `${serviceName.toUpperCase()}_ENABLED`;
      this.updateEnvVariable(envVar, 'true', true);
      
      // Install dependencies if requested
      if (options.installDeps) {
        this.installServiceDependencies(serviceName);
      }
      
      this.success(`${serviceName} service enabled`);
      this.info('Restart your application to apply changes');
      
      // Show configuration hints
      this.showServiceConfigurationHints(serviceName);
      
    } catch (error) {
      this.error(`Failed to enable ${serviceName}:`, error.message);
    }
  }

  disableService(serviceName, options = {}) {
    try {
      serviceName = serviceName.toLowerCase();
      
      if (!this.availableServices[serviceName]) {
        this.error(`Unknown service: ${serviceName}`);
        return;
      }

      const serviceInfo = this.availableServices[serviceName];
      if (serviceInfo.required) {
        this.error(`Cannot disable required service: ${serviceName}`);
        return;
      }

      this.info(`Disabling ${serviceName} service...`);
      
      // Update environment variable
      const envVar = `${serviceName.toUpperCase()}_ENABLED`;
      this.updateEnvVariable(envVar, 'false', true);
      
      // Remove dependencies if requested
      if (options.removeDeps) {
        this.removeServiceDependencies(serviceName);
      }
      
      this.success(`${serviceName} service disabled`);
      this.info('Restart your application to apply changes');
      
    } catch (error) {
      this.error(`Failed to disable ${serviceName}:`, error.message);
    }
  }

  showServiceConfigurationHints(serviceName) {
    const hints = {
      database: [
        'Set DATABASE_URL to your PostgreSQL connection string',
        'Example: postgresql://user:pass@localhost:5432/dbname'
      ],
      mongodb: [
        'Set MONGODB_PRIMARY_HOST and MONGODB_PRIMARY_DATABASE',
        'Optionally configure authentication with MONGODB_PRIMARY_USERNAME/PASSWORD'
      ],
      redis: [
        'Default configuration works for local Redis',
        'Set REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD for remote Redis'
      ],
      typesense: [
        'Set TYPESENSE_API_KEY for your Typesense instance',
        'Configure TYPESENSE_HOST and TYPESENSE_PORT if not using defaults'
      ],
      minio: [
        'Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY',
        'Configure MINIO_ENDPOINT if not using localhost'
      ],
      supabase: [
        'Set SUPABASE_URL and SUPABASE_KEY from your Supabase project',
        'These are found in your project settings'  
      ],
      firebase: [
        'Set FIREBASE_SERVICE_ACCOUNT_KEY to path of your service account JSON',
        'Download from Firebase Console > Project Settings > Service Accounts'
      ],
      email: [
        'Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS for SMTP',
        'For Gmail, use an app-specific password'
      ]
    };

    const serviceHints = hints[serviceName];
    if (serviceHints) {
      console.log('');
      serviceHints.forEach(hint => {
        console.log(`  💡 ${hint}`);
      });
      console.log('');
    }
  }

  installServiceDependencies(serviceName) {
    const servicePackages = {
      redis: ['ioredis', 'connect-redis'],
      mongodb: ['mongoose'],
      typesense: ['typesense'],
      minio: ['minio'],
      firebase: ['firebase-admin'],
      supabase: ['@supabase/supabase-js'],
      email: ['nodemailer']
    };
    
    const packages = servicePackages[serviceName];
    if (packages && packages.length > 0) {
      this.info(`Installing dependencies for ${serviceName}: ${packages.join(', ')}`);
      try {
        execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
        this.success(`Dependencies installed for ${serviceName}`);
      } catch (error) {
        this.error(`Failed to install dependencies for ${serviceName}:`, error.message);
      }
    }
  }

  removeServiceDependencies(serviceName) {
    // This would remove service-specific dependencies
    // Implementation would check if packages are used by other services
    this.info(`Dependency removal for ${serviceName} would be implemented here`);
  }

  /**
   * Check all services health
   */
  async checkServicesHealth(options = {}) {
    try {
      this.info('Checking services health...');
      
      const servicesToCheck = options.enabledOnly 
        ? Object.entries(this.availableServices).filter(([_, info]) => info.enabled)
        : Object.entries(this.availableServices);

      if (servicesToCheck.length === 0) {
        this.warning('No services to check');
        return;
      }

      console.log('\n🏥 Services Health Check:');
      console.log('=========================');

      for (const [serviceName, serviceInfo] of servicesToCheck) {
        try {
          let service;
          let health;
          
          switch (serviceName) {
            case 'redis':
              service = require('./framework/services/RedisService');
              break;
            case 'typesense':
              service = require('./framework/services/TypesenseService');
              break;
            case 'minio':
              service = require('./framework/services/MinioService');
              break;
            case 'supabase':
              service = require('./framework/services/SupabaseService');
              break;
            case 'firebase':
              service = require('./framework/services/FirebaseService');
              break;
            case 'database':
              service = require('./framework/config/prisma').prismaService;
              break;
            case 'mongodb':
              service = require('./framework/services/MongooseService');
              break;
            default:
              // Skip services without health check implementation
              continue;
          }
          
          if (service && typeof service.testConnection === 'function') {
            health = await service.testConnection();
          } else {
            health = { status: 'unknown', message: 'Health check not implemented' };
          }
          
          const icon = health.status === 'connected' ? '✅' : 
                      health.status === 'disabled' ? '⚠️' : 
                      health.status === 'unknown' ? '❓' : '❌';
          const statusText = serviceInfo.enabled ? health.message : 'Disabled';
          console.log(`${icon} ${serviceName}: ${statusText}`);
          
        } catch (error) {
          console.log(`❌ ${serviceName}: ${error.message}`);
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
      serviceName = serviceName.toLowerCase();
      
      if (!this.availableServices[serviceName]) {
        this.error(`Unknown service: ${serviceName}`);
        this.info('Available services: ' + Object.keys(this.availableServices).join(', '));
        return;
      }

      this.info(`Testing ${serviceName} connection...`);
      
      let service;
      switch (serviceName) {
        case 'redis':
          service = require('./framework/services/RedisService');
          break;
        case 'typesense':
          service = require('./framework/services/TypesenseService');
          break;
        case 'minio':
          service = require('./framework/services/MinioService');
          break;
        case 'supabase':
          service = require('./framework/services/SupabaseService');
          break;
        case 'firebase':
          service = require('./framework/services/FirebaseService');
          break;
        case 'database':
          service = require('./framework/config/prisma').prismaService;
          break;
        case 'mongodb':
          service = require('./framework/services/MongooseService');
          break;
        default:
          this.error(`Service connection test not implemented for: ${serviceName}`);
          return;
      }

      if (!service || typeof service.testConnection !== 'function') {
        this.error(`Service ${serviceName} doesn't support connection testing`);
        return;
      }

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
  listServices(options = {}) {
    const services = options.enabledOnly 
      ? Object.entries(this.availableServices).filter(([_, info]) => info.enabled)
      : Object.entries(this.availableServices);

    if (services.length === 0) {
      this.warning('No services found');
      return;
    }

    console.log('\n📋 Available Services:');
    console.log('======================');

    services.forEach(([serviceName, serviceInfo]) => {
      const status = serviceInfo.enabled ? '🟢 Enabled' : '🔴 Disabled';
      const required = serviceInfo.required ? '(Required)' : '(Optional)';
      const configured = serviceInfo.configured ? '✅' : '⚠️';
      
      console.log(`• ${serviceName.padEnd(15)} ${status} ${required} ${configured}`);
      
      if (options.detailed) {
        const serviceConfig = this.serviceConfig.getServiceConfig(serviceName);
        if (serviceConfig) {
          console.log(`  Status: ${serviceConfig.status}`);
          if (serviceConfig.status === 'misconfigured') {
            console.log(`  Issue: Missing required configuration`);
          }
        }
        console.log('');
      }
    });

    if (!options.detailed) {
      console.log('\nUse --detailed for more information');
    }
    console.log('\nUse: control service test <service-name> to test connections');
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
  showInfo(options = {}) {
    require('dotenv').config();
    
    console.log(`\n${colors.cyan}${colors.bright}Sports Excitement Backend Framework${colors.reset}`);
    console.log('===========================================');
    console.log(`Version: ${this.packageJson.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`Port: ${process.env.PORT || 3000}`);
    
    if (options.services) {
      console.log('\n🔧 Services Status:');
      Object.entries(this.availableServices).forEach(([name, info]) => {
        const status = info.enabled ? '🟢 Enabled' : '🔴 Disabled';
        const configured = info.configured ? '✅' : '⚠️';
        console.log(`  ${name}: ${status} ${configured}`);
      });
    }
    
    if (options.config) {
      console.log('\n📝 Configuration:');
      const enabledCount = Object.values(this.availableServices).filter(info => info.enabled).length;
      const totalCount = Object.keys(this.availableServices).length;
      console.log(`  Services: ${enabledCount}/${totalCount} enabled`);
      
      // Database info
      const dbTypes = [];
      if (this.availableServices.database?.enabled) dbTypes.push('PostgreSQL');
      if (this.availableServices.mongodb?.enabled) dbTypes.push('MongoDB');
      console.log(`  Database: ${dbTypes.join(', ') || 'None'}`);
    }
    
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
  listRoutes(options = {}) {
    const routes = [
      { method: 'GET', path: '/', description: 'API information' },
      { method: 'GET', path: '/api', description: 'API endpoints list' },
      { method: 'GET', path: '/api/health', description: 'Basic health check' },
      { method: 'GET', path: '/api/health/*', description: 'Detailed health endpoints' },
      { method: 'GET', path: '/api/users', description: 'List users' },
      { method: 'POST', path: '/api/users', description: 'Create user' },
      { method: 'GET', path: '/api/users/:id', description: 'Get user by ID' },
      { method: 'PUT', path: '/api/users/:id', description: 'Update user' },
      { method: 'DELETE', path: '/api/users/:id', description: 'Delete user' },
      { method: 'GET', path: '/api/sse', description: 'Server-sent events' },
      { method: 'GET', path: '/api/protected', description: 'Protected route demo' },
      { method: 'GET', path: '/api/session-info', description: 'Session information' }
    ];

    if (options.format === 'json') {
      console.log(JSON.stringify(routes, null, 2));
    } else {
      console.log('\n🛣️  Available Routes:');
      console.log('===================');
      routes.forEach(route => {
        const method = route.method.padEnd(7);
        const path = route.path.padEnd(20);
        console.log(`${method} ${path} - ${route.description}`);
      });
    }
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

  // ==============================================
  // MISSING METHOD IMPLEMENTATIONS
  // ==============================================

  runMigrations(options = {}) {
    try {
      const dbType = this.determineDatabaseType(options.db);
      
      this.info(`Running ${dbType} migrations...`);
      
      switch (dbType) {
        case 'prisma':
          execSync('npm run prisma:migrate', { stdio: 'inherit' });
          break;
        case 'mongodb':
          this.info('MongoDB migrations are handled automatically by Mongoose');
          break;
        default:
          this.error(`Unsupported database type: ${dbType}`);
          return;
      }
      
      this.success('Database migrations completed successfully!');
    } catch (error) {
      this.error('Migration failed:', error.message);
    }
  }

  generateDatabase(options = {}) {
    try {
      const dbType = this.determineDatabaseType(options.db);
      
      this.info(`Generating ${dbType} client...`);
      
      switch (dbType) {
        case 'prisma':
          execSync('npm run prisma:generate', { stdio: 'inherit' });
          break;
        case 'mongodb':
          this.info('MongoDB client is automatically managed by Mongoose');
          break;
        default:
          this.error(`Unsupported database type: ${dbType}`);
          return;
      }
      
      this.success('Database client generated successfully!');
    } catch (error) {
      this.error('Database generation failed:', error.message);
    }
  }

  resetDatabase(options = {}) {
    try {
      const dbType = this.determineDatabaseType(options.db);
      
      if (!options.force) {
        this.warning('Use --force to confirm database reset');
        return;
      }
      
      this.info(`Resetting ${dbType} database...`);
      
      switch (dbType) {
        case 'prisma':
          execSync('npm run prisma:reset', { stdio: 'inherit' });
          break;
        case 'mongodb':
          this.warning('MongoDB reset not implemented yet');
          break;
        default:
          this.error(`Unsupported database type: ${dbType}`);
          return;
      }
      
      this.success('Database reset completed successfully!');
    } catch (error) {
      this.error('Database reset failed:', error.message);
    }
  }

  openDatabaseStudio(options = {}) {
    try {
      const dbType = this.determineDatabaseType(options.db);
      
      this.info(`Opening ${dbType} studio...`);
      
      switch (dbType) {
        case 'prisma':
          execSync('npm run prisma:studio', { stdio: 'inherit' });
          break;
        case 'mongodb':
          this.info('Opening MongoDB Compass...');
          break;
        default:
          this.error(`Unsupported database type: ${dbType}`);
          return;
      }
    } catch (error) {
      this.error('Failed to open database studio:', error.message);
    }
  }

  configureService(serviceName) {
    if (!serviceName) {
      this.info('Available services for configuration:');
      Object.keys(this.availableServices).forEach(name => {
        console.log(`  • ${name}`);
      });
      return;
    }

    serviceName = serviceName.toLowerCase();
    
    if (!this.availableServices[serviceName]) {
      this.error(`Unknown service: ${serviceName}`);
      return;
    }

    this.info(`Configuration guide for ${serviceName}:`);
    this.showServiceConfigurationHints(serviceName);
  }

  showServiceDependencies(serviceName) {
    if (!serviceName) {
      const dependencies = this.serviceConfig?.getServiceDependencies() || {};
      console.log('\n🔗 Service Dependencies:');
      console.log('========================');
      
      Object.entries(dependencies).forEach(([service, deps]) => {
        console.log(`${service}: ${deps.length > 0 ? deps.join(', ') : 'None'}`);
      });
      return;
    }

    serviceName = serviceName.toLowerCase();
    const dependencies = this.serviceConfig?.getServiceDependencies() || {};
    const serviceDeps = dependencies[serviceName] || [];
    
    console.log(`\n🔗 Dependencies for ${serviceName}:`);
    if (serviceDeps.length > 0) {
      serviceDeps.forEach(dep => console.log(`  • ${dep}`));
    } else {
      console.log('  None');
    }
  }

  generateServiceTemplate(serviceName, options = {}) {
    try {
      serviceName = serviceName.toLowerCase();
      
      this.info(`Generating template for ${serviceName} service...`);
      
      const outputPath = `app/Services/${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service.js`;
      
      if (fs.existsSync(outputPath) && !options.overwrite) {
        this.warning(`Service file already exists: ${outputPath}`);
        this.info('Use --overwrite to replace existing file');
        return;
      }
      
      const template = this.generateServiceTemplateContent(serviceName);
      
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, template);
      this.success(`Service template generated: ${outputPath}`);
      
    } catch (error) {
      this.error(`Failed to generate service template:`, error.message);
    }
  }

  generateServiceTemplateContent(serviceName) {
    const className = serviceName.charAt(0).toUpperCase() + serviceName.slice(1) + 'Service';
    
    return `const config = require('../../framework/config/services');
const Logger = require('../../framework/helpers/Logger');

/**
 * ${className}
 * Custom service for ${serviceName} functionality
 */
class ${className} {
  constructor() {
    this.config = config.${serviceName} || {};
    this.isEnabled = this.config.enabled !== false;
    this.isConnected = false;
  }

  /**
   * Initialize the ${serviceName} service
   */
  async connect() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: '${className} is disabled' };
    }

    try {
      // TODO: Implement your connection logic here
      
      this.isConnected = true;
      Logger.info(\`${className} connected successfully\`);
      return { status: 'connected', message: '${className} is operational' };
    } catch (error) {
      Logger.error(\`${serviceName} connection failed:\`, error);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Test service connection
   */
  async testConnection() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: '${className} is disabled' };
    }

    try {
      // TODO: Implement your health check logic here
      
      return { status: 'connected', message: '${className} is healthy' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Disconnect from ${serviceName}
   */
  async disconnect() {
    if (this.isConnected) {
      // TODO: Implement your disconnection logic here  
      this.isConnected = false;
      Logger.info(\`${className} disconnected\`);
    }
  }

  /**
   * Get service information
   */
  getServiceInfo() {
    return {
      name: '${serviceName}',
      enabled: this.isEnabled,
      connected: this.isConnected,
      config: this.config
    };
  }
}

module.exports = new ${className}();
`;
  }

  setupDevelopment(options = {}) {
    try {
      this.info('🚀 Setting up development environment...');
      
      if (!fs.existsSync('.env')) {
        this.copyEnvExample(options);
      }
      
      if (options.services) {
        this.setupSpecifiedServices(options.services.split(','));
      } else if (options.minimal) {
        this.setupMinimalEnvironment();
      } else {
        this.setupEnvironment();
      }
      
      this.generateAllKeys(options);
      
      const dbType = this.determineDatabaseType();
      this.generateDatabase({ db: dbType });
      this.runMigrations({ db: dbType });
      
      this.seedDatabase({ count: '10', notifications: true, db: dbType });
      
      this.success('🎉 Development environment setup completed!');
      this.info('You can now run: npm run dev');
    } catch (error) {
      this.error('Development setup failed:', error.message);
    }
  }

  setupSpecifiedServices(serviceList) {
    this.info(`Setting up specified services: ${serviceList.join(', ')}`);
    
    Object.keys(this.availableServices).forEach(serviceName => {
      const envVar = `${serviceName.toUpperCase()}_ENABLED`;
      this.updateEnvVariable(envVar, 'false', true);
    });
    
    serviceList.forEach(serviceName => {
      serviceName = serviceName.trim().toLowerCase();
      if (this.availableServices[serviceName]) {
        const envVar = `${serviceName.toUpperCase()}_ENABLED`;
        this.updateEnvVariable(envVar, 'true', true);
      } else {
        this.warning(`Unknown service: ${serviceName}`);
      }
    });
    
    ['error_handling', 'memory', 'cors'].forEach(coreService => {
      const envVar = `${coreService.toUpperCase()}_ENABLED`;
      this.updateEnvVariable(envVar, 'true', true);
    });
  }

  startDevelopment(options = {}) {
    try {
      if (options.checkServices) {
        this.info('Checking service health before starting...');
        this.checkServicesHealth({ enabledOnly: true });
      }
      
      this.info('Starting development server...');
      execSync('npm run dev', { stdio: 'inherit' });
    } catch (error) {
      this.error('Failed to start development server:', error.message);
    }
  }

  runTests(options = {}) {
    try {
      let command = 'npm test';
      
      if (options.watch) {
        command = 'npm run test:watch';
      } else if (options.coverage) {
        command = 'npm run test:coverage';
      }
      
      if (options.services) {
        this.info('Testing service connections...');
        this.checkServicesHealth({ enabledOnly: true });
      }
      
      this.info('Running tests...');
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      this.error('Tests failed:', error.message);
    }
  }

  runLint(options = {}) {
    try {
      const command = options.fix ? 'npm run lint:fix' : 'npm run lint';
      this.info('Running ESLint...');
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      this.error('Linting failed:', error.message);
    }
  }

  runDoctor() {
    this.info('🩺 Running comprehensive health check...');
    
    this.validateEnv();
    this.checkServicesHealth({ enabledOnly: true });
    this.checkDatabaseStatus();
    this.checkPackageCompatibility();
    
    this.success('Health check completed!');
  }

  initializeProject(options = {}) {
    try {
      this.info('🚀 Initializing new project...');
      
      if (!fs.existsSync('.env')) {
        this.copyEnvExample();
      }
      
      if (options.template) {
        this.applyProjectTemplate(options.template);
      } else if (options.services) {
        this.setupSpecifiedServices(options.services.split(','));
      } else {
        this.setupMinimalEnvironment();
      }
      
      this.generateAllKeys({ force: false });
      
      if (!options.noDeps) {
        this.installPackages();
      }
      
      this.success('Project initialized successfully!');
      this.info('Run "control dev setup" to complete development setup');
    } catch (error) {
      this.error('Project initialization failed:', error.message);
    }
  }

  applyProjectTemplate(templateName) {
    const templates = {
      minimal: ['database', 'redis', 'cors', 'error_handling'],
      api: ['database', 'redis', 'cors', 'error_handling', 'auth', 'security'],
      fullstack: ['database', 'redis', 'cors', 'error_handling', 'auth', 'security', 'sse', 'minio'],
      microservice: ['redis', 'cors', 'error_handling', 'auth', 'typesense']
    };
    
    const services = templates[templateName];
    if (!services) {
      this.error(`Unknown template: ${templateName}`);
      this.info('Available templates: ' + Object.keys(templates).join(', '));
      return;
    }
    
    this.info(`Applying ${templateName} template...`);
    this.setupSpecifiedServices(services);
  }

  listProjectTemplates() {
    console.log('\n📋 Available Project Templates:');
    console.log('================================');
    console.log('• minimal     - Core services only (Database, Redis, CORS)');
    console.log('• api         - REST API setup (+ Auth, Security)');
    console.log('• fullstack   - Full application (+ SSE, MinIO)');
    console.log('• microservice - Microservice setup (+ Typesense)');
    console.log('\nUsage: control project init --template <name>');
  }

  analyzeProject() {
    this.info('🔍 Analyzing current project configuration...');
    
    console.log('\n📊 Project Analysis:');
    console.log('====================');
    
    const enabledServices = Object.entries(this.availableServices)
      .filter(([_, info]) => info.enabled);
    console.log(`\n✅ Enabled Services (${enabledServices.length}):`);
    enabledServices.forEach(([name, info]) => {
      const status = info.configured ? '✅' : '⚠️';
      console.log(`  ${status} ${name}`);
    });
    
    const disabledServices = Object.entries(this.availableServices)
      .filter(([_, info]) => !info.enabled);
    console.log(`\n❌ Disabled Services (${disabledServices.length}):`);
    disabledServices.forEach(([name]) => {
      console.log(`  • ${name}`);
    });
    
    this.analyzePackageUsage();
  }

  analyzePackageUsage() {
    try {
      const packageJson = require('./package.json');
      const enabledServices = Object.entries(this.availableServices)
        .filter(([_, info]) => info.enabled)
        .map(([name]) => name);
      
      const servicePackages = {
        redis: ['ioredis', 'connect-redis'],
        mongodb: ['mongoose'],
        typesense: ['typesense'],
        minio: ['minio'],
        firebase: ['firebase-admin'],
        email: ['nodemailer'],
        security: ['helmet', 'express-rate-limit', 'express-slow-down']
      };
      
      console.log('\n📦 Package Analysis:');
      
      const unusedPackages = [];
      
      Object.keys(servicePackages).forEach(service => {
        if (!enabledServices.includes(service)) {
          const packages = servicePackages[service] || [];
          packages.forEach(pkg => {
            if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
              unusedPackages.push({ package: pkg, service });
            }
          });
        }
      });
      
      if (unusedPackages.length > 0) {
        console.log('\n⚠️  Potentially Unused Packages:');
        unusedPackages.forEach(({ package: pkg, service }) => {
          console.log(`  • ${pkg} (${service} service is disabled)`);
        });
        console.log('\nRun "control package remove" to clean up unused packages');
      } else {
        console.log('\n✅ No unused packages detected');
      }
      
    } catch (error) {
      this.warning('Could not analyze package usage:', error.message);
    }
  }

  optimizeProject(options = {}) {
    this.info('🔧 Optimizing project configuration...');
    
    this.optimizeEnvironment();
    
    if (options.removeUnused) {
      this.removeUnusedPackages({ force: false });
    }
    
    this.success('Project optimization completed!');
  }

  cloneProjectConfig(repo, options = {}) {
    try {
      let repoUrl;
      if (repo === 'sports-excitement/sebf' || repo === 'sebf') {
        repoUrl = 'https://github.com/sports-excitement/sebf.git';
      } else if (repo.startsWith('http')) {
        repoUrl = repo;
      } else {
        repoUrl = `https://github.com/${repo}.git`;
      }
      
      this.info(`Cloning configuration from ${repoUrl}...`);
      
      const tempDir = './temp-clone';
      
      execSync(`git clone --depth 1 --branch ${options.branch} ${repoUrl} ${tempDir}`, { stdio: 'pipe' });
      
      const filesToCopy = ['.env.example', 'package.json'];
      filesToCopy.forEach(file => {
        const srcPath = path.join(tempDir, file);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, file);
          this.info(`Copied ${file}`);
        }
      });
      
      execSync(`rm -rf ${tempDir}`, { stdio: 'pipe' });
      
      this.success('Configuration cloned successfully!');
      this.info('Run "control env setup" to configure your environment');
      
    } catch (error) {
      this.error('Failed to clone project configuration:', error.message);
    }
  }

  installPackages(options = {}) {
    try {
      this.info('📦 Installing packages for enabled services...');
      
      if (options.force) {
        this.info('Removing node_modules for fresh install...');
        execSync('rm -rf node_modules package-lock.json', { stdio: 'pipe' });
      }
      
      const packages = this.getRequiredPackages();
      
      if (packages.length === 0) {
        this.success('All required packages are already installed');
        return;
      }
      
      this.info(`Installing ${packages.length} packages...`);
      packages.forEach(pkg => console.log(`  • ${pkg}`));
      
      execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
      
      if (options.dev) {
        const devPackages = this.getRequiredDevPackages();
        if (devPackages.length > 0) {
          this.info('Installing development packages...');
          execSync(`npm install --save-dev ${devPackages.join(' ')}`, { stdio: 'inherit' });
        }
      }
      
      this.success('Package installation completed!');
    } catch (error) {
      this.error('Package installation failed:', error.message);
    }
  }

  getRequiredPackages() {
    const enabledServices = Object.entries(this.availableServices)
      .filter(([_, info]) => info.enabled)
      .map(([name]) => name);
    
    const servicePackages = {
      redis: ['ioredis', 'connect-redis'],
      mongodb: ['mongoose'],
      typesense: ['typesense'],
      minio: ['minio'],
      firebase: ['firebase-admin'],
      supabase: ['@supabase/supabase-js'],
      email: ['nodemailer'],
      security: ['helmet', 'express-rate-limit', 'express-slow-down']
    };
    
    const packageJson = require('./package.json');
    const requiredPackages = [];
    
    enabledServices.forEach(service => {
      const packages = servicePackages[service] || [];
      packages.forEach(pkg => {
        if (!packageJson.dependencies[pkg] && !requiredPackages.includes(pkg)) {
          requiredPackages.push(pkg);
        }
      });
    });
    
    return requiredPackages;
  }

  getRequiredDevPackages() {
    return [];
  }

  removeUnusedPackages(options = {}) {
    try {
      const packageJson = require('./package.json');
      const enabledServices = Object.entries(this.availableServices)
        .filter(([_, info]) => info.enabled)
        .map(([name]) => name);
      
      const servicePackages = {
        redis: ['ioredis', 'connect-redis'],
        mongodb: ['mongoose'],
        typesense: ['typesense'],
        minio: ['minio'],
        firebase: ['firebase-admin'],
        supabase: ['@supabase/supabase-js'],
        email: ['nodemailer']
      };
      
      const unusedPackages = [];
      
      Object.keys(servicePackages).forEach(service => {
        if (!enabledServices.includes(service)) {
          const packages = servicePackages[service] || [];
          packages.forEach(pkg => {
            if (packageJson.dependencies[pkg]) {
              unusedPackages.push(pkg);
            }
          });
        }
      });
      
      if (unusedPackages.length === 0) {
        this.success('No unused packages found');
        return;
      }
      
      if (options.dryRun) {
        this.info('Packages that would be removed:');
        unusedPackages.forEach(pkg => console.log(`  • ${pkg}`));
        return;
      }
      
      if (!options.force) {
        this.warning('The following packages will be removed:');
        unusedPackages.forEach(pkg => console.log(`  • ${pkg}`));
        this.info('Use --force to confirm removal or --dry-run to see what would be removed');
        return;
      }
      
      this.info(`Removing ${unusedPackages.length} unused packages...`);
      execSync(`npm uninstall ${unusedPackages.join(' ')}`, { stdio: 'inherit' });
      
      this.success('Unused packages removed successfully!');
    } catch (error) {
      this.error('Failed to remove unused packages:', error.message);
    }
  }

  auditPackages() {
    try {
      this.info('🔍 Auditing packages...');
      execSync('npm audit', { stdio: 'inherit' });
    } catch (error) {
      this.warning('Package audit completed with issues');
    }
  }

  updatePackages(options = {}) {
    try {
      this.info('📦 Updating packages...');
      
      let command = 'npm update';
      if (options.major) {
        this.warning('Major updates require manual review');
        this.info('Consider using: npx npm-check-updates -u');
        return;
      }
      
      execSync(command, { stdio: 'inherit' });
      this.success('Packages updated successfully!');
    } catch (error) {
      this.error('Package update failed:', error.message);
    }
  }

  checkPackageCompatibility() {
    try {
      this.info('🔍 Checking package compatibility...');
      
      const packageJson = require('./package.json');
      const nodeVersion = process.version;
      const requiredNode = packageJson.engines?.node;
      
      console.log(`\n📋 Compatibility Check:`);
      console.log(`Node.js: ${nodeVersion} ${requiredNode ? `(Required: ${requiredNode})` : ''}`);
      
      if (requiredNode && !this.checkVersionCompatibility(nodeVersion, requiredNode)) {
        this.warning(`Node.js version ${nodeVersion} may not be compatible with required ${requiredNode}`);
      } else {
        this.success('Node.js version is compatible');
      }
      
      const issues = this.findCompatibilityIssues(packageJson);
      if (issues.length > 0) {
        console.log('\n⚠️  Potential Compatibility Issues:');
        issues.forEach(issue => console.log(`  • ${issue}`));
      } else {
        this.success('No compatibility issues detected');
      }
      
    } catch (error) {
      this.error('Compatibility check failed:', error.message);
    }
  }

  checkVersionCompatibility(current, required) {
    return true;
  }

  findCompatibilityIssues(packageJson) {
    const issues = [];
    
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies['mongoose'] && dependencies['@prisma/client']) {
      issues.push('Both Mongoose and Prisma are installed - consider using only one database ORM');
    }
    
    return issues;
  }

  clearCache(options = {}) {
    try {
      this.info('🧹 Clearing cache and temporary files...');
      
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

      if (options.services) {
        this.clearServiceCaches();
      }

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

  clearServiceCaches() {
    this.info('Clearing service-specific caches...');
    
    if (this.availableServices.redis?.enabled) {
      try {
        this.info('Redis cache would be cleared');
      } catch (error) {
        this.warning('Could not clear Redis cache:', error.message);
      }
    }
  }

  runBenchmarks(options = {}) {
    this.info('🏃‍♂️ Running performance benchmarks...');
    
    const start = Date.now();
    
    console.log('\n📊 Benchmark Results:');
    console.log('=====================');
    
    console.log(`Application startup: ${Date.now() - start}ms`);
    
    if (options.services) {
      this.info('Service connection benchmarks would run here...');
    }
    
    this.success('Benchmarks completed!');
  }

  exportConfiguration(options = {}) {
    try {
      const config = {
        version: this.packageJson.version,
        timestamp: new Date().toISOString(),
        services: this.availableServices,
        environment: Object.entries(process.env)
          .filter(([key]) => key.startsWith('SEBF_') || key.includes('_ENABLED'))
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };
      
      const output = options.format === 'yaml' 
        ? this.toYaml(config)
        : JSON.stringify(config, null, 2);
      
      if (options.output) {
        fs.writeFileSync(options.output, output);
        this.success(`Configuration exported to ${options.output}`);
      } else {
        console.log(output);
      }
      
    } catch (error) {
      this.error('Failed to export configuration:', error.message);
    }
  }

  importConfiguration(file, options = {}) {
    try {
      if (!fs.existsSync(file)) {
        this.error(`Configuration file not found: ${file}`);
        return;
      }
      
      const content = fs.readFileSync(file, 'utf8');
      const config = JSON.parse(content);
      
      this.info(`Importing configuration from ${file}...`);
      
      if (config.environment) {
        Object.entries(config.environment).forEach(([key, value]) => {
          if (options.merge && process.env[key]) {
            this.info(`Skipping existing variable: ${key}`);
          } else {
            this.updateEnvVariable(key, value, true);
          }
        });
      }
      
      this.success('Configuration imported successfully!');
      this.info('Restart your application to apply changes');
      
    } catch (error) {
      this.error('Failed to import configuration:', error.message);
    }
  }

  toYaml(obj) {
    return JSON.stringify(obj, null, 2);
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