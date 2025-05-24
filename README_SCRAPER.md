# 🕷️ Shopee Scraper System

## 🎯 Overview

Core scraping engine yang powerful untuk Shopee Indonesia dengan fitur anti-detection canggih, session management, proxy rotation, dan comprehensive error handling.

## ✨ Key Features

### 🛡️ Anti-Detection & Stealth
- **Puppeteer Stealth Mode** dengan plugin anti-detection
- **User Agent Rotation** otomatis
- **Viewport Randomization** untuk menghindari fingerprinting
- **Human-like Behavior** simulation (typing, clicking, scrolling)
- **Request Interception** untuk optimasi performa
- **CAPTCHA Detection** dan handling

### 🔐 Session Management
- **Cookie Persistence** dengan automatic save/restore
- **Multi-Account Support** untuk scaling
- **Session Validation** otomatis
- **Auto-Login** dengan fallback ke credentials

### 🌐 Proxy Support
- **Proxy Rotation** dengan failover
- **Multiple Protocols** (HTTP, HTTPS, SOCKS)
- **Proxy Health Monitoring** dan testing
- **Automatic Failover** untuk proxy yang gagal

### 📊 Scraping Capabilities
- **Product Scraping** - Detail produk lengkap
- **Bulk Scraping** - Multiple produk parallel
- **Shop Scraping** - Semua produk dari toko
- **Category Scraping** - Produk dari kategori
- **Search Scraping** - Hasil pencarian dengan filter
- **Image Download** - Download gambar produk

## 🚀 Quick Start

### 1. Installation
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 2. Basic Usage
```javascript
const { QuickStart } = require('./src/services/scraper');

// Scrape single product
const product = await QuickStart.scrapeProduct(
  'https://shopee.co.id/product/123456/789012'
);

console.log(product.name, product.price);
```

### 3. Bulk Scraping
```javascript
const urls = [
  'https://shopee.co.id/product/123456/789012',
  'https://shopee.co.id/product/123456/789013',
];

const result = await QuickStart.scrapeProducts(urls, {
  concurrent: 3,
  downloadImages: true,
});

console.log(`Success: ${result.successful}/${result.total}`);
```

## 📋 Available Scripts

```bash
# Test connection to Shopee
npm run scraper:test

# Run quick product example
npm run scraper:quick

# Run bulk scraping example
npm run scraper:bulk

# Run all examples
npm run scraper:all

# Show all available commands
npm run scraper:examples
```

## 🔧 Advanced Usage

### Complete Scraper System
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
const product = await scraper.scrapeProduct(productUrl, 'user1');
const shop = await scraper.scrapeShop(shopUrl, 50, 'user1');
const search = await scraper.scrapeSearch('laptop gaming', 5, {}, 'user1');

await scraper.close();
```

### Custom Configuration
```javascript
const { ProductScraper } = require('./src/services/scraper');

const scraper = new ProductScraper({
  concurrent: 3,
  retryAttempts: 3,
  timeout: 30000,
  delayMin: 2000,
  delayMax: 5000,
  downloadImages: true,
  useProxy: true,
  proxies: ['http://proxy:8080'],
});
```

## 🏗️ Architecture

### Core Components

1. **BaseScraper** - Foundation class dengan stealth dan cluster management
2. **LoginHandler** - Session management dan multi-account support
3. **ProductScraper** - Specialized scraper untuk produk Shopee
4. **StealthConfig** - Anti-detection configuration
5. **ProxyManager** - Proxy rotation dan health monitoring
6. **CookieManager** - Cookie persistence dan session handling

### Directory Structure
```
src/services/scraper/
├── BaseScraper.js          # Core scraper class
├── LoginHandler.js         # Login & session management
├── ProductScraper.js       # Product scraping logic
├── index.js               # Main exports
└── utils/
    ├── StealthConfig.js   # Anti-detection config
    ├── ProxyManager.js    # Proxy management
    └── CookieManager.js   # Cookie handling
