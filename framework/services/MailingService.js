const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/services');
const Logger = require('../helpers/Logger');

/**
 * Comprehensive Mailing Service
 * 
 * Features:
 * - SMTP transport with fallback mechanisms
 * - HTML and text email templates
 * - Email queuing for bulk operations
 * - Rate limiting and retry logic
 * - Attachment support
 * - Email tracking and analytics
 * - Multiple provider support (SMTP, SendGrid, AWS SES)
 */
class MailingService {
  constructor() {
    this.config = config.email || {};
    this.transporter = null;
    this.isEnabled = this.config.enabled || false;
    this.isConnected = false;
    this.emailQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitCount = 0;
    this.rateLimitWindow = 60000; // 1 minute
    this.maxEmailsPerMinute = this.config.maxEmailsPerMinute || 10;
    this.templates = new Map();
    this.stats = {
      sent: 0,
      failed: 0,
      queued: 0,
      totalSent: 0,
      lastSent: null,
      errors: []
    };
  }

  /**
   * Initialize the mailing service
   */
  async connect() {
    if (!this.isEnabled) {
      Logger.info('Mailing service is disabled');
      return { status: 'disabled', message: 'Mailing service is disabled in configuration' };
    }

    try {
      await this.setupTransporter();
      await this.verifyConnection();
      await this.loadTemplates();
      this.startQueueProcessor();
      this.startRateLimitReset();
      
      this.isConnected = true;
      Logger.info('✅ Mailing service initialized successfully');
      
      return { 
        status: 'connected', 
        message: 'Mailing service initialized successfully',
        provider: this.config.provider || 'smtp',
        templatesLoaded: this.templates.size
      };
    } catch (error) {
      Logger.error('❌ Failed to initialize mailing service:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Setup email transporter based on configuration
   */
  async setupTransporter() {
    const provider = this.config.provider || 'smtp';
    
    switch (provider.toLowerCase()) {
      case 'smtp':
        this.transporter = nodemailer.createTransporter({
          host: this.config.host,
          port: this.config.port || 587,
          secure: this.config.secure || false,
          auth: {
            user: this.config.auth?.user,
            pass: this.config.auth?.pass
          },
          pool: this.config.pool || true,
          maxConnections: this.config.maxConnections || 5,
          maxMessages: this.config.maxMessages || 100,
          rateLimit: this.config.rateLimit || 10,
          tls: {
            rejectUnauthorized: this.config.rejectUnauthorized !== false
          }
        });
        break;
        
      case 'sendgrid':
        if (!this.config.apiKey) {
          throw new Error('SendGrid API key is required');
        }
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: this.config.apiKey
          }
        });
        break;
        
      case 'ses':
        if (!this.config.accessKeyId || !this.config.secretAccessKey) {
          throw new Error('AWS SES credentials are required');
        }
        this.transporter = nodemailer.createTransporter({
          SES: {
            apiVersion: '2010-12-01',
            region: this.config.region || 'us-east-1',
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey
          }
        });
        break;
        
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
    
    return new Promise((resolve, reject) => {
      this.transporter.verify((error, success) => {
        if (error) {
          reject(new Error(`Email connection failed: ${error.message}`));
        } else {
          resolve(success);
        }
      });
    });
  }

  /**
   * Load email templates from file system
   */
  async loadTemplates() {
    // Template directories in order of priority (app resources first, then framework)
    const templateDirectories = [
      path.join(process.cwd(), 'app/resources/templates/email'), // User-customizable templates
      path.join(__dirname, '../templates/email')                 // Default framework templates
    ];
    
    const loadedTemplates = new Set(); // Track which templates we've already loaded
    
    for (const templatesDir of templateDirectories) {
      try {
        // Create templates directory if it doesn't exist
        await fs.mkdir(templatesDir, { recursive: true });
        
        const files = await fs.readdir(templatesDir);
        const templateFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.txt'));
        
        for (const file of templateFiles) {
          const templateName = path.basename(file, path.extname(file));
          
          // Skip if we've already loaded this template (app resources take priority)
          if (loadedTemplates.has(templateName)) {
            continue;
          }
          
          const templatePath = path.join(templatesDir, file);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          
          this.templates.set(templateName, {
            content: templateContent,
            type: path.extname(file).substring(1),
            path: templatePath,
            lastModified: (await fs.stat(templatePath)).mtime,
            source: templatesDir.includes('app/resources') ? 'app' : 'framework'
          });
          
          loadedTemplates.add(templateName);
        }
        
      } catch (error) {
        // Only warn if it's the framework directory (app resources directory is optional)
        if (templatesDir.includes('framework')) {
          Logger.warn(`Failed to load templates from ${templatesDir}:`, error.message);
        }
      }
    }
    
    const appTemplates = Array.from(this.templates.values()).filter(t => t.source === 'app').length;
    const frameworkTemplates = Array.from(this.templates.values()).filter(t => t.source === 'framework').length;
    
    Logger.info(`📧 Loaded ${this.templates.size} email templates (${appTemplates} custom, ${frameworkTemplates} framework)`);
  }

  /**
   * Send email with template support
   */
  async sendEmail(options) {
    if (!this.isEnabled) {
      throw new Error('Mailing service is disabled');
    }

    if (!this.isConnected) {
      throw new Error('Mailing service is not connected');
    }

    // Rate limiting check
    if (this.rateLimitCount >= this.maxEmailsPerMinute) {
      if (options.queue !== false) {
        return this.queueEmail(options);
      } else {
        throw new Error('Rate limit exceeded. Email queued for later delivery.');
      }
    }

    try {
      const emailData = await this.prepareEmailData(options);
      const result = await this.transporter.sendMail(emailData);
      
      this.rateLimitCount++;
      this.stats.sent++;
      this.stats.totalSent++;
      this.stats.lastSent = new Date();
      
      Logger.info(`📧 Email sent successfully to ${options.to}`, {
        messageId: result.messageId,
        response: result.response
      });
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.stats.failed++;
      this.stats.errors.push({
        error: error.message,
        timestamp: new Date(),
        recipient: options.to
      });
      
      Logger.error(`❌ Failed to send email to ${options.to}:`, error.message);
      
      // Retry logic for temporary failures
      if (this.shouldRetry(error) && (options.retryCount || 0) < 3) {
        options.retryCount = (options.retryCount || 0) + 1;
        return this.queueEmail(options, 5000 * options.retryCount); // Exponential backoff
      }
      
      throw error;
    }
  }

  /**
   * Prepare email data with template processing
   */
  async prepareEmailData(options) {
    const emailData = {
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      ...options
    };

    // Process template if specified
    if (options.template) {
      const processedContent = await this.processTemplate(options.template, options.variables || {});
      
      if (processedContent.html) {
        emailData.html = processedContent.html;
      }
      if (processedContent.text) {
        emailData.text = processedContent.text;
      }
    }

    // Handle attachments
    if (options.attachments) {
      emailData.attachments = await this.processAttachments(options.attachments);
    }

    return emailData;
  }

  /**
   * Process email template with variables
   */
  async processTemplate(templateName, variables = {}) {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    let processedContent = template.content;

    // Simple variable replacement (you can enhance this with a proper template engine)
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    // Add common variables
    const commonVariables = {
      app_name: process.env.APP_NAME || 'Sports Excitement',
      app_url: process.env.APP_URL || 'http://localhost:3000',
      current_year: new Date().getFullYear(),
      timestamp: new Date().toISOString()
    };

    Object.entries(commonVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    return {
      [template.type]: processedContent
    };
  }

  /**
   * Process email attachments
   */
  async processAttachments(attachments) {
    const processedAttachments = [];

    for (const attachment of attachments) {
      if (typeof attachment === 'string') {
        // File path
        processedAttachments.push({
          path: attachment
        });
      } else if (attachment.buffer) {
        // Buffer attachment
        processedAttachments.push({
          filename: attachment.filename,
          content: attachment.buffer,
          contentType: attachment.contentType
        });
      } else {
        // Regular attachment object
        processedAttachments.push(attachment);
      }
    }

    return processedAttachments;
  }

  /**
   * Queue email for later delivery
   */
  queueEmail(emailData, delay = 0) {
    const queueItem = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      data: emailData,
      attempts: 0,
      maxAttempts: emailData.maxRetries || 3,
      scheduledFor: new Date(Date.now() + delay),
      createdAt: new Date()
    };

    this.emailQueue.push(queueItem);
    this.stats.queued++;

    Logger.info(`📧 Email queued: ${queueItem.id} (Queue size: ${this.emailQueue.length})`);

    return {
      success: true,
      queued: true,
      queueId: queueItem.id,
      scheduledFor: queueItem.scheduledFor
    };
  }

  /**
   * Process email queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const now = new Date();

    try {
      for (let i = this.emailQueue.length - 1; i >= 0; i--) {
        const queueItem = this.emailQueue[i];

        // Check if it's time to process this email
        if (queueItem.scheduledFor <= now) {
          try {
            await this.sendEmail({ ...queueItem.data, queue: false });
            this.emailQueue.splice(i, 1);
            this.stats.queued--;
          } catch (error) {
            queueItem.attempts++;
            
            if (queueItem.attempts >= queueItem.maxAttempts) {
              Logger.error(`❌ Email queue item ${queueItem.id} failed after ${queueItem.attempts} attempts`);
              this.emailQueue.splice(i, 1);
              this.stats.queued--;
            } else {
              // Reschedule with exponential backoff
              queueItem.scheduledFor = new Date(Date.now() + (5000 * Math.pow(2, queueItem.attempts)));
            }
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 10000); // Process queue every 10 seconds
  }

  /**
   * Start rate limit reset timer
   */
  startRateLimitReset() {
    setInterval(() => {
      this.rateLimitCount = 0;
    }, this.rateLimitWindow);
  }

  /**
   * Determine if error should trigger retry
   */
  shouldRetry(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network Error',
      'Connection timeout'
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || error.code === retryableError
    );
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(recipients, emailTemplate) {
    if (!Array.isArray(recipients)) {
      throw new Error('Recipients must be an array');
    }

    const results = [];
    const batchSize = this.config.bulkBatchSize || 50;
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        try {
          const emailData = typeof recipient === 'string' 
            ? { ...emailTemplate, to: recipient }
            : { ...emailTemplate, ...recipient };
            
          return await this.sendEmail(emailData);
        } catch (error) {
          return { success: false, recipient, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => result.value || result.reason));

      // Delay between batches to respect rate limits
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Test connection and send test email
   */
  async testConnection() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'Mailing service is disabled' };
    }

