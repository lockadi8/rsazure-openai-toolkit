/**
 * Advanced Proxy Rotation & Anti-Detection System
 * Contoh penggunaan lengkap dengan semua fitur
 */

const { AdvancedProxySystem } = require('../src/services/proxy');
const logger = require('../src/utils/logger');

async function demonstrateAdvancedProxySystem() {
  console.log('🚀 Starting Advanced Proxy System Demo...\n');

  // 1. Initialize Advanced Proxy System
  const proxySystem = new AdvancedProxySystem({
    // Proxy configuration
    proxy: {
      loadBalancing: 'performance', // round-robin, least-used, performance, random
      healthCheckInterval: 60000, // 1 minute for demo
      maxFailureRate: 0.3,
      geoTargeting: true
    },

    // Anti-detection configuration
    antiDetection: {
      enableCanvasFingerprinting: true,
      enableWebRTCProtection: true,
      enableFontBlocking: true,
      enableHardwareSpoof: true,
      enableMemorySpoof: true,
      enableTimezoneSpoof: true,
      enableLanguageSpoof: true,
      enablePluginSpoof: true
    },

    // Human behavior configuration
    humanBehavior: {
      typingSpeed: { min: 80, max: 120 },
      mouseSpeed: { min: 150, max: 250 },
      scrollSpeed: { min: 300, max: 600 },
      readingSpeed: { wordsPerMinute: 250, variationPercent: 25 }
    },

    // Monitoring configuration
    monitoring: {
      enabled: true,
      alertThresholds: {
        failureRate: 0.25,
        responseTime: 3000,
        detectionRate: 0.05,
        consecutiveFailures: 3
      },
      dashboard: {
        enabled: true,
        port: 3001
      }
    }
  });

  try {
    // 2. Add proxy providers (contoh konfigurasi)
    console.log('📡 Adding proxy providers...');
    
    // Bright Data provider example
    proxySystem.addProxyProvider('brightdata', {
      type: 'brightdata',
      endpoint: 'brd.superproxy.io:22225',
      auth: {
        username: 'brd-customer-hl_12345678-zone-static',
        password: 'your_password_here'
      },
      geolocations: ['US', 'UK', 'DE', 'FR', 'JP']
    });

    // Oxylabs provider example
    proxySystem.addProxyProvider('oxylabs', {
      type: 'oxylabs',
      endpoint: 'pr.oxylabs.io:7777',
      auth: {
        username: 'customer-username',
        password: 'your_password_here'
      },
      geolocations: ['US', 'UK', 'CA', 'AU']
    });

    // 3. Add individual proxies
    console.log('🌐 Adding individual proxies...');
    
    const proxies = [
      {
        host: '192.168.1.100',
        port: 8080,
        protocol: 'http',
        username: 'user1',
        password: 'pass1',
        geolocation: 'US',
        provider: 'custom'
      },
      {
        host: '192.168.1.101',
        port: 8080,
        protocol: 'http',
        username: 'user2',
        password: 'pass2',
        geolocation: 'UK',
        provider: 'custom'
      },
      // Add more proxies as needed
    ];

    proxySystem.addProxies(proxies);

    // 4. Start monitoring dashboard
    console.log('📊 Starting monitoring dashboard...');
    await proxySystem.startDashboard();
    console.log('Dashboard available at: http://localhost:3001\n');

    // 5. Demonstrate browser creation with anti-detection
    console.log('🌐 Creating browser with advanced anti-detection...');
    
    const { browser, profile, proxy } = await proxySystem.createBrowser({
      proxyOptions: {
        geolocation: 'US', // Request US proxy
        forceHealthy: true
      }
    });

    console.log(`✅ Browser created with profile:`);
    console.log(`   - User Agent: ${profile.userAgent.substring(0, 50)}...`);
    console.log(`   - Viewport: ${profile.viewport.width}x${profile.viewport.height}`);
    console.log(`   - Language: ${profile.language.lang}`);
    console.log(`   - Timezone: ${profile.timezone}`);
    console.log(`   - Hardware Concurrency: ${profile.hardwareConcurrency}`);
    console.log(`   - Proxy: ${proxy ? proxy.id : 'none'}\n`);

    // 6. Create page with human behavior
    console.log('📄 Creating page with human behavior simulation...');
    
    const { page } = await proxySystem.createPage(browser);

    // 7. Navigate with stealth and behavior simulation
    console.log('🔍 Navigating with stealth mode...');
    
    const testUrls = [
      'https://httpbin.org/ip',
      'https://httpbin.org/headers',
      'https://httpbin.org/user-agent'
    ];

    for (const url of testUrls) {
      try {
        console.log(`   Navigating to: ${url}`);
        
        await proxySystem.navigateWithStealth(page, url, {
          waitUntil: 'networkidle2',
          timeout: 30000,
          simulateReading: true
        });

        // Simulate human reading time
        await page.simulateReading();

        // Get page content
        const content = await page.evaluate(() => document.body.textContent);
        console.log(`   ✅ Success! Content length: ${content.length} characters`);

        // Simulate human scroll behavior
        await page.naturalScroll('down', 300);
        await page.navigationDelay();

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }

    // 8. Demonstrate form filling with human behavior
    console.log('\n📝 Demonstrating human-like form interaction...');
    
    await page.goto('https://httpbin.org/forms/post');
    
    // Fill form with human-like behavior
    await page.humanType('input[name="custname"]', 'John Doe', {
      simulateErrors: true,
      errorRate: 0.02
    });
    
    await page.humanType('input[name="custtel"]', '+1234567890');
    await page.humanType('input[name="custemail"]', 'john.doe@example.com');
    
    // Human-like clicking
    await page.humanClick('input[type="submit"]');
    
    console.log('   ✅ Form filled with human-like behavior');

    // 9. Show system status
    console.log('\n📊 System Status:');
    const status = proxySystem.getStatus();
    console.log(`   - Total Proxies: ${status.proxies.total}`);
    console.log(`   - Working Proxies: ${status.proxies.working}`);
    console.log(`   - Failed Proxies: ${status.proxies.failed}`);
    
    if (status.health) {
      console.log(`   - System Health: ${status.health.status.toUpperCase()}`);
      console.log(`   - Total Requests: ${status.health.metrics.totalRequests}`);
      console.log(`   - Global Failure Rate: ${(status.health.metrics.globalFailureRate * 100).toFixed(1)}%`);
      console.log(`   - Detection Rate: ${(status.health.metrics.globalDetectionRate * 100).toFixed(1)}%`);
    }

    // 10. Wait for monitoring data
    console.log('\n⏳ Collecting monitoring data for 30 seconds...');
    console.log('   Check the dashboard at http://localhost:3001 for real-time metrics');
    
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 11. Cleanup
    console.log('\n🧹 Cleaning up...');
    await browser.close();
    await proxySystem.stopDashboard();
    await proxySystem.destroy();

    console.log('\n✅ Demo completed successfully!');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    
    // Cleanup on error
    try {
      await proxySystem.stopDashboard();
      await proxySystem.destroy();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

// Advanced usage examples
async function advancedUsageExamples() {
  console.log('\n🔬 Advanced Usage Examples...\n');

  const proxySystem = new AdvancedProxySystem({
    monitoring: { enabled: false } // Disable monitoring for examples
  });

  try {
    // Example 1: Load proxies from file
    console.log('📁 Loading proxies from file...');
    // await proxySystem.loadProxiesFromFile('./proxies.txt');

    // Example 2: Custom browser profile
    console.log('🎭 Creating browser with custom profile...');
    
    const { browser } = await proxySystem.createBrowser();
    const { page } = await proxySystem.createPage(browser, {
      profile: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
        language: { lang: 'en-US,en;q=0.9', locale: 'en-US' },
        timezone: 'America/New_York'
      }
    });

    // Example 3: Advanced human behavior
    console.log('🤖 Advanced human behavior simulation...');
    
    await page.goto('https://example.com');
    
    // Simulate realistic user behavior
    await page.humanBehavior.randomMouseMovements(page, 5);
    await page.naturalScroll('down', 500, {
      steps: 8,
      pauseProbability: 0.4,
      pauseDuration: { min: 1000, max: 3000 }
    });
    
    // Simulate reading with eye tracking patterns
    await page.simulateReading();

    await browser.close();
    await proxySystem.destroy();

    console.log('✅ Advanced examples completed!');

  } catch (error) {
    console.error('❌ Advanced examples failed:', error);
    await proxySystem.destroy();
  }
}

// Run demonstrations
async function main() {
  try {
    await demonstrateAdvancedProxySystem();
    await advancedUsageExamples();
  } catch (error) {
    console.error('Main demo failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  demonstrateAdvancedProxySystem,
  advancedUsageExamples
};
