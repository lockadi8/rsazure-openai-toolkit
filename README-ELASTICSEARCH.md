# Elasticsearch Configuration - Sistem Scraper Shopee

## 🎯 Overview

Implementasi Elasticsearch yang comprehensive untuk sistem scraper Shopee dengan fitur:

- ✅ **Advanced Product Search** dengan filters dan aggregations
- ✅ **Order Analytics** dan reporting untuk business intelligence
- ✅ **Auto-complete** dan suggestions untuk UX yang optimal
- ✅ **Real-time Data Sync** dari MongoDB ke Elasticsearch
- ✅ **Comprehensive Logging** untuk monitoring dan debugging
- ✅ **Performance Optimization** dengan custom analyzers dan mappings

## 🏗️ Architecture

```
MongoDB (Primary) ──sync──► Elasticsearch (Search) ──visualize──► Kibana
    │                           │                                    │
    │                           │                                    │
    ▼                           ▼                                    ▼
Application ◄──────────► Search Service ◄──────────────► Analytics Dashboard
```

## 📦 Components

### 1. **Elasticsearch Service** (`src/services/elasticsearch.js`)
- Connection management dengan retry mechanism
- Index mappings yang optimized untuk search
- Bulk operations untuk performance
- Error handling dan logging

### 2. **Search Service** (`src/services/searchService.js`)
- Advanced product search dengan filters
- Auto-complete dan suggestions
- Similar products recommendation
- Trending products analysis
- Order analytics dan reporting

### 3. **Data Sync Service** (`src/services/dataSyncService.js`)
- Full sync dari MongoDB ke Elasticsearch
- Incremental sync untuk real-time updates
- Data validation dan integrity checks
- Automatic cleanup untuk old data

### 4. **Search Controller** (`src/controllers/searchController.js`)
- RESTful API endpoints untuk search operations
- Request validation dan error handling
- Search logging untuk analytics

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Copy environment variables
cp .env.example .env

# Edit Elasticsearch configuration
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=shopee
```

### 2. Start Services
```bash
# Start Elasticsearch dan Kibana
docker-compose up -d elasticsearch kibana

# Verify Elasticsearch is running
npm run es:health
```

### 3. Test Configuration
```bash
# Run comprehensive tests
npm run es:test

# Run performance tests
npm run es:test:performance
```

### 4. Initial Data Sync
```bash
# Full sync dari MongoDB
npm run es:sync:full

# Start auto-sync service
npm run es:sync
```

## 🔍 API Usage Examples

### Product Search
```bash
# Basic search
curl "http://localhost:3000/api/search/products?q=smartphone"

# Advanced search dengan filters
curl "http://localhost:3000/api/search/products?q=iphone&category=Electronics&priceMin=5000000&priceMax=15000000&rating=4&sort=popularityScore&includeAggregations=true"

# Autocomplete
curl "http://localhost:3000/api/search/autocomplete?q=iph"

# Similar products
curl "http://localhost:3000/api/search/similar/PRODUCT_ID"

