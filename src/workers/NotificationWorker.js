const { Worker } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');
const { emailService } = require('../services/emailService');

/**
 * Notification Worker
 * Worker untuk mengirim notifikasi (email, webhook, dll)
 */
class NotificationWorker {
  constructor(options = {}) {
    this.options = {
      concurrency: options.concurrency || config.queue.concurrency,
      queueName: options.queueName || config.queue.queues.notifications,
      ...options,
    };
    
    this.worker = null;
    this.isRunning = false;
    this.stats = {
      processed: 0,
      completed: 0,
      failed: 0,
      startTime: new Date(),
    };
    
    // Setup Redis connection
    this.redisConnection = new Redis({
      ...config.database.redis,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
  }

  /**
   * Start the worker
   */
  async start() {
    try {
      logger.info(`Starting NotificationWorker for queue: ${this.options.queueName}`);
      
      // Connect to Redis
      await this.redisConnection.connect();
      
      // Create worker
      this.worker = new Worker(
        this.options.queueName,
        this.processJob.bind(this),
        {
          connection: this.redisConnection,
          concurrency: this.options.concurrency,
          removeOnComplete: config.queue.removeOnComplete,
          removeOnFail: config.queue.removeOnFail,
        }
      );
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.isRunning = true;
      logger.info(`NotificationWorker started successfully with concurrency: ${this.options.concurrency}`);
      
    } catch (error) {
      logger.error('Failed to start NotificationWorker:', error);
      throw error;
    }
  }

  /**
   * Process individual job
   */
  async processJob(job) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing notification job ${job.id} (${job.name})`);
      
      this.stats.processed++;
      
      let result;
      
      // Route job to appropriate processor based on job name
      switch (job.name) {
        case 'send-email':
          result = await this.sendEmail(job);
          break;
          
        case 'send-webhook':
          result = await this.sendWebhook(job);
          break;
          
        case 'send-sms':
          result = await this.sendSMS(job);
          break;
          
        case 'send-push-notification':
          result = await this.sendPushNotification(job);
          break;
          
        case 'send-slack-notification':
          result = await this.sendSlackNotification(job);
          break;
          
        default:
          throw new Error(`Unknown notification type: ${job.name}`);
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.completed++;
      
      logger.info(`Notification job ${job.id} completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingTime,
        workerId: this.getWorkerId(),
      };
      
    } catch (error) {
      this.stats.failed++;
      logger.error(`Notification job ${job.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(job) {
    const { to, subject, template, data, attachments } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const emailOptions = {
        to,
        subject,
        template,
        data,
        attachments,
      };
      
      const result = await emailService.sendEmail(emailOptions);
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'email',
        to,
        subject,
        messageId: result.messageId,
      };
      
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(job) {
    const { url, method = 'POST', headers = {}, data, timeout = 10000 } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const axios = require('axios');
      
      const response = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data,
        timeout,
      });
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'webhook',
        url,
        status: response.status,
        statusText: response.statusText,
      };
      
    } catch (error) {
      logger.error('Failed to send webhook:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(job) {
    const { to, message, provider = 'twilio' } = job.data;
    
    try {
      await job.updateProgress(10);
      
      // Implement SMS sending based on provider
      let result;
      
      switch (provider) {
        case 'twilio':
          result = await this.sendTwilioSMS(to, message);
          break;
        case 'nexmo':
          result = await this.sendNexmoSMS(to, message);
          break;
        default:
          throw new Error(`Unknown SMS provider: ${provider}`);
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'sms',
        to,
        provider,
        messageId: result.messageId,
      };
      
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(job) {
    const { tokens, title, body, data, badge } = job.data;
    
    try {
      await job.updateProgress(10);
      
      // Implement push notification using Firebase FCM
      const admin = require('firebase-admin');
      
      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          notification: {
            badge: badge || 0,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: badge || 0,
            },
          },
        },
      };
      
      let results;
      if (Array.isArray(tokens)) {
        results = await admin.messaging().sendMulticast({
          ...message,
          tokens,
        });
      } else {
        results = await admin.messaging().send({
          ...message,
          token: tokens,
        });
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'push',
        tokensCount: Array.isArray(tokens) ? tokens.length : 1,
        successCount: results.successCount || (results.messageId ? 1 : 0),
        failureCount: results.failureCount || (results.messageId ? 0 : 1),
      };
      
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(job) {
    const { webhook, channel, username, text, attachments } = job.data;
    
    try {
      await job.updateProgress(10);
      
      const axios = require('axios');
      
      const payload = {
        channel,
        username: username || 'Shopee Scraper Bot',
        text,
        attachments,
      };
      
      const response = await axios.post(webhook, payload);
      
      await job.updateProgress(100);
      
      return {
        success: true,
        type: 'slack',
        channel,
        status: response.status,
      };
      
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendTwilioSMS(to, message) {
    // Implement Twilio SMS sending
    // This is a placeholder - implement with actual Twilio SDK
    return {
      messageId: `twilio_${Date.now()}`,
      status: 'sent',
    };
  }

  /**
   * Send SMS via Nexmo
   */
  async sendNexmoSMS(to, message) {
    // Implement Nexmo SMS sending
    // This is a placeholder - implement with actual Nexmo SDK
    return {
      messageId: `nexmo_${Date.now()}`,
      status: 'sent',
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.worker.on('completed', (job, result) => {
      logger.debug(`Notification job ${job.id} completed with result:`, result);
    });
    
    this.worker.on('failed', (job, err) => {
      logger.error(`Notification job ${job.id} failed:`, err);
    });
    
    this.worker.on('error', (err) => {
      logger.error('Notification worker error:', err);
    });
    
    this.worker.on('stalled', (jobId) => {
      logger.warn(`Notification job ${jobId} stalled`);
    });
    
    this.worker.on('progress', (job, progress) => {
      logger.debug(`Notification job ${job.id} progress: ${progress}%`);
    });
  }

  /**
   * Get worker ID
   */
  getWorkerId() {
    return `notification-worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const avgProcessingTime = this.stats.processed > 0 ? 
      uptime / this.stats.processed : 0;
    
    return {
      ...this.stats,
      uptime,
      avgProcessingTime: Math.round(avgProcessingTime),
      successRate: this.stats.processed > 0 ? 
        (this.stats.completed / this.stats.processed) * 100 : 100,
      isRunning: this.isRunning,
      workerId: this.getWorkerId(),
    };
  }

  /**
   * Stop the worker
   */
  async stop() {
    try {
      logger.info('Stopping NotificationWorker...');
      
      if (this.worker) {
        await this.worker.close();
      }
      
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
      
      this.isRunning = false;
      logger.info('NotificationWorker stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping NotificationWorker:', error);
      throw error;
    }
  }

  /**
   * Force stop the worker
   */
  async forceStop() {
    try {
      logger.warn('Force stopping NotificationWorker...');
      
      if (this.worker) {
        await this.worker.close(true);
      }
      
      if (this.redisConnection) {
        this.redisConnection.disconnect();
      }
      
      this.isRunning = false;
      logger.warn('NotificationWorker force stopped');
      
    } catch (error) {
      logger.error('Error force stopping NotificationWorker:', error);
      throw error;
    }
  }
}

module.exports = NotificationWorker;
