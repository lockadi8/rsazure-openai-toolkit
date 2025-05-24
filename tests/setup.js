/**
 * Jest Setup File
 * Global test configuration dan utilities
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods untuk cleaner test output
const originalConsole = global.console;

// Suppress console output during tests (optional)
if (process.env.SUPPRESS_CONSOLE === 'true') {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  // Mock Shopee URLs
  mockUrls: {
    product: 'https://shopee.co.id/product/123456/789012',
    shop: 'https://shopee.co.id/shop/123456',
    category: 'https://shopee.co.id/category/123456',
    search: 'https://shopee.co.id/search?keyword=laptop',
  },

  // Mock product data
  mockProductData: {
    id: '789012',
    name: 'Test Product',
    price: 'Rp1.000.000',
    originalPrice: 'Rp1.200.000',
    discount: '17%',
    rating: '4.5',
    reviewCount: '100',
    stock: '50',
    sold: '200',
    shopName: 'Test Shop',
    shopLocation: 'Jakarta',
    shopRating: '4.8',
    images: [
      'https://cf.shopee.co.id/file/test1.jpg',
      'https://cf.shopee.co.id/file/test2.jpg',
    ],
    description: 'Test product description',
    specifications: {
      'Brand': 'Test Brand',
      'Model': 'Test Model',
    },
    variants: [
      { type: 'color', value: 'Red', price: null, stock: '10' },
      { type: 'size', value: 'L', price: null, stock: '20' },
    ],
    shipping: 'Free shipping',
    categories: ['Electronics', 'Computers', 'Laptops'],
  },

  // Mock cookies
  mockCookies: [
    {
      name: 'SPC_F',
      value: 'test_session_id',
      domain: '.shopee.co.id',
      path: '/',
      httpOnly: true,
      secure: true,
    },
    {
      name: 'SPC_U',
      value: 'test_user_id',
      domain: '.shopee.co.id',
      path: '/',
      httpOnly: true,
      secure: true,
    },
  ],

  // Mock proxy list
  mockProxies: [
    'http://proxy1.example.com:8080',
    'http://user:pass@proxy2.example.com:8080',
    'socks5://proxy3.example.com:1080',
  ],

  // Create mock page object
  createMockPage() {
    return {
      url: jest.fn().mockReturnValue('https://shopee.co.id'),
      goto: jest.fn().mockResolvedValue({}),
      waitForSelector: jest.fn().mockResolvedValue({}),
      waitForNavigation: jest.fn().mockResolvedValue({}),
      waitForTimeout: jest.fn().mockResolvedValue({}),
      waitForFunction: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue({}),
      $$: jest.fn().mockResolvedValue([]),
      click: jest.fn().mockResolvedValue({}),
      type: jest.fn().mockResolvedValue({}),
      hover: jest.fn().mockResolvedValue({}),
      setUserAgent: jest.fn().mockResolvedValue({}),
      setViewport: jest.fn().mockResolvedValue({}),
      setExtraHTTPHeaders: jest.fn().mockResolvedValue({}),
      emulateTimezone: jest.fn().mockResolvedValue({}),
      evaluateOnNewDocument: jest.fn().mockResolvedValue({}),
      setRequestInterception: jest.fn().mockResolvedValue({}),
      setCookie: jest.fn().mockResolvedValue({}),
      cookies: jest.fn().mockResolvedValue(global.testUtils.mockCookies),
      viewport: jest.fn().mockReturnValue({ width: 1920, height: 1080 }),
      close: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
    };
  },

  // Create mock browser object
  createMockBrowser() {
    return {
      newPage: jest.fn().mockResolvedValue(global.testUtils.createMockPage()),
      close: jest.fn().mockResolvedValue({}),
      pages: jest.fn().mockResolvedValue([]),
    };
  },

  // Create mock cluster object
  createMockCluster() {
    return {
      task: jest.fn().mockResolvedValue({}),
      queue: jest.fn().mockResolvedValue({}),
      idle: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
    };
  },

  // Delay utility for tests
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate random test data
  generateRandomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  },

  generateRandomNumber(min = 1, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // File system utilities for tests
  async createTempFile(content = '', extension = '.txt') {
    const fs = require('fs').promises;
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const fileName = `test_${this.generateRandomString()}_${Date.now()}${extension}`;
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, content);
    return filePath;
  },

  async deleteTempFile(filePath) {
    const fs = require('fs').promises;
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  },
};

// Global test hooks
beforeAll(async () => {
  // Global setup before all tests
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Setup before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Export test utilities
module.exports = global.testUtils;
