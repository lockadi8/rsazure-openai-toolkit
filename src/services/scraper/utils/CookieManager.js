const fs = require('fs').promises;
const path = require('path');
const logger = require('../../../utils/logger');

/**
 * Cookie Manager untuk session handling dan persistence
 * Mendukung multiple accounts dan automatic session refresh
 */
class CookieManager {
  constructor() {
    this.cookiesDir = path.join(process.cwd(), 'data', 'cookies');
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.ensureCookiesDir();
  }

  /**
   * Ensure cookies directory exists
   */
  async ensureCookiesDir() {
    try {
      await fs.mkdir(this.cookiesDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create cookies directory', error);
    }
  }

  /**
   * Generate session file path
   */
  getSessionFilePath(accountId) {
    return path.join(this.cookiesDir, `session_${accountId}.json`);
  }

  /**
   * Save cookies to file
   */
  async saveCookies(accountId, cookies, metadata = {}) {
    try {
      const sessionData = {
        accountId,
        cookies,
        metadata: {
          ...metadata,
          savedAt: new Date().toISOString(),
          userAgent: metadata.userAgent || null,
          viewport: metadata.viewport || null,
        },
      };

      const filePath = this.getSessionFilePath(accountId);
      await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2));
      
      // Cache in memory
      this.sessions.set(accountId, sessionData);
      
      logger.scraper(`Cookies saved for account: ${accountId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to save cookies for account: ${accountId}`, error);
      return false;
    }
  }

  /**
   * Load cookies from file
   */
  async loadCookies(accountId) {
    try {
      // Check memory cache first
      if (this.sessions.has(accountId)) {
        const session = this.sessions.get(accountId);
        if (this.isSessionValid(session)) {
          logger.scraper(`Cookies loaded from cache for account: ${accountId}`);
          return session;
        } else {
          this.sessions.delete(accountId);
        }
      }

      // Load from file
      const filePath = this.getSessionFilePath(accountId);
      const content = await fs.readFile(filePath, 'utf8');
      const sessionData = JSON.parse(content);

      if (this.isSessionValid(sessionData)) {
        this.sessions.set(accountId, sessionData);
        logger.scraper(`Cookies loaded from file for account: ${accountId}`);
        return sessionData;
      } else {
        logger.scraper(`Session expired for account: ${accountId}`);
        await this.deleteSession(accountId);
        return null;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to load cookies for account: ${accountId}`, error);
      }
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.metadata || !sessionData.metadata.savedAt) {
      return false;
    }

    const savedAt = new Date(sessionData.metadata.savedAt);
    const now = new Date();
    const timeDiff = now.getTime() - savedAt.getTime();

    return timeDiff < this.sessionTimeout;
  }

  /**
   * Apply cookies to page
   */
  async applyCookiesToPage(page, accountId) {
    try {
      const sessionData = await this.loadCookies(accountId);
      if (!sessionData || !sessionData.cookies) {
        logger.scraper(`No valid cookies found for account: ${accountId}`);
        return false;
      }

      // Set cookies
      await page.setCookie(...sessionData.cookies);
      
      // Apply metadata if available
      if (sessionData.metadata.userAgent) {
        await page.setUserAgent(sessionData.metadata.userAgent);
      }
      
      if (sessionData.metadata.viewport) {
        await page.setViewport(sessionData.metadata.viewport);
      }

      logger.scraper(`Cookies applied to page for account: ${accountId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to apply cookies for account: ${accountId}`, error);
      return false;
    }
  }

  /**
   * Extract and save cookies from page
   */
  async extractAndSaveCookies(page, accountId, metadata = {}) {
    try {
      const cookies = await page.cookies();
      const userAgent = await page.evaluate(() => navigator.userAgent);
      const viewport = page.viewport();

      const sessionMetadata = {
        ...metadata,
        userAgent,
        viewport,
        extractedAt: new Date().toISOString(),
      };

      await this.saveCookies(accountId, cookies, sessionMetadata);
      return true;
    } catch (error) {
      logger.error(`Failed to extract cookies for account: ${accountId}`, error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(accountId) {
    try {
      const filePath = this.getSessionFilePath(accountId);
      await fs.unlink(filePath);
      this.sessions.delete(accountId);
      logger.scraper(`Session deleted for account: ${accountId}`);
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error(`Failed to delete session for account: ${accountId}`, error);
      }
      return false;
    }
  }

  /**
   * List all available sessions
   */
  async listSessions() {
    try {
      const files = await fs.readdir(this.cookiesDir);
      const sessions = [];

      for (const file of files) {
        if (file.startsWith('session_') && file.endsWith('.json')) {
          const accountId = file.replace('session_', '').replace('.json', '');
          const sessionData = await this.loadCookies(accountId);
          
          if (sessionData) {
            sessions.push({
              accountId,
              isValid: this.isSessionValid(sessionData),
              savedAt: sessionData.metadata.savedAt,
              cookieCount: sessionData.cookies.length,
            });
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to list sessions', error);
      return [];
    }
  }

  /**
   * Clean expired sessions
   */
  async cleanExpiredSessions() {
    try {
      const sessions = await this.listSessions();
      let cleanedCount = 0;

      for (const session of sessions) {
        if (!session.isValid) {
          await this.deleteSession(session.accountId);
          cleanedCount++;
        }
      }

      logger.scraper(`Cleaned ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to clean expired sessions', error);
      return 0;
    }
  }

  /**
   * Validate session by checking login status
   */
  async validateSession(page, accountId) {
    try {
      // Apply cookies first
      const applied = await this.applyCookiesToPage(page, accountId);
      if (!applied) {
        return false;
      }

      // Navigate to Shopee and check if logged in
      await page.goto('https://shopee.co.id/user/account/profile', {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Check if redirected to login page
      const currentUrl = page.url();
      if (currentUrl.includes('/buyer/login')) {
        logger.scraper(`Session invalid for account: ${accountId} - redirected to login`);
        await this.deleteSession(accountId);
        return false;
      }

      // Check for profile elements
      const profileExists = await page.$('.user-profile') !== null;
      if (!profileExists) {
        logger.scraper(`Session invalid for account: ${accountId} - no profile found`);
        await this.deleteSession(accountId);
        return false;
      }

      logger.scraper(`Session validated for account: ${accountId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to validate session for account: ${accountId}`, error);
      return false;
    }
  }

  /**
   * Get session statistics
   */
  async getStats() {
    const sessions = await this.listSessions();
    
    return {
      total: sessions.length,
      valid: sessions.filter(s => s.isValid).length,
      expired: sessions.filter(s => !s.isValid).length,
      sessions: sessions,
    };
  }

  /**
   * Backup all sessions
   */
  async backupSessions(backupPath) {
    try {
      const sessions = await this.listSessions();
      const backupData = {
        createdAt: new Date().toISOString(),
        sessions: [],
      };

      for (const session of sessions) {
        const sessionData = await this.loadCookies(session.accountId);
        if (sessionData) {
          backupData.sessions.push(sessionData);
        }
      }

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      logger.scraper(`Sessions backed up to: ${backupPath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to backup sessions to: ${backupPath}`, error);
      return false;
    }
  }

  /**
   * Restore sessions from backup
   */
  async restoreSessions(backupPath) {
    try {
      const content = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(content);
      let restoredCount = 0;

      for (const sessionData of backupData.sessions) {
        const success = await this.saveCookies(
          sessionData.accountId,
          sessionData.cookies,
          sessionData.metadata
        );
        if (success) {
          restoredCount++;
        }
      }

      logger.scraper(`Restored ${restoredCount} sessions from backup`);
      return restoredCount;
    } catch (error) {
      logger.error(`Failed to restore sessions from: ${backupPath}`, error);
      return 0;
    }
  }
}

module.exports = CookieManager;
