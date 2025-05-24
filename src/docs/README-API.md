# Shopee Scraper REST API Documentation

## 🚀 Overview

Comprehensive REST API for Shopee scraping system with advanced features including authentication, rate limiting, data analytics, and real-time monitoring.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Examples](#examples)
- [SDKs & Tools](#sdks--tools)

## 🏃‍♂️ Quick Start

### 1. Start the Server

```bash
npm start
```

### 2. Access API Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **Postman Collection**: Import `src/docs/postman-collection.json`
- **API Examples**: See `src/docs/api-examples.md`

### 3. Health Check

```bash
curl http://localhost:3000/health
```

## 🔐 Authentication

### JWT Token Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### API Key Authentication

Alternative authentication method using API keys:

```bash
X-API-Key: YOUR_API_KEY
```

### Getting Started

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
3. **Use Token**: Include in Authorization header

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | ❌ |
| POST | `/login` | User login | ❌ |
| POST | `/refresh` | Refresh JWT token | ❌ |
| GET | `/me` | Get user profile | ✅ |
| POST | `/logout` | User logout | ✅ |
| POST | `/change-password` | Change password | ✅ |
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password` | Reset password | ❌ |

### Products (`/api/products`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get products with filters | ✅ |
| GET | `/:id` | Get product by ID | ✅ |
| GET | `/:id/price-history` | Get price history | ✅ |
| GET | `/:id/similar` | Get similar products | ✅ |
| GET | `/category/:category` | Get products by category | ✅ |
| GET | `/shop/:shopId` | Get products by shop | ✅ |
| GET | `/top/rated` | Get top rated products | ✅ |
| GET | `/top/bestsellers` | Get best selling products | ✅ |
| POST | `/search/advanced` | Advanced search | ✅ |
| POST | `/compare` | Compare products | ✅ |

### Shopee Accounts (`/api/accounts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get all accounts | ✅ |
| POST | `/` | Add new account | ✅ |
| GET | `/:id` | Get account by ID | ✅ |
| PUT | `/:id` | Update account settings | ✅ |
| DELETE | `/:id` | Delete account | ✅ |
| POST | `/:id/verify` | Verify account credentials | ✅ |
| POST | `/:id/sync` | Trigger manual sync | ✅ |
| GET | `/:id/sync/status` | Get sync status | ✅ |
| GET | `/:id/stats` | Get account statistics | ✅ |

### Orders (`/api/orders`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Get orders with filters | ✅ |
| GET | `/:id` | Get order by ID | ✅ |
| GET | `/analytics/summary` | Get order analytics | ✅ |
| GET | `/export/data` | Export orders data | ✅ |

### Scraper (`/api/scraper`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/search` | Search and scrape products | ✅ |
| POST | `/product` | Scrape single product | ✅ |
| POST | `/products/bulk` | Scrape multiple products | ✅ |
| POST | `/shop` | Scrape shop products | ✅ |
| POST | `/category` | Scrape category products | ✅ |
| GET | `/jobs/:jobId` | Get scraping job status | ✅ |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/dashboard` | Dashboard overview | ✅ |
| GET | `/products` | Product analytics | ✅ |
| GET | `/scraping` | Scraping analytics | ✅ |
| GET | `/users` | User analytics | ✅ |
| GET | `/system/health` | System health | ✅ |
| GET | `/system/performance` | System performance | ✅ |
| GET | `/export/products` | Export product analytics | ✅ |
| GET | `/export/scraping` | Export scraping analytics | ✅ |

### Admin (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/system/status` | System status | ✅ (Admin) |
| GET | `/system/health` | System health check | ✅ (Admin) |
| GET | `/system/metrics` | System metrics | ✅ (Admin) |
| POST | `/system/restart` | Restart system | ✅ (Admin) |
| GET | `/users` | Get all users | ✅ (Admin) |
| GET | `/users/:id` | Get user by ID | ✅ (Admin) |
| PUT | `/users/:id` | Update user | ✅ (Admin) |
| DELETE | `/users/:id` | Delete user | ✅ (Admin) |
| POST | `/users/:id/activate` | Activate user | ✅ (Admin) |
| POST | `/users/:id/deactivate` | Deactivate user | ✅ (Admin) |
| GET | `/products/stats` | Product statistics | ✅ (Admin) |
| POST | `/products/cleanup` | Cleanup products | ✅ (Admin) |

### Search (`/api/search`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Search products | ❌ |
| GET | `/autocomplete` | Product autocomplete | ❌ |
| GET | `/suggestions` | Search suggestions | ❌ |
| POST | `/sync` | Sync search index | ✅ (Admin) |

## ⚡ Rate Limiting

Different endpoints have different rate limits:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| General API | 1000 requests | 15 minutes |
| Authentication | 10 requests | 15 minutes |
| Scraper | 50 requests | 1 hour |
| Admin | 100 requests | 15 minutes |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## 🚨 Error Handling

### Standard Error Response

```json
{
  "error": "Error Type",
  "message": "Human readable error message",
  "details": [
    {
      "field": "fieldName",
      "message": "Field specific error",
      "value": "invalid_value"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## 🔒 Security Features

### Input Validation
- **Joi Schema Validation**: Comprehensive input validation
- **XSS Protection**: HTML sanitization and XSS filtering
- **NoSQL Injection Protection**: MongoDB injection prevention
- **Parameter Pollution Protection**: HTTP parameter pollution prevention

### Security Headers
- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting per IP/user
- **Input Size Limiting**: Request size limitations

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication
- **Refresh Tokens**: Token refresh mechanism
- **Role-based Access**: User role-based permissions
- **API Keys**: Alternative authentication method

## 📝 Examples

### Basic Authentication Flow

```javascript
// 1. Register
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});

