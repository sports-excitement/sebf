const v8 = require('v8');
const Logger = require('../helpers/Logger');

class MemoryService {
  constructor() {
    this.enabled = process.env.MEMORY_MONITORING_ENABLED !== 'false' && 
                   !['test', 'testing'].includes(process.env.NODE_ENV);
    this.warningThreshold = parseInt(process.env.MEMORY_WARNING_THRESHOLD || '85', 10); // 85%
    this.criticalThreshold = parseInt(process.env.MEMORY_CRITICAL_THRESHOLD || '95', 10); // 95%
    this.gcIntervalMs = parseInt(process.env.GC_INTERVAL_MS || '300000', 10); // 5 minutes
    this.heapSnapshotPath = process.env.HEAP_SNAPSHOT_PATH || './storage/memory-snapshots';
    
    if (this.enabled) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    Logger.info('Memory monitoring enabled');
    
    // Set up periodic memory monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // Check every minute

    // Set up periodic garbage collection if global.gc is available
    if (global.gc && this.gcIntervalMs > 0) {
      this.gcInterval = setInterval(() => {
        this.performGarbageCollection();
      }, this.gcIntervalMs);
    }

    // Monitor memory warnings
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        Logger.warn('Memory Warning - Too many listeners:', warning.message);
        this.performGarbageCollection();
      }
    });

    // Handle process events
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  checkMemoryUsage() {
    try {
      const usage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics();
      
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const externalMB = Math.round(usage.external / 1024 / 1024);
      const rssMB = Math.round(usage.rss / 1024 / 1024);
      
      const heapUsagePercent = Math.round((usage.heapUsed / heapStats.heap_size_limit) * 100);
      
      // Log current usage
      Logger.debug(`Memory Usage: RSS=${rssMB}MB, Heap=${heapUsedMB}/${heapTotalMB}MB (${heapUsagePercent}%), External=${externalMB}MB`);
      
      // Check thresholds
      if (heapUsagePercent >= this.criticalThreshold) {
        Logger.error(`Critical memory usage: ${heapUsagePercent}% of heap limit`);
        this.handleCriticalMemory();
      } else if (heapUsagePercent >= this.warningThreshold) {
        Logger.warn(`High memory usage: ${heapUsagePercent}% of heap limit`);
        this.handleHighMemory();
      }
      
      return {
        rss: rssMB,
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        external: externalMB,
        heapUsagePercent,
        heapLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024)
      };
    } catch (error) {
      Logger.error('Error checking memory usage:', error);
      return null;
    }
  }

  performGarbageCollection() {
    if (global.gc) {
      try {
        const beforeUsage = process.memoryUsage();
        global.gc();
        const afterUsage = process.memoryUsage();
        
        const freedMB = Math.round((beforeUsage.heapUsed - afterUsage.heapUsed) / 1024 / 1024);
        if (freedMB > 0) {
          Logger.debug(`Garbage collection freed ${freedMB}MB`);
        }
        
        return freedMB;
      } catch (error) {
        Logger.error('Error performing garbage collection:', error);
        return 0;
      }
    } else {
      Logger.debug('Garbage collection not available (run with --expose-gc)');
      return 0;
    }
  }

  handleHighMemory() {
    Logger.warn('Handling high memory usage...');
    
    // Perform garbage collection
    this.performGarbageCollection();
    
    // Emit warning event for application to handle
    process.emit('memoryWarning', this.checkMemoryUsage());
  }

  handleCriticalMemory() {
    Logger.error('Handling critical memory usage...');
    
    // Perform aggressive garbage collection
    this.performGarbageCollection();
    
    // Create heap snapshot for analysis
    this.createHeapSnapshot();
    
    // Emit critical event for application to handle
    process.emit('memoryCritical', this.checkMemoryUsage());
    
    // Consider restarting if memory doesn't decrease
    setTimeout(() => {
      const currentUsage = this.checkMemoryUsage();
      if (currentUsage && currentUsage.heapUsagePercent >= this.criticalThreshold) {
        Logger.error('Memory usage still critical after cleanup, consider restarting');
        process.emit('memoryRestart', currentUsage);
      }
    }, 10000); // Check again after 10 seconds
  }

  createHeapSnapshot() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Ensure snapshot directory exists
      if (!fs.existsSync(this.heapSnapshotPath)) {
        fs.mkdirSync(this.heapSnapshotPath, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heap-${timestamp}.heapsnapshot`;
      const filepath = path.join(this.heapSnapshotPath, filename);
      
      const snapshot = v8.writeHeapSnapshot(filepath);
      Logger.warn(`Heap snapshot created: ${snapshot}`);
      
      // Clean up old snapshots (keep only last 5)
      this.cleanupOldSnapshots();
      
      return snapshot;
    } catch (error) {
      Logger.error('Error creating heap snapshot:', error);
      return null;
    }
  }

  cleanupOldSnapshots() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (!fs.existsSync(this.heapSnapshotPath)) {
        return;
      }
      
      const files = fs.readdirSync(this.heapSnapshotPath)
        .filter(file => file.endsWith('.heapsnapshot'))
        .map(file => ({
          name: file,
          path: path.join(this.heapSnapshotPath, file),
          stats: fs.statSync(path.join(this.heapSnapshotPath, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);
      
      // Keep only the 5 most recent snapshots
      const filesToDelete = files.slice(5);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        Logger.debug(`Deleted old heap snapshot: ${file.name}`);
      });
    } catch (error) {
      Logger.error('Error cleaning up old snapshots:', error);
    }
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      memoryUsage: {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
        arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024)
      },
      heapStatistics: {
        totalHeapSize: Math.round(heapStats.total_heap_size / 1024 / 1024),
        totalHeapSizeExecutable: Math.round(heapStats.total_heap_size_executable / 1024 / 1024),
        totalPhysicalSize: Math.round(heapStats.total_physical_size / 1024 / 1024),
        totalAvailableSize: Math.round(heapStats.total_available_size / 1024 / 1024),
        usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024),
        heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
        mallocedMemory: Math.round(heapStats.malloced_memory / 1024 / 1024),
        peakMallocedMemory: Math.round(heapStats.peak_malloced_memory / 1024 / 1024),
        doesZapGarbage: heapStats.does_zap_garbage
      },
      gcStatistics: this.getGCStats()
    };
  }

  getGCStats() {
    try {
      const gcStats = v8.getHeapSpaceStatistics();
      return gcStats.map(space => ({
        spaceName: space.space_name,
        spaceSize: Math.round(space.space_size / 1024 / 1024),
        spaceUsedSize: Math.round(space.space_used_size / 1024 / 1024),
        spaceAvailableSize: Math.round(space.space_available_size / 1024 / 1024),
        physicalSpaceSize: Math.round(space.physical_space_size / 1024 / 1024)
      }));
    } catch (error) {
      Logger.error('Error getting GC stats:', error);
      return [];
    }
  }

  optimizeMemory() {
    Logger.info('Starting memory optimization...');
    
    const beforeStats = this.checkMemoryUsage();
    
    // Perform garbage collection
    const freedMB = this.performGarbageCollection();
    
    // Clear require cache for non-core modules (be careful!)
    this.clearModuleCache();
    
    const afterStats = this.checkMemoryUsage();
    
    Logger.info(`Memory optimization complete. Freed ${freedMB}MB from GC`);
    
    return {
      before: beforeStats,
      after: afterStats,
      freedMB
    };
  }

  clearModuleCache() {
    try {
      // Only clear non-core modules and be very selective
      const modulesToClear = [];
      
      Object.keys(require.cache).forEach(key => {
        // Only clear modules in node_modules that are safe to reload
        if (key.includes('node_modules') && 
            !key.includes('prisma') && 
            !key.includes('express') &&
            !key.includes('core-js')) {
          modulesToClear.push(key);
        }
      });
      
      // Clear selected modules
      modulesToClear.forEach(key => {
        delete require.cache[key];
      });
      
      Logger.debug(`Cleared ${modulesToClear.length} modules from cache`);
    } catch (error) {
      Logger.error('Error clearing module cache:', error);
    }
  }

  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    Logger.info('Memory service cleanup completed');
  }

  isEnabled() {
    return this.enabled;
  }
}

// Create singleton instance
const memoryService = new MemoryService();

module.exports = memoryService;