# 🕷️ Shopee Scraper System - Panduan Lengkap

## 📋 Daftar Isi

1. [Pengenalan](#pengenalan)
2. [Fitur Utama](#fitur-utama)
3. [Instalasi](#instalasi)
4. [Quick Start](#quick-start)
5. [Komponen Utama](#komponen-utama)
6. [Penggunaan Advanced](#penggunaan-advanced)
7. [Konfigurasi](#konfigurasi)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## 🎯 Pengenalan

Shopee Scraper System adalah core scraping engine yang powerful untuk mengekstrak data dari Shopee Indonesia dengan fitur anti-detection yang canggih. Sistem ini dibangun dengan arsitektur modular dan mendukung berbagai skenario scraping.

## ✨ Fitur Utama

### 🛡️ Anti-Detection & Stealth
- **Puppeteer Stealth Mode** - Plugin stealth untuk menghindari detection
- **User Agent Rotation** - Rotasi user agent secara otomatis
- **Viewport Randomization** - Randomisasi ukuran viewport
- **Human-like Behavior** - Simulasi perilaku manusia (typing, clicking, scrolling)
- **Request Interception** - Blokir resource yang tidak perlu
- **CAPTCHA Detection** - Deteksi dan handling CAPTCHA

### 🔐 Session Management
- **Cookie Persistence** - Penyimpanan dan restore cookies otomatis
- **Multi-Account Support** - Dukungan multiple akun
- **Session Validation** - Validasi session secara otomatis
- **Auto-Login** - Login otomatis dengan cookies atau credentials

### 🌐 Proxy Support
- **Proxy Rotation** - Rotasi proxy otomatis
- **Proxy Testing** - Test konektivitas proxy
- **Multiple Protocols** - HTTP, HTTPS, SOCKS support
- **Failover Handling** - Automatic failover untuk proxy yang gagal

### 📊 Scraping Capabilities
- **Product Scraping** - Scraping detail produk lengkap
- **Bulk Scraping** - Scraping multiple produk secara parallel
- **Shop Scraping** - Scraping semua produk dari toko
- **Category Scraping** - Scraping produk dari kategori
- **Search Scraping** - Scraping hasil pencarian dengan filter
- **Image Download** - Download gambar produk otomatis

### 🔄 Reliability & Performance
- **Retry Mechanism** - Retry otomatis untuk request yang gagal
- **Rate Limiting** - Intelligent delay dan rate limiting
- **Concurrent Processing** - Processing parallel dengan cluster
- **Error Handling** - Comprehensive error handling
- **Statistics & Monitoring** - Real-time statistics dan monitoring

## 🚀 Instalasi

### Prerequisites
```bash
# Node.js >= 18.0.0
node --version

# Dependencies sudah terinstall
npm install
```

### Setup Environment
```bash
# Copy environment file
cp .env.example .env

# Edit konfigurasi scraper
SCRAPER_CONCURRENT_LIMIT=3
SCRAPER_DELAY_MIN=1000
SCRAPER_DELAY_MAX=3000
SCRAPER_TIMEOUT=30000
SCRAPER_RETRY_ATTEMPTS=3
PUPPETEER_HEADLESS=true
```

## ⚡ Quick Start

### 1. Simple Product Scraping
```javascript
const { QuickStart } = require('./src/services/scraper');

async function scrapeProduct() {
  try {
    const result = await QuickStart.scrapeProduct(
      'https://shopee.co.id/product/123456/789012',
      {
        downloadImages: true,
        timeout: 30000,
      }
    );
    
    console.log('Product:', result.name);
    console.log('Price:', result.price);
    console.log('Rating:', result.rating);
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}
```

### 2. Bulk Product Scraping
```javascript
async function bulkScrape() {
  const productUrls = [
    'https://shopee.co.id/product/123456/789012',
    'https://shopee.co.id/product/123456/789013',
    'https://shopee.co.id/product/123456/789014',
  ];
  
  const result = await QuickStart.scrapeProducts(productUrls, {
    concurrent: 3,
    retryAttempts: 2,
  });
  
  console.log(`Success: ${result.successful}/${result.total}`);
}
```

### 3. Search Scraping
```javascript
async function searchScrape() {
  const result = await QuickStart.scrapeSearch(
    'laptop gaming',
    5, // max pages
    {
      minPrice: 5000000,
      maxPrice: 15000000,
      rating: 4,
    }
  );
  
  console.log(`Found ${result.totalProducts} products`);
}
```

## 🏗️ Komponen Utama

### BaseScraper
Core scraper class dengan stealth configuration dan cluster management.

```javascript
const { BaseScraper } = require('./src/services/scraper');

const scraper = new BaseScraper({
  concurrent: 3,
  retryAttempts: 3,
  timeout: 30000,
  useProxy: true,
  useCookies: true,
});
```

### LoginHandler
Menangani login dan session management untuk multiple accounts.

```javascript
const { LoginHandler } = require('./src/services/scraper');

const loginHandler = new LoginHandler();

// Add account
loginHandler.addAccount('user1', {
  username: 'your_username',
  password: 'your_password',
});

// Login
const result = await loginHandler.loginWithCredentials('user1', 'username', 'password');
```

### ProductScraper
Specialized scraper untuk produk Shopee dengan berbagai mode scraping.

```javascript
const { ProductScraper } = require('./src/services/scraper');

const scraper = new ProductScraper({
  downloadImages: true,
  priceHistoryEnabled: true,
});

// Scrape single product
const product = await scraper.addTask({
  url: 'https://shopee.co.id/product/123456/789012',
  taskType: 'product',
  accountId: 'user1',
});
```

## 🔧 Penggunaan Advanced

### 1. Complete Scraper System
```javascript
const { factory } = require('./src/services/scraper');

const scraper = factory.createCompleteScraper({
  concurrent: 5,
  downloadImages: true,
  useProxy: true,
  proxies: ['http://proxy1:8080', 'http://proxy2:8080'],
});

// Login
await scraper.login('user1', 'username', 'password');

// Scrape with authenticated session
const result = await scraper.scrapeProduct(productUrl, 'user1');
```

### 2. Proxy Configuration
```javascript
const { Utils } = require('./src/services/scraper');

const proxyManager = Utils.createProxyManager();

// Add proxies
proxyManager.addProxies([
  'http://proxy1.example.com:8080',
  'http://username:password@proxy2.example.com:8080',
  'socks5://proxy3.example.com:1080',
]);

// Test proxies
const testResults = await proxyManager.testAllProxies();
console.log('Working proxies:', testResults.working);
```

### 3. Cookie Management
```javascript
const { Utils } = require('./src/services/scraper');

const cookieManager = Utils.createCookieManager();

// List sessions
const sessions = await cookieManager.listSessions();

// Clean expired sessions
await cookieManager.cleanExpiredSessions();

// Backup sessions
await cookieManager.backupSessions('./backup/sessions.json');
```

### 4. Custom Stealth Configuration
```javascript
const { Utils } = require('./src/services/scraper');

const stealthConfig = Utils.createStealthConfig();

// Get random configuration
const userAgent = stealthConfig.getRandomUserAgent();
const viewport = stealthConfig.getRandomViewport();

// Human-like interactions
await stealthConfig.humanType(page, '#search', 'laptop gaming');
await stealthConfig.humanClick(page, '.search-button');
await stealthConfig.humanScroll(page, 500);
```

## ⚙️ Konfigurasi

### Environment Variables
```bash
# Scraper Configuration
SCRAPER_CONCURRENT_LIMIT=5
SCRAPER_DELAY_MIN=1000
SCRAPER_DELAY_MAX=3000
SCRAPER_TIMEOUT=30000
SCRAPER_RETRY_ATTEMPTS=3
SCRAPER_USER_AGENTS_ROTATION=true

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
PUPPETEER_EXECUTABLE_PATH=

# Proxy Configuration (optional)
PROXY_ENABLED=false
PROXY_LIST=proxy1:8080,proxy2:8080
PROXY_USERNAME=
PROXY_PASSWORD=
```

### Scraper Options
```javascript
const options = {
  // Performance
  concurrent: 3,              // Concurrent browser instances
  timeout: 30000,             // Request timeout (ms)
  retryAttempts: 3,           // Retry attempts for failed requests
  
  // Delays
  delayMin: 1000,             // Minimum delay between requests (ms)
  delayMax: 3000,             // Maximum delay between requests (ms)
  
  // Features
  useProxy: false,            // Enable proxy rotation
  useCookies: true,           // Enable cookie management
  downloadImages: false,      // Download product images
  priceHistoryEnabled: false, // Track price history
  
  // Proxy settings
  proxies: [],                // List of proxy URLs
  
  // Image settings
  maxImageSize: 5242880,      // Max image size (5MB)
  imageFormats: ['jpg', 'png', 'webp'],
};
```

## 📝 Best Practices

### 1. Rate Limiting
```javascript
// Gunakan delay yang wajar untuk menghindari detection
const scraper = new ProductScraper({
  delayMin: 2000,  // 2 detik minimum
  delayMax: 5000,  // 5 detik maximum
  concurrent: 2,   // Maksimal 2 concurrent requests
});
```

### 2. Error Handling
```javascript
try {
  const result = await scraper.scrapeProduct(url);
  
  // Check for CAPTCHA
  if (result.captchaDetected) {
    console.log('CAPTCHA detected, manual intervention required');
    // Handle CAPTCHA resolution
  }
  
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
    console.log('Request timeout, retrying...');
  } else if (error.message.includes('blocked')) {
    // Handle IP blocking
    console.log('IP blocked, switching proxy...');
  }
}
```

### 3. Session Management
```javascript
// Selalu gunakan session yang valid
const loginHandler = new LoginHandler();

// Check session validity before scraping
const isValid = await cookieManager.validateSession(page, 'user1');
if (!isValid) {
  await loginHandler.loginWithCredentials('user1', username, password);
}
```

### 4. Resource Management
```javascript
// Selalu close scraper setelah selesai
const scraper = new ProductScraper();
try {
  await scraper.initialize();
  const result = await scraper.scrapeProduct(url);
  return result;
} finally {
  await scraper.close(); // Important!
}
```

## 🔍 Troubleshooting

### Common Issues

#### 1. CAPTCHA Detection
```javascript
// Solution: Implement CAPTCHA handling
const scraper = new ProductScraper({
  captchaHandler: async (page) => {
    console.log('CAPTCHA detected, waiting for manual resolution...');
    // Wait for manual CAPTCHA resolution
    await page.waitForFunction(
      () => !document.querySelector('.captcha'),
      { timeout: 300000 }
    );
  }
});
```

#### 2. IP Blocking
```javascript
// Solution: Use proxy rotation
const scraper = new ProductScraper({
  useProxy: true,
  proxies: [
    'http://proxy1:8080',
    'http://proxy2:8080',
    'http://proxy3:8080',
  ],
});
```

#### 3. Session Expired
```javascript
// Solution: Implement auto-login
const loginHandler = new LoginHandler();

// Auto-login when session expires
scraper.on('sessionExpired', async (accountId) => {
  await loginHandler.loginWithCredentials(accountId, username, password);
});
```

#### 4. Memory Issues
```javascript
// Solution: Limit concurrent instances
const scraper = new ProductScraper({
  concurrent: 2,  // Reduce concurrent instances
  timeout: 15000, // Reduce timeout
});

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory usage:', Math.round(usage.heapUsed / 1024 / 1024), 'MB');
}, 30000);
```

### Debug Mode
```javascript
// Enable debug logging
const scraper = new ProductScraper({
  debug: true,
  headless: false, // Show browser for debugging
});

// Monitor cluster events
scraper.cluster.on('taskerror', (err, data) => {
  console.log('Task error:', err.message);
  console.log('URL:', data.url);
});
```

### Performance Monitoring
```javascript
// Get scraper statistics
const stats = scraper.getStats();
console.log('Performance stats:', {
  requests: stats.requests,
  successes: stats.successes,
  failures: stats.failures,
  successRate: stats.successRate,
  requestsPerMinute: stats.requestsPerMinute,
});
```

## 📊 Monitoring & Analytics

### Real-time Statistics
```javascript
// Monitor scraper performance
setInterval(() => {
  const stats = scraper.getStats();
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Requests/min: ${stats.requestsPerMinute}`);
}, 60000);
```

### Error Tracking
```javascript
// Track and analyze errors
const errorTracker = {
  errors: [],
  
  track(error, context) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
    });
  },
  
  getReport() {
    const errorCounts = {};
    this.errors.forEach(error => {
      errorCounts[error.message] = (errorCounts[error.message] || 0) + 1;
    });
    return errorCounts;
  }
};
```

---

## 🎯 Kesimpulan

Shopee Scraper System menyediakan solusi lengkap untuk scraping data Shopee dengan fitur anti-detection yang canggih. Dengan mengikuti panduan ini, Anda dapat mengimplementasikan scraping yang efisien, reliable, dan aman.

Untuk contoh penggunaan lebih lengkap, lihat file `examples/scraper-usage.js`.

**Happy Scraping! 🕷️**
