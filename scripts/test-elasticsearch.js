#!/usr/bin/env node

const elasticsearchService = require('../src/services/elasticsearch');
const searchService = require('../src/services/searchService');
const dataSyncService = require('../src/services/dataSyncService');
const logger = require('../src/utils/logger');

class ElasticsearchTester {
  constructor() {
    this.testResults = {
      connection: false,
      indices: false,
      indexing: false,
      search: false,
      analytics: false,
      sync: false
    };
  }

  async runAllTests() {
    console.log('🔍 Starting Elasticsearch Tests...\n');

    try {
      await this.testConnection();
      await this.testIndices();
      await this.testIndexing();
      await this.testSearch();
      await this.testAnalytics();
      await this.testSync();

      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testConnection() {
    console.log('1. Testing Elasticsearch Connection...');
    
    try {
      await elasticsearchService.connect();
      const health = await elasticsearchService.ping();
      
      if (health) {
        console.log('✅ Connection successful');
        this.testResults.connection = true;
      } else {
        throw new Error('Ping failed');
      }
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      throw error;
    }
  }

  async testIndices() {
    console.log('\n2. Testing Index Creation...');
    
    try {
      const client = elasticsearchService.getClient();
      
      // Check if indices exist
      const indices = Object.values(elasticsearchService.indices);
      for (const index of indices) {
        const exists = await client.indices.exists({ index });
        if (exists.body) {
          console.log(`✅ Index exists: ${index}`);
        } else {
          console.log(`❌ Index missing: ${index}`);
          throw new Error(`Index ${index} not found`);
        }
      }
      
      this.testResults.indices = true;
    } catch (error) {
      console.log('❌ Index test failed:', error.message);
      throw error;
    }
  }

  async testIndexing() {
    console.log('\n3. Testing Document Indexing...');
    
    try {
      // Test product indexing
      const testProduct = {
        productId: 'test_product_' + Date.now(),
        name: 'Test Product for Elasticsearch',
        description: 'This is a test product for Elasticsearch testing',
        price: 99999,
        originalPrice: 149999,
        rating: 4.5,
        reviewCount: 100,
        soldCount: 50,
        category: 'Electronics',
        brand: 'TestBrand',
        shopName: 'Test Shop',
        shopId: 'test_shop_123',
        isActive: true,
        isAvailable: true,
        metadata: {
          scrapedAt: new Date(),
          lastUpdated: new Date(),
          source: 'test'
        }
      };

      const result = await elasticsearchService.indexDocument(
        elasticsearchService.indices.products,
        testProduct,
        testProduct.productId
      );

      if (result.body.result === 'created' || result.body.result === 'updated') {
        console.log('✅ Document indexing successful');
        this.testResults.indexing = true;
        
        // Clean up test document
        await elasticsearchService.deleteDocument(
          elasticsearchService.indices.products,
          testProduct.productId
        );
      } else {
        throw new Error('Indexing failed');
      }
    } catch (error) {
      console.log('❌ Indexing test failed:', error.message);
      throw error;
    }
  }

  async testSearch() {
    console.log('\n4. Testing Search Operations...');
    
    try {
      // Test basic search
      const searchResult = await searchService.searchProducts('test', {}, { size: 5 });
      console.log(`✅ Basic search successful (${searchResult.total} results)`);

      // Test autocomplete
      const autocompleteResult = await searchService.autocompleteProducts('test', 5);
      console.log(`✅ Autocomplete successful (${autocompleteResult.length} suggestions)`);

      // Test trending products
      const trendingResult = await searchService.getTrendingProducts('7d', 5);
      console.log(`✅ Trending products successful (${trendingResult.length} products)`);

      this.testResults.search = true;
    } catch (error) {
      console.log('❌ Search test failed:', error.message);
      throw error;
    }
  }

  async testAnalytics() {
    console.log('\n5. Testing Analytics Operations...');
    
    try {
      // Test product analytics
      const productAnalytics = await searchService.getProductAnalytics({}, '30d');
      console.log('✅ Product analytics successful');

      // Test search logging
      const searchLog = {
        searchId: 'test_search_' + Date.now(),
        query: 'test query',
        filters: { category: 'test' },
        resultsCount: 10,
        executedAt: new Date().toISOString(),
        status: 'success',
        userId: 'test_user'
      };

      await elasticsearchService.indexDocument(
        elasticsearchService.indices.searches,
        searchLog,
        searchLog.searchId
      );
      console.log('✅ Search logging successful');

      this.testResults.analytics = true;
    } catch (error) {
      console.log('❌ Analytics test failed:', error.message);
      throw error;
    }
  }

  async testSync() {
    console.log('\n6. Testing Data Sync Operations...');
    
    try {
      // Test sync status
      const syncStatus = dataSyncService.getSyncStatus();
      console.log('✅ Sync status check successful');

      // Test validation
      const validation = await dataSyncService.validateSync();
      console.log(`✅ Sync validation successful (Accuracy: ${validation.syncAccuracy})`);

      this.testResults.sync = true;
    } catch (error) {
      console.log('❌ Sync test failed:', error.message);
      throw error;
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const results = [
      { name: 'Connection', status: this.testResults.connection },
      { name: 'Indices', status: this.testResults.indices },
      { name: 'Indexing', status: this.testResults.indexing },
      { name: 'Search', status: this.testResults.search },
      { name: 'Analytics', status: this.testResults.analytics },
      { name: 'Sync', status: this.testResults.sync }
    ];

    results.forEach(result => {
      const icon = result.status ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status ? 'PASS' : 'FAIL'}`);
    });

    const passedTests = results.filter(r => r.status).length;
    const totalTests = results.length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Elasticsearch is ready to use.');
    } else {
      console.log('⚠️  Some tests failed. Please check the configuration.');
      process.exit(1);
    }
  }

  async testPerformance() {
    console.log('\n🚀 Running Performance Tests...');
    
    try {
      const testData = [];
      for (let i = 0; i < 100; i++) {
        testData.push({
          productId: `perf_test_${i}`,
          name: `Performance Test Product ${i}`,
          price: Math.random() * 1000000,
          category: ['Electronics', 'Fashion', 'Home', 'Sports'][Math.floor(Math.random() * 4)],
          rating: Math.random() * 5,
          soldCount: Math.floor(Math.random() * 1000),
          isActive: true
        });
      }

      // Test bulk indexing performance
      const startTime = Date.now();
      await elasticsearchService.bulkIndex(
        elasticsearchService.indices.products,
        testData,
        { batchSize: 50 }
      );
      const indexTime = Date.now() - startTime;
      
      console.log(`✅ Bulk indexing: ${testData.length} documents in ${indexTime}ms`);

      // Test search performance
      const searchStartTime = Date.now();
      await searchService.searchProducts('test', {}, { size: 20 });
      const searchTime = Date.now() - searchStartTime;
      
      console.log(`✅ Search performance: ${searchTime}ms`);

      // Cleanup
      const productIds = testData.map(p => p.productId);
      await elasticsearchService.bulkDelete(
        elasticsearchService.indices.products,
        productIds
      );
      
      console.log('✅ Performance test cleanup completed');
      
    } catch (error) {
      console.log('❌ Performance test failed:', error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ElasticsearchTester();
  
  const args = process.argv.slice(2);
  if (args.includes('--performance')) {
    tester.runAllTests()
      .then(() => tester.testPerformance())
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  } else {
    tester.runAllTests()
      .catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
      });
  }
}

module.exports = ElasticsearchTester;
