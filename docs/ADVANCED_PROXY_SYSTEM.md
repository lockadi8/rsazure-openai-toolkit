# 🚀 Advanced Proxy Rotation & Anti-Detection System

Sistem proxy rotation dan anti-detection yang comprehensive dengan monitoring real-time dan human behavior simulation.

## 📋 Fitur Utama

### 🌐 Advanced Proxy Manager
- **Multiple Provider Support**: Bright Data, Oxylabs, custom proxies
- **Intelligent Load Balancing**: Round-robin, least-used, performance-based, random
- **Geolocation Management**: Target specific countries/regions
- **Health Monitoring**: Automatic health checks dan failure detection
- **Auto-Recovery**: Automatic proxy rotation saat detection

### 🛡️ Comprehensive Anti-Detection
- **Canvas Fingerprint Randomization**: Mencegah canvas-based tracking
- **WebRTC Leak Protection**: Blokir WebRTC untuk mencegah IP leak
- **Font Enumeration Blocking**: Mencegah font-based fingerprinting
- **Hardware Spoofing**: CPU cores, memory info randomization
- **Browser Fingerprint Spoofing**: User agent, viewport, language, timezone
- **JavaScript Context Hiding**: Menghilangkan automation indicators

### 🤖 Human Behavior Simulation
- **Realistic Mouse Movement**: Bezier curve-based mouse simulation
- **Human-like Typing**: Variable speed, typos, corrections
- **Natural Scrolling**: Reading pauses, variable speed
- **Click Timing**: Pre-hover, realistic delays
- **Reading Time Simulation**: Based on content length
- **Navigation Delays**: Human-like page transitions

### 📊 Real-time Monitoring & Alerting
- **Performance Metrics**: Response time, success rate, detection rate
- **Real-time Dashboard**: Web-based monitoring interface
- **Smart Alerts**: Configurable thresholds dengan auto-remediation
- **Health Checks**: Continuous proxy health monitoring
- **Historical Data**: Trend analysis dan reporting

## 🏗️ Arsitektur Sistem

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

## 🚀 Quick Start

### 1. Basic Setup

```javascript
const { AdvancedProxySystem } = require('./src/services/proxy');

const proxySystem = new AdvancedProxySystem({
  proxy: {
    loadBalancing: 'performance',
    healthCheckInterval: 300000,
    maxFailureRate: 0.3
  },
  antiDetection: {
    enableCanvasFingerprinting: true,
    enableWebRTCProtection: true,
    enableFontBlocking: true
  },
  monitoring: {
    enabled: true,
    dashboard: { enabled: true, port: 3001 }
  }
});
```

### 2. Add Proxy Providers

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

// Custom proxies
proxySystem.addProxies([
  {
    host: '192.168.1.100',
    port: 8080,
    username: 'user1',
    password: 'pass1',
    geolocation: 'US'
  }
]);
```

### 3. Create Browser with Anti-Detection

```javascript
const { browser, profile, proxy } = await proxySystem.createBrowser({
  proxyOptions: {
    geolocation: 'US',
    forceHealthy: true
  }
});

const { page } = await proxySystem.createPage(browser);
```

### 4. Navigate with Stealth & Human Behavior

```javascript
await proxySystem.navigateWithStealth(page, 'https://example.com', {
  waitUntil: 'networkidle2',
  simulateReading: true
});

// Human-like interactions
await page.humanType('#search', 'search query');
await page.humanClick('#submit-btn');
await page.naturalScroll('down', 500);
await page.simulateReading();
```

### 5. Start Monitoring Dashboard

```javascript
await proxySystem.startDashboard();
console.log('Dashboard: http://localhost:3001');
```

## ⚙️ Konfigurasi Detail

### Proxy Configuration

```javascript
proxy: {
  loadBalancing: 'performance',        // round-robin, least-used, performance, random
  healthCheckInterval: 300000,         // Health check interval (ms)
  maxFailureRate: 0.3,                // Maximum failure rate (30%)
  geoTargeting: true,                 // Enable geolocation targeting
  testTimeout: 10000,                 // Proxy test timeout (ms)
  maxRetries: 3                       // Maximum retry attempts
}
```

### Anti-Detection Configuration

```javascript
antiDetection: {
  enableCanvasFingerprinting: true,    // Canvas fingerprint randomization
  enableWebRTCProtection: true,        // WebRTC leak protection
  enableFontBlocking: true,            // Font enumeration blocking
  enableHardwareSpoof: true,           // Hardware info spoofing
  enableMemorySpoof: true,             // Memory info spoofing
  enableTimezoneSpoof: true,           // Timezone spoofing
  enableLanguageSpoof: true,           // Language spoofing
  enablePluginSpoof: true              // Plugin spoofing
}
```

### Human Behavior Configuration

```javascript
humanBehavior: {
  typingSpeed: { min: 50, max: 150 },     // Typing speed range (ms)
  mouseSpeed: { min: 100, max: 300 },     // Mouse movement speed (ms)
  scrollSpeed: { min: 200, max: 800 },    // Scroll speed range (ms)
  readingSpeed: {
    wordsPerMinute: 200,                  // Reading speed
    variationPercent: 30                  // Speed variation (%)
  },
  navigationDelay: { min: 1000, max: 3000 } // Page navigation delay (ms)
}
```

### Monitoring Configuration

```javascript
monitoring: {
  enabled: true,
  alertThresholds: {
    failureRate: 0.3,                   // Alert if failure rate > 30%
    responseTime: 5000,                 // Alert if response time > 5s
    detectionRate: 0.1,                 // Alert if detection rate > 10%
    consecutiveFailures: 5              // Alert after 5 consecutive failures
  },
  monitoringInterval: 60000,            // Monitoring check interval (ms)
  dashboard: {
    enabled: true,
    port: 3001,                         // Dashboard port
    updateInterval: 5000                // Real-time update interval (ms)
  }
}
```

## 🔧 Advanced Usage

### Custom Browser Profiles

```javascript
const customProfile = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  viewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  language: { lang: 'en-US,en;q=0.9', locale: 'en-US' },
  timezone: 'America/New_York',
  hardwareConcurrency: 8,
  memoryInfo: {
    jsHeapSizeLimit: 4294705152,
    totalJSHeapSize: 1073741824,
    usedJSHeapSize: 536870912
  }
};

