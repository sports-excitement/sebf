const { Client } = require('minio');
const config = require('../config/services').minio;
const Logger = require('../helpers/Logger');
const path = require('path');
const fs = require('fs');

class MinioService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.enabled = config.enabled;
    
    if (this.enabled) {
      this.initializeClient();
    } else {
      Logger.warn('MinIO is disabled - check MINIO_ACCESS_KEY and MINIO_SECRET_KEY environment variables');
    }
  }

  initializeClient() {
    try {
      this.client = new Client({
        endPoint: config.endpoint,
        port: config.port,
        useSSL: config.useSSL,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
        region: config.region,
        partSize: config.options.partSize,
      });

      Logger.info('MinIO client initialized');
    } catch (error) {
      Logger.error('Failed to initialize MinIO client:', error);
      this.enabled = false;
    }
  }

  async connect() {
    if (!this.enabled) {
      Logger.warn('MinIO is disabled, skipping connection');
      return false;
    }

    try {
      // Test connection by listing buckets
      await this.client.listBuckets();
      this.isConnected = true;
      Logger.info('MinIO connected successfully');
      
      // Ensure default bucket exists
      await this.ensureBucket(config.bucket);
      return true;
    } catch (error) {
      this.isConnected = false;
      Logger.error('MinIO connection failed:', error);
      return false;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      return { 
        status: 'disabled', 
        message: 'MinIO is disabled' 
      };
    }

    try {
      if (!this.client) {
        return { 
          status: 'error', 
          message: 'MinIO client not initialized' 
        };
      }

      await this.client.listBuckets();
      this.isConnected = true;
      return { 
        status: 'connected', 
        message: 'MinIO connection successful' 
      };
    } catch (error) {
      this.isConnected = false;
      Logger.error('MinIO connection test failed:', error);
      return { 
        status: 'error', 
        message: error.message 
      };
    }
  }

  async ensureBucket(bucketName) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const exists = await this.client.bucketExists(bucketName);
      
      if (!exists) {
        await this.client.makeBucket(bucketName, config.region);
        Logger.info(`Bucket ${bucketName} created successfully`);
        
        // Set default bucket policy (public read for specific paths if needed)
        await this.setBucketPolicy(bucketName);
      }
      
      return true;
    } catch (error) {
      Logger.error(`Failed to ensure bucket ${bucketName}:`, error);
      throw error;
    }
  }

  async setBucketPolicy(bucketName, isPublic = false) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      if (isPublic) {
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucketName}/public/*`]
            }
          ]
        };

        await this.client.setBucketPolicy(bucketName, JSON.stringify(policy));
        Logger.info(`Public read policy set for bucket ${bucketName}`);
      }
    } catch (error) {
      Logger.error(`Failed to set bucket policy for ${bucketName}:`, error);
      // Don't throw here as bucket policy is not critical
    }
  }

  async uploadFile(bucketName, objectName, filePath, metadata = {}) {
    if (!this.enabled || !this.client) {
      Logger.warn('MinIO not available, skipping file upload');
      return null;
    }

    try {
      // Ensure bucket exists
      await this.ensureBucket(bucketName);

      // Add timestamp and file info to metadata
      const enrichedMetadata = {
        ...metadata,
        'uploaded-at': new Date().toISOString(),
        'original-name': path.basename(filePath),
        'content-type': this.getContentType(filePath)
      };

      const result = await this.client.fPutObject(bucketName, objectName, filePath, enrichedMetadata);
      
      Logger.info(`File uploaded successfully: ${bucketName}/${objectName}`);
      return {
        bucket: bucketName,
        object: objectName,
        etag: result.etag,
        versionId: result.versionId,
        url: this.getObjectUrl(bucketName, objectName)
      };
    } catch (error) {
      Logger.error(`Failed to upload file ${objectName}:`, error);
      throw error;
    }
  }

  async uploadBuffer(bucketName, objectName, buffer, metadata = {}) {
    if (!this.enabled || !this.client) {
      Logger.warn('MinIO not available, skipping buffer upload');
      return null;
    }

    try {
      // Ensure bucket exists
      await this.ensureBucket(bucketName);

      // Add timestamp to metadata
      const enrichedMetadata = {
        ...metadata,
        'uploaded-at': new Date().toISOString(),
        'content-length': buffer.length.toString()
      };

      const result = await this.client.putObject(bucketName, objectName, buffer, buffer.length, enrichedMetadata);
      
      Logger.info(`Buffer uploaded successfully: ${bucketName}/${objectName}`);
      return {
        bucket: bucketName,
        object: objectName,
        etag: result.etag,
        versionId: result.versionId,
        url: this.getObjectUrl(bucketName, objectName)
      };
    } catch (error) {
      Logger.error(`Failed to upload buffer ${objectName}:`, error);
      throw error;
    }
  }

  async downloadFile(bucketName, objectName, filePath) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      await this.client.fGetObject(bucketName, objectName, filePath);
      Logger.info(`File downloaded successfully: ${bucketName}/${objectName} to ${filePath}`);
      return filePath;
    } catch (error) {
      Logger.error(`Failed to download file ${objectName}:`, error);
      throw error;
    }
  }

  async getObject(bucketName, objectName) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const stream = await this.client.getObject(bucketName, objectName);
      return stream;
    } catch (error) {
      Logger.error(`Failed to get object ${objectName}:`, error);
      throw error;
    }
  }

  async getObjectInfo(bucketName, objectName) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const stat = await this.client.statObject(bucketName, objectName);
      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        contentType: stat.metaData['content-type'],
        metadata: stat.metaData
      };
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      Logger.error(`Failed to get object info ${objectName}:`, error);
      throw error;
    }
  }

  async deleteObject(bucketName, objectName) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      await this.client.removeObject(bucketName, objectName);
      Logger.info(`Object deleted successfully: ${bucketName}/${objectName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete object ${objectName}:`, error);
      throw error;
    }
  }

  async deleteObjects(bucketName, objectNames) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      await this.client.removeObjects(bucketName, objectNames);
      Logger.info(`${objectNames.length} objects deleted successfully from ${bucketName}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete objects from ${bucketName}:`, error);
      throw error;
    }
  }

  async listObjects(bucketName, prefix = '', recursive = true, maxKeys = 1000) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const objects = [];
      const stream = this.client.listObjects(bucketName, prefix, recursive);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (objects.length < maxKeys) {
            objects.push({
              name: obj.name,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
              url: this.getObjectUrl(bucketName, obj.name)
            });
          }
        });

        stream.on('error', (error) => {
          Logger.error(`Failed to list objects in ${bucketName}:`, error);
          reject(error);
        });

        stream.on('end', () => {
          resolve(objects);
        });
      });
    } catch (error) {
      Logger.error(`Failed to list objects in ${bucketName}:`, error);
      throw error;
    }
  }

  async getPresignedUrl(bucketName, objectName, expiry = 24 * 60 * 60, reqParams = {}) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const url = await this.client.presignedGetObject(bucketName, objectName, expiry, reqParams);
      return url;
    } catch (error) {
      Logger.error(`Failed to generate presigned URL for ${objectName}:`, error);
      throw error;
    }
  }

  async getPresignedUploadUrl(bucketName, objectName, expiry = 24 * 60 * 60) {
    if (!this.enabled || !this.client) {
      throw new Error('MinIO not available');
    }

    try {
      const url = await this.client.presignedPutObject(bucketName, objectName, expiry);
      return url;
    } catch (error) {
      Logger.error(`Failed to generate presigned upload URL for ${objectName}:`, error);
      throw error;
    }
  }

  getObjectUrl(bucketName, objectName) {
    if (!this.enabled) {
      return null;
    }

    const protocol = config.useSSL ? 'https' : 'http';
    const port = config.port !== 80 && config.port !== 443 ? `:${config.port}` : '';
    return `${protocol}://${config.endpoint}${port}/${bucketName}/${objectName}`;
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip'
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  // Utility methods for common operations

  async uploadUserAvatar(userId, filePath) {
    if (!this.enabled) {
      return null;
    }

    try {
      const objectName = `avatars/${userId}/${Date.now()}-${path.basename(filePath)}`;
      return await this.uploadFile(config.bucket, objectName, filePath, {
        'user-id': userId.toString(),
        'file-type': 'avatar'
      });
    } catch (error) {
      Logger.error('Failed to upload user avatar:', error);
      throw error;
    }
  }

  async uploadDocument(userId, filePath, documentType = 'general') {
    if (!this.enabled) {
      return null;
    }

    try {
      const objectName = `documents/${userId}/${documentType}/${Date.now()}-${path.basename(filePath)}`;
      return await this.uploadFile(config.bucket, objectName, filePath, {
        'user-id': userId.toString(),
        'document-type': documentType
      });
    } catch (error) {
      Logger.error('Failed to upload document:', error);
      throw error;
    }
  }

  async getUserFiles(userId, fileType = null) {
    if (!this.enabled) {
      throw new Error('MinIO not available');
    }

    try {
      const prefix = fileType ? `${fileType}/${userId}/` : `${userId}/`;
      return await this.listObjects(config.bucket, prefix);
    } catch (error) {
      Logger.error(`Failed to get user files for ${userId}:`, error);
      throw error;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  isHealthy() {
    return this.enabled && this.isConnected;
  }

  getClient() {
    return this.client;
  }
}

// Create singleton instance
const minioService = new MinioService();

module.exports = minioService; 