# Elasticsearch Configuration untuk Sistem Scraper Shopee

## Overview

Konfigurasi Elasticsearch yang comprehensive untuk sistem scraper Shopee dengan fitur:
- Advanced product search dengan filters
- Order analytics dan reporting  
- Auto-complete dan suggestions
- Real-time data sync dari MongoDB
- Comprehensive logging dan monitoring

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │  Elasticsearch  │    │     Kibana      │
│   (Primary DB)  │◄──►│   (Search DB)   │◄──►│   (Analytics)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────────────────────────────────────────────────────────┐
    │                Application Layer                            │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
    │  │ DataSync    │  │ SearchService│  │ Analytics   │        │
    │  │ Service     │  │             │  │ Service     │        │
    │  └─────────────┘  └─────────────┘  └─────────────┘        │
    └─────────────────────────────────────────────────────────────┘
```

## Indices Structure

### 1. Products Index (`shopee_products`)
**Optimized untuk product search dan filtering**

```json
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "refresh_interval": "5s",
    "analysis": {
      "analyzer": {
        "product_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "asciifolding", "stop", "snowball"]
        },
        "autocomplete_analyzer": {
          "type": "custom", 
          "tokenizer": "keyword",
          "filter": ["lowercase", "edge_ngram_filter"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "productId": { "type": "keyword" },
      "name": { 
        "type": "text",
        "analyzer": "product_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete_analyzer"
          }
        }
      },
      "price": { "type": "double" },
      "category": { "type": "keyword" },
      "rating": { "type": "float" },
      "popularityScore": { "type": "float" }
    }
  }
}
```

### 2. Orders Index (`shopee_orders`)
**Optimized untuk transaction analytics**

```json
{
  "mappings": {
    "properties": {
      "orderId": { "type": "keyword" },
      "productId": { "type": "keyword" },
      "finalAmount": { "type": "double" },
      "orderDate": { "type": "date" },
      "customerLocation": { "type": "keyword" },
      "paymentMethod": { "type": "keyword" }
    }
  }
}
```

### 3. Logs Index (`shopee_logs`)
**Untuk monitoring dan debugging**

### 4. Analytics Index (`shopee_analytics`)
**Untuk user behavior tracking**

## API Endpoints

### Search Operations

#### 1. Advanced Product Search
```http
GET /api/search/products?q=smartphone&category=Electronics&priceMin=100000&priceMax=500000&rating=4&sort=popularityScore&order=desc&page=1&limit=20
```

**Response:**
```json
{
  "query": "smartphone",
  "results": [...],
  "total": 1250,
  "aggregations": {
    "categories": [...],
    "brands": [...],
    "priceRanges": [...]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "pages": 63
  }
}
```

#### 2. Autocomplete
```http
GET /api/search/autocomplete?q=iphone&limit=10
```

#### 3. Similar Products
```http
GET /api/search/similar/PRODUCT_ID?limit=10
```

#### 4. Trending Products
```http
GET /api/search/trending?timeRange=7d&limit=20
```

### Analytics Operations

#### 1. Product Analytics
```http
GET /api/search/analytics/products?timeRange=30d&category=Electronics
```

#### 2. Order Analytics
```http
GET /api/search/analytics/orders?timeRange=30d&shopId=SHOP_ID
```

#### 3. Revenue Trends
```http
GET /api/search/analytics/revenue?timeRange=90d&interval=day
```

### Data Sync Operations

#### 1. Manual Sync
```http
POST /api/search/sync
{
  "type": "incremental",
  "force": false
}
```

#### 2. Sync Status
```http
GET /api/search/sync/status
```

## Setup Instructions

### 1. Environment Variables
```bash
# .env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=shopee
```

### 2. Docker Setup
```bash
# Start Elasticsearch dengan Docker Compose
docker-compose up -d elasticsearch kibana
```

### 3. Initialize Elasticsearch
```bash
# Test connection dan setup indices
node scripts/test-elasticsearch.js
```

### 4. Initial Data Sync
```bash
# Sync existing MongoDB data
curl -X POST http://localhost:3000/api/search/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

## Performance Optimization

### 1. Index Settings
- **Shards**: 2 shards untuk products index (optimal untuk dataset medium)
- **Replicas**: 1 replica untuk high availability
- **Refresh Interval**: 5s untuk balance antara real-time dan performance

### 2. Search Optimization
- **Multi-field mapping** untuk name field (text + keyword + autocomplete)
- **Custom analyzers** untuk Indonesian text processing
- **Computed fields** (popularityScore, priceRange) untuk faster sorting

### 3. Bulk Operations
- **Batch size**: 1000 documents per batch
- **Retry mechanism** dengan exponential backoff
- **Progress logging** untuk monitoring

## Monitoring & Maintenance

### 1. Health Checks
```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Check application health
curl http://localhost:3000/api/search/health
```

### 2. Index Management
```bash
# Check index stats
curl http://localhost:9200/shopee_products/_stats

# Refresh index
curl -X POST http://localhost:9200/shopee_products/_refresh
```

### 3. Data Validation
```bash
# Validate sync integrity
curl http://localhost:3000/api/search/sync/status
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if Elasticsearch is running
   - Verify ELASTICSEARCH_NODE URL
   - Check network connectivity

2. **Index Creation Failed**
   - Check Elasticsearch permissions
   - Verify disk space
   - Check cluster health

3. **Search Performance Issues**
   - Monitor query execution time
   - Check index size and shards
   - Optimize query structure

4. **Sync Issues**
   - Check MongoDB connection
   - Verify data format
   - Monitor sync logs

### Performance Monitoring

1. **Query Performance**
   ```bash
   # Enable slow query logging
   curl -X PUT "localhost:9200/shopee_products/_settings" \
     -H "Content-Type: application/json" \
     -d '{"index.search.slowlog.threshold.query.warn": "10s"}'
   ```

2. **Index Performance**
   ```bash
   # Monitor indexing rate
   curl "localhost:9200/_cat/indices/shopee_*?v&s=index"
   ```

## Security Considerations

1. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Limit access to Elasticsearch ports

2. **Authentication**
   - Enable X-Pack security (production)
   - Use API keys for service authentication
   - Implement role-based access control

3. **Data Protection**
   - Encrypt sensitive data
   - Regular backups
   - Monitor access logs

## Backup & Recovery

1. **Snapshot Configuration**
   ```bash
   # Create snapshot repository
   curl -X PUT "localhost:9200/_snapshot/backup_repo" \
     -H "Content-Type: application/json" \
     -d '{"type": "fs", "settings": {"location": "/backup"}}'
   ```

2. **Automated Backups**
   - Schedule daily snapshots
   - Retain snapshots for 30 days
   - Test restore procedures

## Next Steps

1. **Production Deployment**
   - Configure cluster with multiple nodes
   - Set up monitoring with Metricbeat
   - Implement alerting with Watcher

2. **Advanced Features**
   - Machine learning for product recommendations
   - Geo-search for location-based filtering
   - Real-time analytics dashboards

3. **Optimization**
   - Index lifecycle management (ILM)
   - Hot-warm architecture
   - Custom scoring algorithms