```

## ⚙️ Configuration

### Environment Variables
```bash
# Scraper Settings
SCRAPER_CONCURRENT_LIMIT=5
SCRAPER_DELAY_MIN=1000
SCRAPER_DELAY_MAX=3000
SCRAPER_TIMEOUT=30000
SCRAPER_RETRY_ATTEMPTS=3

# Puppeteer Settings
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
```

### Scraper Options
```javascript
const options = {
  concurrent: 3,              // Concurrent instances
  timeout: 30000,             // Request timeout
  retryAttempts: 3,           // Retry failed requests
  delayMin: 1000,             // Min delay between requests
  delayMax: 3000,             // Max delay between requests
  useProxy: false,            // Enable proxy rotation
  useCookies: true,           // Enable session management
  downloadImages: false,      // Download product images
  priceHistoryEnabled: false, // Track price changes
};
```

## 📊 Monitoring & Statistics

### Real-time Stats
```javascript
const stats = scraper.getStats();
console.log({
  requests: stats.requests,
  successes: stats.successes,
  failures: stats.failures,
  successRate: stats.successRate,
  requestsPerMinute: stats.requestsPerMinute,
});
```

### Error Tracking
```javascript
scraper.cluster.on('taskerror', (err, data) => {
  console.log('Task failed:', err.message);
  console.log('URL:', data.url);
});
```

## 🔍 Troubleshooting

### Common Issues

#### CAPTCHA Detection
```javascript
// Handle CAPTCHA manually
const scraper = new ProductScraper({
  captchaHandler: async (page) => {
    console.log('CAPTCHA detected, waiting...');
    await page.waitForFunction(
      () => !document.querySelector('.captcha'),
      { timeout: 300000 }
    );
  }
});
```

#### IP Blocking
```javascript
// Use proxy rotation
const scraper = new ProductScraper({
  useProxy: true,
  proxies: [
    'http://proxy1:8080',
    'http://proxy2:8080',
  ],
});
```

#### Session Expired
```javascript
// Auto-login on session expiry
const loginHandler = new LoginHandler();
scraper.on('sessionExpired', async (accountId) => {
  await loginHandler.loginWithCredentials(accountId, username, password);
});
```

## 📝 Best Practices

### 1. Rate Limiting
```javascript
// Use reasonable delays
const scraper = new ProductScraper({
  delayMin: 2000,  // 2 seconds minimum
  delayMax: 5000,  // 5 seconds maximum
  concurrent: 2,   // Max 2 concurrent
});
```

### 2. Resource Management
```javascript
// Always close scrapers
try {
  const result = await scraper.scrapeProduct(url);
  return result;
} finally {
  await scraper.close(); // Important!
}
```

### 3. Error Handling
```javascript
try {
  const result = await scraper.scrapeProduct(url);
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('blocked')) {
    // Handle blocking
  }
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Specific Components
```bash
# Test scraper functionality
npm run scraper:test

# Test with custom URL
npm run scraper:quick -- --url "https://shopee.co.id/product/123/456"

# Test bulk scraping
npm run scraper:bulk -- --file urls.txt --concurrent 5
```

## 📚 Examples

Lihat `examples/scraper-usage.js` untuk contoh penggunaan lengkap:

- Quick product scraping
- Bulk product scraping
- Login dan authenticated scraping
- Shop scraping
- Search dengan filter
- Proxy usage
- Cookie management
- Error handling
- Complete system integration

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Add tests untuk fitur baru
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - lihat file LICENSE untuk detail.

---

## 🎯 Summary

Shopee Scraper System menyediakan solusi lengkap untuk scraping data Shopee dengan:

- ✅ **Anti-detection** yang canggih
- ✅ **Session management** otomatis
- ✅ **Proxy rotation** dengan failover
- ✅ **Comprehensive error handling**
- ✅ **Real-time monitoring**
- ✅ **Easy-to-use API**

**Happy Scraping! 🕷️**