// 2. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePass123!'
  })
});

const { tokens } = await loginResponse.json();

// 3. Use token for authenticated requests
const productsResponse = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`
  }
});
```

### Product Search

```javascript
const searchParams = new URLSearchParams({
  q: 'laptop gaming',
  category: 'Electronics',
  priceMin: '5000000',
  priceMax: '15000000',
  sort: 'price',
  order: 'asc',
  page: '1',
  limit: '20'
});

const response = await fetch(`/api/products?${searchParams}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { products, pagination } = await response.json();
```

### Start Scraping Job

```javascript
const scrapingResponse = await fetch('/api/scraper/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'smartphone',
    maxPages: 5,
    filters: {
      category: 'Electronics',
      priceMin: 1000000,
      priceMax: 10000000
    }
  })
});

const { jobId } = await scrapingResponse.json();

// Check job status
const statusResponse = await fetch(`/api/scraper/jobs/${jobId}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## 🛠️ SDKs & Tools

### Postman Collection
Import the Postman collection from `src/docs/postman-collection.json` for easy API testing.

### Swagger/OpenAPI
Interactive API documentation available at `/api-docs` when the server is running.

### cURL Examples
Comprehensive cURL examples available in `src/docs/api-examples.md`.

### JavaScript SDK
```javascript
const ShopeeScraperAPI = require('./sdk/javascript');

const api = new ShopeeScraperAPI({
  baseURL: 'http://localhost:3000/api',
  apiKey: 'your-api-key' // or use JWT tokens
});

// Login
await api.auth.login('email@example.com', 'password');

// Search products
const products = await api.products.search('laptop', {
  category: 'Electronics',
  priceRange: [1000000, 5000000]
});

// Start scraping
const job = await api.scraper.search('gaming laptop', {
  maxPages: 3
});
```

### Python SDK
```python
from shopee_scraper_api import ShopeeScraperAPI

api = ShopeeScraperAPI(
    base_url='http://localhost:3000/api',
    api_key='your-api-key'
)

# Login
api.auth.login('email@example.com', 'password')

# Search products
products = api.products.search('laptop', 
    category='Electronics',
    price_range=(1000000, 5000000)
)

# Start scraping
job = api.scraper.search('gaming laptop', max_pages=3)
```

## 📊 Monitoring & Analytics

### Health Monitoring
- **Health Check**: `/health` endpoint for service health
- **System Metrics**: Real-time system performance metrics
- **Database Health**: MongoDB, Redis, Elasticsearch status
- **Queue Health**: Background job queue monitoring

### Analytics Dashboard
- **Product Analytics**: Product trends, categories, pricing
- **Scraping Analytics**: Job performance, success rates, errors
- **User Analytics**: User activity, registration trends
- **System Analytics**: Performance metrics, error rates

### Logging
- **Structured Logging**: JSON formatted logs with Winston
- **Log Levels**: Error, Warn, Info, Debug
- **Log Rotation**: Daily log rotation with retention
- **Security Logging**: Authentication attempts, rate limits

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
HOST=localhost
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/shopee_scraper
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Scraping
SCRAPER_CONCURRENT_LIMIT=5
SCRAPER_DELAY_MIN=1000
SCRAPER_DELAY_MAX=3000
```

### API Configuration
```javascript
// config/api.js
module.exports = {
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },
  validation: {
    strictMode: true,
    sanitizeInput: true
  },
  security: {
    enableHelmet: true,
    enableCors: true,
    enableRateLimit: true
  }
};
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f api
```

### Production Considerations
- **Environment Variables**: Set production environment variables
- **SSL/TLS**: Enable HTTPS in production
- **Load Balancing**: Use load balancer for high availability
- **Monitoring**: Set up monitoring and alerting
- **Backup**: Regular database backups
- **Security**: Regular security updates and audits

## 📞 Support

### Documentation
- **API Examples**: `src/docs/api-examples.md`
- **Swagger UI**: http://localhost:3000/api-docs
- **Postman Collection**: `src/docs/postman-collection.json`

### Issues & Support
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: support@example.com
- **Documentation**: Comprehensive API documentation

### Contributing
- **Code Style**: Follow ESLint configuration
- **Testing**: Write tests for new features
- **Documentation**: Update documentation for changes
- **Pull Requests**: Submit PRs for review
