const BaseScraper = require('./BaseScraper');
const logger = require('../../utils/logger');

/**
 * Login Handler untuk Shopee dengan multi-account support
 * Menangani login, session validation, dan account management
 */
class LoginHandler extends BaseScraper {
  constructor(options = {}) {
    super({
      concurrent: 1, // Login should be sequential
      ...options,
    });

    this.loginUrl = 'https://shopee.co.id/buyer/login';
    this.profileUrl = 'https://shopee.co.id/user/account/profile';
    this.accounts = new Map();
    this.loginAttempts = new Map();
    this.maxLoginAttempts = 3;
    this.loginCooldown = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Handle login task
   */
  async handleTask(page, taskType, taskData) {
    switch (taskType) {
      case 'login':
        return await this.performLogin(page, taskData);
      case 'validate':
        return await this.validateSession(page, taskData);
      case 'logout':
        return await this.performLogout(page, taskData);
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  /**
   * Add account for login management
   */
  addAccount(accountId, credentials) {
    this.accounts.set(accountId, {
      ...credentials,
      lastLogin: null,
      loginCount: 0,
      isActive: false,
    });
    
    logger.scraper(`Account added: ${accountId}`);
  }

  /**
   * Login with username/password
   */
  async loginWithCredentials(accountId, username, password) {
    try {
      // Check login attempts
      if (!this.canAttemptLogin(accountId)) {
        throw new Error(`Login cooldown active for account: ${accountId}`);
      }

      const result = await this.addTask({
        url: this.loginUrl,
        taskType: 'login',
        accountId,
        username,
        password,
      });

      if (result.success) {
        this.updateAccountStatus(accountId, true);
        this.resetLoginAttempts(accountId);
      } else {
        this.incrementLoginAttempts(accountId);
      }

      return result;
    } catch (error) {
      this.incrementLoginAttempts(accountId);
      logger.error(`Login failed for account: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * Login using saved cookies
   */
  async loginWithCookies(accountId) {
    try {
      const result = await this.addTask({
        url: this.profileUrl,
        taskType: 'validate',
        accountId,
      });

      if (result.success) {
        this.updateAccountStatus(accountId, true);
        logger.scraper(`Login successful with cookies for account: ${accountId}`);
      } else {
        logger.scraper(`Cookie login failed for account: ${accountId}`);
      }

      return result;
    } catch (error) {
      logger.error(`Cookie login failed for account: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * Perform actual login process
   */
  async performLogin(page, { username, password, accountId }) {
    try {
      logger.scraper(`Starting login process for account: ${accountId}`);

      // Wait for login form
      await page.waitForSelector('input[name="loginKey"]', { timeout: 10000 });
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });

      // Check for CAPTCHA
      await this.handleCaptcha(page);

      // Fill username
      await this.stealthConfig.humanType(page, 'input[name="loginKey"]', username);
      await this.stealthConfig.randomWait(500, 1000);

      // Fill password
      await this.stealthConfig.humanType(page, 'input[name="password"]', password);
      await this.stealthConfig.randomWait(500, 1000);

      // Click login button
      await this.stealthConfig.humanClick(page, 'button[type="submit"]');

      // Wait for navigation or error
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.waitForSelector('.error-msg', { timeout: 5000 }).then(() => {
          throw new Error('Login error detected');
        }),
      ]);

      // Check if login was successful
      const currentUrl = page.url();
      if (currentUrl.includes('/buyer/login')) {
        // Still on login page, check for errors
        const errorElement = await page.$('.error-msg');
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          throw new Error(`Login failed: ${errorText}`);
        }
        throw new Error('Login failed: Still on login page');
      }

      // Verify login by checking profile page
      await page.goto(this.profileUrl, { waitUntil: 'networkidle0' });
      
      const profileExists = await page.$('.user-profile') !== null;
      if (!profileExists) {
        throw new Error('Login verification failed: No profile found');
      }

      // Extract and save cookies
      await this.cookieManager.extractAndSaveCookies(page, accountId, {
        loginMethod: 'credentials',
        loginTime: new Date().toISOString(),
      });

      logger.scraper(`Login successful for account: ${accountId}`);
      
      return {
        success: true,
        accountId,
        loginMethod: 'credentials',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Login failed for account: ${accountId}`, error);
      return {
        success: false,
        accountId,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate existing session
   */
  async validateSession(page, { accountId }) {
    try {
      logger.scraper(`Validating session for account: ${accountId}`);

      // Check if redirected to login page
      const currentUrl = page.url();
      if (currentUrl.includes('/buyer/login')) {
        return {
          success: false,
          accountId,
          error: 'Session expired - redirected to login',
          timestamp: new Date().toISOString(),
        };
      }

      // Check for profile elements
      const profileExists = await page.$('.user-profile') !== null;
      if (!profileExists) {
        return {
          success: false,
          accountId,
          error: 'Session invalid - no profile found',
          timestamp: new Date().toISOString(),
        };
      }

      // Extract user info
      const userInfo = await this.extractUserInfo(page);

      logger.scraper(`Session valid for account: ${accountId}`);
      
      return {
        success: true,
        accountId,
        userInfo,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Session validation failed for account: ${accountId}`, error);
      return {
        success: false,
        accountId,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Extract user information from profile page
   */
  async extractUserInfo(page) {
    try {
      const userInfo = await page.evaluate(() => {
        const nameElement = document.querySelector('.user-profile .username');
        const emailElement = document.querySelector('.user-profile .email');
        const phoneElement = document.querySelector('.user-profile .phone');

        return {
          name: nameElement ? nameElement.textContent.trim() : null,
          email: emailElement ? emailElement.textContent.trim() : null,
          phone: phoneElement ? phoneElement.textContent.trim() : null,
        };
      });

      return userInfo;
    } catch (error) {
      logger.error('Failed to extract user info:', error);
      return {};
    }
  }

  /**
   * Perform logout
   */
  async performLogout(page, { accountId }) {
    try {
      logger.scraper(`Logging out account: ${accountId}`);

      // Navigate to logout URL or click logout button
      const logoutButton = await page.$('a[href*="logout"]');
      if (logoutButton) {
        await this.stealthConfig.humanClick(page, 'a[href*="logout"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
      }

      // Delete saved cookies
      await this.cookieManager.deleteSession(accountId);
      this.updateAccountStatus(accountId, false);

      logger.scraper(`Logout successful for account: ${accountId}`);
      
      return {
        success: true,
        accountId,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`Logout failed for account: ${accountId}`, error);
      return {
        success: false,
        accountId,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if account can attempt login
   */
  canAttemptLogin(accountId) {
    const attempts = this.loginAttempts.get(accountId);
    if (!attempts) return true;

    if (attempts.count >= this.maxLoginAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      return timeSinceLastAttempt > this.loginCooldown;
    }

    return true;
  }

  /**
   * Increment login attempts
   */
  incrementLoginAttempts(accountId) {
    const attempts = this.loginAttempts.get(accountId) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(accountId, attempts);
  }

  /**
   * Reset login attempts
   */
  resetLoginAttempts(accountId) {
    this.loginAttempts.delete(accountId);
  }

  /**
   * Update account status
   */
  updateAccountStatus(accountId, isActive) {
    const account = this.accounts.get(accountId);
    if (account) {
      account.isActive = isActive;
      account.lastLogin = isActive ? new Date() : account.lastLogin;
      account.loginCount = isActive ? account.loginCount + 1 : account.loginCount;
    }
  }

  /**
   * Get account status
   */
  getAccountStatus(accountId) {
    return this.accounts.get(accountId) || null;
  }

  /**
   * Get all accounts status
   */
  getAllAccountsStatus() {
    const accounts = [];
    for (const [accountId, account] of this.accounts) {
      accounts.push({
        accountId,
        ...account,
      });
    }
    return accounts;
  }

  /**
   * Auto-login all accounts
   */
  async autoLoginAll() {
    const results = [];
    
    for (const [accountId, account] of this.accounts) {
      try {
        // Try cookie login first
        let result = await this.loginWithCookies(accountId);
        
        // If cookie login fails, try credentials
        if (!result.success && account.username && account.password) {
          result = await this.loginWithCredentials(accountId, account.username, account.password);
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          accountId,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = LoginHandler;
