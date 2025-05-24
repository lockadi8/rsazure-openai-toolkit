const nodemailer = require('nodemailer');
const config = require('../../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  async initialize() {
    try {
      if (!config.email.smtp.auth.user || !config.email.smtp.auth.pass) {
        logger.warn('Email service not configured - SMTP credentials missing');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.isConfigured) {
        logger.warn('Email service not configured - skipping email send');
        return false;
      }

      const mailOptions = {
        from: `"Shopee Scraper" <${config.email.smtp.auth.user}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email:', error, {
        to,
        subject,
      });
      return false;
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${config.server.host}:${config.server.port}/api/auth/verify-email/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Thank you for registering with Shopee Scraper!</p>
            <p>To complete your registration, please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Shopee Scraper. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Verify Your Email Address', html);
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.server.host}:${config.server.port}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>We received a request to reset your password for your Shopee Scraper account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This password reset link will expire in 10 minutes</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>© 2024 Shopee Scraper. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Password Reset Request', html);
  }

  async sendWelcomeEmail(email, firstName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Shopee Scraper</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #28a745; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Shopee Scraper!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Welcome to Shopee Scraper! Your account has been successfully created and verified.</p>
            <p>Here's what you can do with your account:</p>
            
            <div class="feature">
              <h3>🔍 Product Scraping</h3>
              <p>Search and scrape products from Shopee with advanced filters</p>
            </div>
            
            <div class="feature">
              <h3>📊 Analytics Dashboard</h3>
              <p>View detailed analytics and insights about scraped products</p>
            </div>
            
            <div class="feature">
              <h3>🔔 Price Tracking</h3>
              <p>Track product prices and get notified of changes</p>
            </div>
            
            <div class="feature">
              <h3>📈 Export Data</h3>
              <p>Export your scraped data in various formats (CSV, JSON)</p>
            </div>
            
            <p>Get started by logging into your dashboard and exploring the features!</p>
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 Shopee Scraper. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Welcome to Shopee Scraper!', html);
  }

  async sendPriceAlertEmail(email, product, oldPrice, newPrice) {
    const priceChange = newPrice - oldPrice;
    const priceChangePercent = ((priceChange / oldPrice) * 100).toFixed(2);
    const isDecrease = priceChange < 0;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Price Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${isDecrease ? '#28a745' : '#dc3545'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .product { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .price-change { font-size: 24px; font-weight: bold; color: ${isDecrease ? '#28a745' : '#dc3545'}; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Price Alert: ${product.name}</h1>
          </div>
          <div class="content">
            <p>The price of a product you're tracking has changed!</p>
            
            <div class="product">
              <h3>${product.name}</h3>
              <p><strong>Shop:</strong> ${product.shopName}</p>
              <p><strong>Category:</strong> ${product.category}</p>
              
              <div class="price-change">
                ${isDecrease ? '📉' : '📈'} ${isDecrease ? 'Price Decreased' : 'Price Increased'}
              </div>
              
              <p><strong>Old Price:</strong> Rp ${oldPrice.toLocaleString('id-ID')}</p>
              <p><strong>New Price:</strong> Rp ${newPrice.toLocaleString('id-ID')}</p>
              <p><strong>Change:</strong> ${priceChange > 0 ? '+' : ''}Rp ${priceChange.toLocaleString('id-ID')} (${priceChangePercent}%)</p>
              
              <p><a href="${product.url}" style="color: #007bff;">View Product</a></p>
            </div>
            
            <p>This alert was sent because you're tracking this product's price changes.</p>
          </div>
          <div class="footer">
            <p>© 2024 Shopee Scraper. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, `Price Alert: ${product.name}`, html);
  }

  async sendScrapingReportEmail(email, report) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Scraping Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { background: white; padding: 15px; border-radius: 4px; text-align: center; flex: 1; margin: 0 5px; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Scraping Job Completed</h1>
          </div>
          <div class="content">
            <p>Your scraping job has been completed successfully!</p>
            
            <div class="stats">
              <div class="stat">
                <h3>${report.totalProducts}</h3>
                <p>Products Scraped</p>
              </div>
              <div class="stat">
                <h3>${report.successRate}%</h3>
                <p>Success Rate</p>
              </div>
              <div class="stat">
                <h3>${report.duration}</h3>
                <p>Duration</p>
              </div>
            </div>
            
            <p><strong>Job Details:</strong></p>
            <ul>
              <li>Job ID: ${report.jobId}</li>
              <li>Query: ${report.query}</li>
              <li>Started: ${report.startTime}</li>
              <li>Completed: ${report.endTime}</li>
            </ul>
            
            <p>You can view the detailed results in your dashboard.</p>
          </div>
          <div class="footer">
            <p>© 2024 Shopee Scraper. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, 'Scraping Job Completed', html);
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isConfigured() {
    return this.isConfigured;
  }
}

module.exports = new EmailService();