    try {
      if (!this.isConnected) {
        await this.connect();
      }

      // Send test email if configured
      if (this.config.testRecipient) {
        await this.sendEmail({
          to: this.config.testRecipient,
          subject: 'Mailing Service Test',
          text: 'This is a test email from the Sports Excitement mailing service.',
          html: '<p>This is a test email from the <strong>Sports Excitement</strong> mailing service.</p>'
        });
      }

      return {
        status: 'connected',
        message: 'Mailing service is operational',
        provider: this.config.provider || 'smtp',
        templatesLoaded: this.templates.size,
        queueSize: this.emailQueue.length,
        stats: this.getStats()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        provider: this.config.provider || 'smtp'
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.emailQueue.length,
      rateLimitCount: this.rateLimitCount,
      isConnected: this.isConnected,
      templatesLoaded: this.templates.size
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      size: this.emailQueue.length,
      processing: this.isProcessingQueue,
      items: this.emailQueue.map(item => ({
        id: item.id,
        attempts: item.attempts,
        scheduledFor: item.scheduledFor,
        recipient: item.data.to
      }))
    };
  }

  /**
   * Clear email queue
   */
  clearQueue() {
    const clearedCount = this.emailQueue.length;
    this.emailQueue = [];
    this.stats.queued = 0;
    
    Logger.info(`📧 Email queue cleared: ${clearedCount} items removed`);
    return { cleared: clearedCount };
  }

  /**
   * Reload templates
   */
  async reloadTemplates() {
    this.templates.clear();
    await this.loadTemplates();
    
    return {
      success: true,
      templatesLoaded: this.templates.size
    };
  }

  /**
   * Disconnect from email service
   */
  async disconnect() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    
    this.isConnected = false;
    Logger.info('📧 Mailing service disconnected');
    
    return { status: 'disconnected', message: 'Mailing service disconnected successfully' };
  }

  /**
   * Health check
   */
  isHealthy() {
    return this.isConnected && this.transporter !== null;
  }
}

// Create singleton instance
const mailingService = new MailingService();

module.exports = mailingService;