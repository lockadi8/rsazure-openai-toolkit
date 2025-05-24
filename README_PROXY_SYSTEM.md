# 🚀 Advanced Proxy Rotation & Anti-Detection System

Sistem proxy rotation dan anti-detection yang comprehensive dengan monitoring real-time dan human behavior simulation untuk web scraping yang tidak terdeteksi.

## ✨ Fitur Utama

### 🌐 **Advanced Proxy Manager**
- ✅ Multiple proxy provider support (Bright Data, Oxylabs, custom)
- ✅ Intelligent load balancing (round-robin, least-used, performance-based)
- ✅ Geolocation targeting dan management
- ✅ Automatic health checking dan failure detection
- ✅ Auto-recovery dan proxy rotation

### 🛡️ **Comprehensive Anti-Detection**
- ✅ Canvas fingerprint randomization
- ✅ WebRTC leak protection
- ✅ Font enumeration blocking
- ✅ Hardware concurrency spoofing
- ✅ Memory info spoofing
- ✅ Browser fingerprint spoofing (user agent, viewport, language, timezone)
- ✅ JavaScript execution context hiding

### 🤖 **Human Behavior Simulation**
- ✅ Realistic mouse movement dengan bezier curves
- ✅ Human-like typing dengan variable delays dan typos
- ✅ Natural scrolling patterns dengan reading pauses
- ✅ Click timing randomization dengan pre-hover
- ✅ Reading time simulation berdasarkan content length
- ✅ Page navigation delays yang realistic

### 📊 **Real-time Monitoring & Alerting**
- ✅ Performance metrics (response time, success rate, detection rate)
- ✅ Real-time web dashboard dengan auto-refresh
- ✅ Smart alerts dengan configurable thresholds
- ✅ Auto-remediation untuk critical alerts
- ✅ Historical data dan trend analysis

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies (sudah termasuk dalam package.json)
npm install
```

### 2. Basic Usage

```javascript
const { AdvancedProxySystem } = require('./src/services/proxy');

// Initialize system
const proxySystem = new AdvancedProxySystem({
  proxy: {
    loadBalancing: 'performance',
    healthCheckInterval: 300000
  },
  antiDetection: {
    enableCanvasFingerprinting: true,
    enableWebRTCProtection: true
  },
  monitoring: {
    enabled: true,
    dashboard: { enabled: true, port: 3001 }
  }
});

// Add proxies
proxySystem.addProxies([
  {
    host: '192.168.1.100',
    port: 8080,
    username: 'user1',
    password: 'pass1',
    geolocation: 'US'
  }
]);

// Create browser with anti-detection
const { browser, profile, proxy } = await proxySystem.createBrowser();
const { page } = await proxySystem.createPage(browser);

// Navigate with stealth
await proxySystem.navigateWithStealth(page, 'https://example.com');

// Human-like interactions
await page.humanType('#search', 'search query');
await page.humanClick('#submit');
await page.naturalScroll('down', 500);
```

### 3. Start Monitoring Dashboard

```bash
# Start dashboard
npm run proxy:dashboard

# Or run full demo
npm run proxy:demo
```

Dashboard tersedia di: **http://localhost:3001**

## 📊 Monitoring Dashboard

Dashboard real-time menampilkan:

- **System Overview**: Total proxies, active proxies, global metrics
- **Proxy Status**: Individual proxy performance dan health
- **Real-time Alerts**: Active alerts dengan severity levels  
- **Performance Charts**: Historical performance data
- **Auto-refresh**: Updates setiap 5 detik

### Status Indicators

- 🟢 **Healthy**: Semua sistem berjalan normal
- 🟡 **Degraded**: Performance menurun tapi masih functional
- 🔴 **Unhealthy**: Sistem memerlukan perhatian segera

## ⚙️ Konfigurasi

### Proxy Providers

```javascript
// Bright Data
proxySystem.addProxyProvider('brightdata', {
  type: 'brightdata',
  endpoint: 'brd.superproxy.io:22225',
  auth: {
    username: 'brd-customer-hl_12345678-zone-static',
    password: 'your_password'
  },
  geolocations: ['US', 'UK', 'DE']
});