const { page } = await proxySystem.createPage(browser, { profile: customProfile });
```

### Advanced Human Behavior

```javascript
// Complex form filling
await page.humanType('#username', 'john_doe', {
  clearFirst: true,
  simulateErrors: true,
  errorRate: 0.02
});

// Natural scrolling with reading pauses
await page.naturalScroll('down', 800, {
  steps: 10,
  pauseProbability: 0.4,
  pauseDuration: { min: 1000, max: 3000 }
});

// Realistic mouse movements
await page.humanBehavior.randomMouseMovements(page, 5);

// Simulate reading time based on content
await page.simulateReading('#article-content');
```

### Monitoring Events

```javascript
proxySystem.proxyMonitor.on('alert', (alert) => {
  console.log(`Alert: ${alert.message}`);
  
  if (alert.severity === 'critical') {
    // Handle critical alerts
    handleCriticalAlert(alert);
  }
});

proxySystem.proxyMonitor.on('proxyUsage', (data) => {
  console.log(`Proxy ${data.proxyId}: ${data.success ? 'Success' : 'Failed'}`);
});
```

## 📊 Monitoring Dashboard

Dashboard web real-time tersedia di `http://localhost:3001` dengan fitur:

- **System Overview**: Total proxies, active proxies, global metrics
- **Proxy Status**: Individual proxy performance dan health
- **Real-time Alerts**: Active alerts dengan severity levels
- **Performance Charts**: Historical performance data
- **Auto-refresh**: Real-time updates setiap 5 detik

### Dashboard Features

- 🟢 **Healthy Status**: Semua sistem berjalan normal
- 🟡 **Degraded Status**: Performance menurun tapi masih functional
- 🔴 **Unhealthy Status**: Sistem memerlukan perhatian segera
- 🚨 **Real-time Alerts**: Warning dan critical alerts
- 📈 **Performance Metrics**: Response time, success rate, detection rate

## 🛠️ Troubleshooting

### Common Issues

1. **High Detection Rate**
   - Enable more aggressive anti-detection features
   - Rotate proxies lebih sering
   - Increase human behavior simulation

2. **Proxy Failures**
   - Check proxy credentials dan connectivity
   - Verify proxy provider status
   - Adjust health check intervals

3. **Performance Issues**
   - Optimize resource blocking
   - Reduce concurrent connections
   - Use performance-based load balancing

### Debug Mode

```javascript
const proxySystem = new AdvancedProxySystem({
  debug: true,
  monitoring: {
    enabled: true,
    alertThresholds: {
      failureRate: 0.1,  // More sensitive for debugging
      detectionRate: 0.05
    }
  }
});
```

## 📝 Best Practices

1. **Proxy Management**
   - Use multiple proxy providers untuk redundancy
   - Monitor proxy health secara regular
   - Rotate proxies berdasarkan performance

2. **Anti-Detection**
   - Enable semua anti-detection features
   - Use realistic browser profiles
   - Vary behavior patterns

3. **Human Behavior**
   - Simulate realistic reading times
   - Use variable delays dan speeds
   - Include random mouse movements

4. **Monitoring**
   - Set appropriate alert thresholds
   - Monitor dashboard regularly
   - Implement auto-remediation untuk critical alerts

## 🔗 Integration Examples

Lihat file `examples/advanced-proxy-usage.js` untuk contoh penggunaan lengkap dan integration dengan scraper system yang sudah ada.

## 📄 License

MIT License - Lihat file LICENSE untuk detail lengkap.