# Trending products
curl "http://localhost:3000/api/search/trending?timeRange=7d&limit=20"
```

### Analytics
```bash
# Product analytics
curl "http://localhost:3000/api/search/analytics/products?timeRange=30d&category=Electronics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Order analytics
curl "http://localhost:3000/api/search/analytics/orders?timeRange=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Revenue trends
curl "http://localhost:3000/api/search/analytics/revenue?timeRange=90d&interval=day" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Data Management
```bash
# Manual sync
curl -X POST "http://localhost:3000/api/search/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type": "incremental"}'

# Sync status
curl "http://localhost:3000/api/search/sync/status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Health check
curl "http://localhost:3000/api/search/health" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Index Mappings

### Products Index
- **Optimized fields**: name (text + keyword + autocomplete), price, rating, category
- **Computed fields**: popularityScore, priceRange, discountPercentage
- **Custom analyzers**: Indonesian text processing, edge n-grams untuk autocomplete

### Orders Index
- **Transaction data**: orderId, productId, finalAmount, orderDate
- **Customer data**: location, age, gender, paymentMethod
- **Analytics fields**: untuk revenue dan behavior analysis

### Logs Index
- **Structured logging**: level, message, timestamp, service
- **Request tracking**: method, URL, duration, IP
- **Error tracking**: stack traces, metadata

## ⚡ Performance Features

### Search Optimization
- **Multi-field search** dengan boosting
- **Fuzzy matching** untuk typo tolerance
- **Aggregations** untuk faceted search
- **Pagination** dengan efficient scrolling

### Indexing Optimization
- **Bulk operations** dengan batching
- **Retry mechanism** dengan exponential backoff
- **Progress tracking** untuk large datasets
- **Memory management** untuk large imports

### Caching Strategy
- **Query result caching** di application level
- **Aggregation caching** untuk analytics
- **Auto-refresh** dengan configurable intervals

## 🔧 Configuration Options

### Elasticsearch Settings
```javascript
// config/index.js
elasticsearch: {
  node: 'http://localhost:9200',
  indexPrefix: 'shopee',
  maxRetries: 3,
  requestTimeout: 60000,
  sniffOnStart: true
}
```

### Index Settings
```javascript
// Per index configuration
settings: {
  number_of_shards: 2,
  number_of_replicas: 1,
  refresh_interval: '5s'
}
```

### Sync Settings
```javascript
// Auto-sync configuration
intervalMinutes: 30,        // Incremental sync interval
fullSyncHour: 2,           // Daily full sync time
batchSize: 1000,           // Documents per batch
retryAttempts: 3           // Retry failed operations
```

## 📈 Monitoring & Maintenance

### Health Monitoring
```bash
# Cluster health
curl http://localhost:9200/_cluster/health?pretty

# Index statistics
curl http://localhost:9200/shopee_products/_stats?pretty

# Application health
curl http://localhost:3000/api/search/health
```

### Performance Monitoring
- **Query performance**: Slow query logging
- **Index performance**: Indexing rate monitoring
- **Resource usage**: Memory dan CPU monitoring
- **Error tracking**: Failed operations logging

### Maintenance Tasks
- **Daily full sync** untuk data consistency
- **Weekly cleanup** untuk old logs
- **Monthly optimization** untuk index performance
- **Quarterly backup** untuk disaster recovery

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Failed**
   ```bash
   # Check Elasticsearch status
   docker-compose ps elasticsearch
   
   # Check logs
   docker-compose logs elasticsearch
   ```

2. **Sync Issues**
   ```bash
   # Check sync status
   curl http://localhost:3000/api/search/sync/status
   
   # Force full sync
   npm run es:sync:full
   ```

3. **Performance Issues**
   ```bash
   # Check index size
   curl http://localhost:9200/_cat/indices/shopee_*?v
   
   # Monitor query performance
   curl http://localhost:9200/shopee_products/_search?explain=true
   ```

### Debug Mode
```bash
# Enable debug logging
DEBUG=elasticsearch* npm start

# Run tests dengan verbose output
npm run es:test -- --verbose
```

## 🔐 Security Considerations

### Production Setup
- Enable X-Pack security
- Configure SSL/TLS
- Set up user authentication
- Implement role-based access control

### Data Protection
- Encrypt sensitive fields
- Regular security audits
- Monitor access logs
- Implement data retention policies

## 📚 Additional Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana User Guide](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Performance Tuning Guide](docs/elasticsearch-performance.md)
- [Security Best Practices](docs/elasticsearch-security.md)

## 🤝 Contributing

1. Test semua changes dengan `npm run es:test`
2. Update dokumentasi jika diperlukan
3. Follow coding standards dan best practices
4. Submit PR dengan detailed description

## 📄 License

MIT License - see LICENSE file for details