// Oxylabs
proxySystem.addProxyProvider('oxylabs', {
  type: 'oxylabs', 
  endpoint: 'pr.oxylabs.io:7777',
  auth: {
    username: 'customer-username',
    password: 'your_password'
  },
  geolocations: ['US', 'UK', 'CA']
});
```

### Anti-Detection Settings

```javascript
antiDetection: {
  enableCanvasFingerprinting: true,    // Canvas randomization
  enableWebRTCProtection: true,        // WebRTC blocking
  enableFontBlocking: true,            // Font enumeration blocking
  enableHardwareSpoof: true,           // CPU/memory spoofing
  enableTimezoneSpoof: true,           // Timezone randomization
  enableLanguageSpoof: true            // Language spoofing
}
```

### Human Behavior Tuning

```javascript
humanBehavior: {
  typingSpeed: { min: 50, max: 150 },     // Typing speed (ms)
  mouseSpeed: { min: 100, max: 300 },     // Mouse movement (ms)
  scrollSpeed: { min: 200, max: 800 },    // Scroll speed (ms)
  readingSpeed: {
    wordsPerMinute: 200,                  // Reading speed
    variationPercent: 30                  // Speed variation
  }
}
```

## 🔧 Advanced Features

### Load Balancing Strategies

- **round-robin**: Sequential proxy selection
- **least-used**: Select proxy dengan usage terendah
- **performance**: Select berdasarkan success rate dan response time
- **random**: Random proxy selection

### Geolocation Targeting

```javascript
const { browser } = await proxySystem.createBrowser({
  proxyOptions: {
    geolocation: 'US',        // Target US proxies
    forceHealthy: true        // Only use healthy proxies
  }
});
```

### Custom Browser Profiles

```javascript
const customProfile = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
  viewport: { width: 1920, height: 1080 },
  language: { lang: 'en-US,en;q=0.9', locale: 'en-US' },
  timezone: 'America/New_York'
};

const { page } = await proxySystem.createPage(browser, { 
  profile: customProfile 
});
```

## 📝 Available Scripts

```bash
# Run full demo dengan monitoring
npm run proxy:demo

# Start monitoring dashboard only
npm run proxy:dashboard

# Run existing scraper examples
npm run scraper:examples
npm run scraper:quick
npm run scraper:bulk
```

## 🏗️ Arsitektur

```
src/services/
├── proxy/
│   └── index.js                    # Main orchestrator
├── antiDetection/
│   └── index.js                    # Anti-detection module
├── behavior/
│   └── HumanBehavior.js           # Human behavior simulation
├── monitoring/
│   ├── ProxyMonitor.js            # Real-time monitoring
│   └── Dashboard.js               # Web dashboard
├── scraper/utils/
│   ├── ProxyManager.js            # Enhanced proxy manager
│   └── StealthConfig.js           # Enhanced stealth config
└── config/
    └── puppeteer.js               # Puppeteer configuration
```

## 🔗 Integration dengan Existing System

Sistem ini terintegrasi seamlessly dengan scraper system yang sudah ada:

```javascript
// Gunakan dengan existing scrapers
const { AdvancedProxySystem } = require('./src/services/proxy');
const { ProductScraper } = require('./src/services/scraper');

const proxySystem = new AdvancedProxySystem();
const { browser } = await proxySystem.createBrowser();

// Use dengan ProductScraper
const scraper = new ProductScraper({ browser });
```

## 📊 Monitoring Events

```javascript
// Listen untuk alerts
proxySystem.proxyMonitor.on('alert', (alert) => {
  console.log(`Alert: ${alert.message}`);
});

// Monitor proxy usage
proxySystem.proxyMonitor.on('proxyUsage', (data) => {
  console.log(`Proxy ${data.proxyId}: ${data.success ? 'OK' : 'Failed'}`);
});

// Health status changes
proxySystem.proxyMonitor.on('healthCheck', (health) => {
  console.log(`System health: ${health.status}`);
});
```

## 🛠️ Troubleshooting

### High Detection Rate
- Enable more aggressive anti-detection features
- Increase proxy rotation frequency
- Use more realistic human behavior patterns

### Proxy Failures
- Check proxy credentials dan connectivity
- Verify proxy provider status
- Adjust health check intervals

### Performance Issues
- Use performance-based load balancing
- Optimize resource blocking
- Reduce concurrent connections

## 📚 Documentation

- **[Complete Documentation](docs/ADVANCED_PROXY_SYSTEM.md)** - Dokumentasi lengkap
- **[Usage Examples](examples/advanced-proxy-usage.js)** - Contoh penggunaan
- **[API Reference](docs/API_REFERENCE.md)** - API documentation

## 🎯 Use Cases

- **E-commerce Scraping**: Shopee, Tokopedia, Amazon
- **Price Monitoring**: Real-time price tracking
- **Market Research**: Competitor analysis
- **Data Collection**: Large-scale data gathering
- **SEO Monitoring**: Search ranking tracking

## 🔒 Security & Compliance

- Respect robots.txt dan rate limits
- Use reasonable delays dan human-like behavior
- Monitor detection rates dan adjust accordingly
- Implement proper error handling dan logging

## 📄 License

MIT License - Lihat file LICENSE untuk detail lengkap.

---

**🚀 Ready to scrape without detection? Start dengan `npm run proxy:demo`!**
