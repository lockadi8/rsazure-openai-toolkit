# API Usage Examples

This document provides comprehensive examples of how to use the Shopee Scraper API.

## Table of Contents

1. [Authentication](#authentication)
2. [Product Management](#product-management)
3. [Shopee Account Management](#shopee-account-management)
4. [Order Management](#order-management)
5. [Scraping Operations](#scraping-operations)
6. [Analytics](#analytics)
7. [Admin Functions](#admin-functions)
8. [Error Handling](#error-handling)

## Authentication

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_123",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "isEmailVerified": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Product Management

### Search Products with Filters

```bash
curl -X GET "http://localhost:3000/api/products?q=laptop&category=Electronics&priceMin=5000000&priceMax=15000000&sort=price&order=asc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": "Gaming Laptop ASUS ROG",
      "price": 12500000,
      "originalPrice": 15000000,
      "discount": 16.67,
      "rating": 4.5,
      "reviewCount": 1250,
      "soldCount": 500,
      "category": "Electronics",
      "brand": "ASUS",
      "shopName": "ASUS Official Store",
      "images": ["https://example.com/image1.jpg"],
      "url": "https://shopee.co.id/product/123/456"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Get Product Details

```bash
curl -X GET http://localhost:3000/api/products/prod_123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Product Price History

```bash
curl -X GET http://localhost:3000/api/products/prod_123/price-history \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Shopee Account Management

### Add Shopee Account

```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "my_shopee_account",
    "email": "shopee@example.com",
    "password": "shopee_password"
  }'
```

### Get All Accounts

```bash
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Account Settings

```bash
curl -X PUT http://localhost:3000/api/accounts/acc_123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "autoSync": true,
      "syncInterval": 3600,
      "notifications": true,
      "categories": ["Electronics", "Fashion"],
      "priceRange": {
        "min": 0,
        "max": 10000000
      }
    }
  }'
```

### Sync Account Data

```bash
curl -X POST http://localhost:3000/api/accounts/acc_123/sync \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "force": false
  }'
```

### Get Account Statistics

```bash
curl -X GET "http://localhost:3000/api/accounts/acc_123/stats?timeRange=30d" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Order Management

### Get Orders with Filters

```bash
curl -X GET "http://localhost:3000/api/orders?status=completed&startDate=2024-01-01&endDate=2024-03-31&minAmount=100000&sort=orderDate&order=desc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Order Details

```bash
curl -X GET http://localhost:3000/api/orders/order_123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Order Analytics

```bash
curl -X GET "http://localhost:3000/api/orders/analytics/summary?startDate=2024-01-01&endDate=2024-03-31&groupBy=day" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Export Orders Data

```bash
# Export as JSON
curl -X GET "http://localhost:3000/api/orders/export/data?format=json&startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Export as CSV
curl -X GET "http://localhost:3000/api/orders/export/data?format=csv&startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o orders_export.csv
```

## Scraping Operations

### Search and Scrape Products

```bash
curl -X POST http://localhost:3000/api/scraper/search \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "laptop gaming",
    "maxPages": 3,
    "filters": {
      "category": "Electronics",
      "priceMin": 5000000,
      "priceMax": 15000000,
      "rating": 4.0
    }
  }'
```

**Response:**
```json
{
  "message": "Scraping job started successfully",
  "jobId": "job_1234567890",
  "status": "queued",
  "estimatedDuration": "5-10 minutes",
  "query": "laptop gaming",
  "maxPages": 3
}
```

### Scrape Single Product

```bash
curl -X POST http://localhost:3000/api/scraper/product \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://shopee.co.id/product/123456789/987654321",
    "options": {
      "includeReviews": true,
      "includeVariants": true,
      "includeShopInfo": true
    }
  }'
```

### Scrape Multiple Products

```bash
curl -X POST http://localhost:3000/api/scraper/products/bulk \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://shopee.co.id/product/123/456",
      "https://shopee.co.id/product/789/012",
      "https://shopee.co.id/product/345/678"
    ],
    "options": {
      "includeReviews": false,
      "includeVariants": true,
      "includeShopInfo": true,
      "concurrent": 3
    }
  }'
```

### Get Job Status

```bash
curl -X GET http://localhost:3000/api/scraper/jobs/job_1234567890 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "job": {
    "id": "job_1234567890",
    "status": "running",
    "progress": 65,
    "startedAt": "2024-03-15T10:30:00Z",
    "estimatedCompletion": "2024-03-15T10:40:00Z",
    "results": {
      "processed": 65,
      "successful": 62,
      "failed": 3,
      "total": 100
    }
  }
}
```

## Analytics

### Dashboard Overview

```bash
curl -X GET "http://localhost:3000/api/analytics/dashboard?timeRange=30d" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Product Analytics

```bash
curl -X GET "http://localhost:3000/api/analytics/products?startDate=2024-01-01&endDate=2024-03-31&groupBy=day&category=Electronics" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Scraping Analytics

```bash
curl -X GET "http://localhost:3000/api/analytics/scraping?startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### System Health

```bash
curl -X GET http://localhost:3000/api/analytics/system/health \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Admin Functions

### Get System Status

```bash
curl -X GET http://localhost:3000/api/admin/system/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get All Users

```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&limit=20&role=user&status=active" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update User

```bash
curl -X PUT http://localhost:3000/api/admin/users/user_123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "moderator",
    "isActive": true
  }'
```

### Product Statistics

```bash
curl -X GET http://localhost:3000/api/admin/products/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Cleanup Products

```bash
curl -X POST http://localhost:3000/api/admin/products/cleanup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "removeInactive": true,
    "removeDuplicates": true
  }'
```

## Error Handling

### Common Error Responses

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "message": "The provided data is invalid",
  "details": [
    {
      "field": "email",
      "message": "Please provide a valid email address",
      "value": "invalid-email"
    }
  ]
}
```

#### Unauthorized (401)
```json
{
  "error": "Access denied",
  "message": "No token provided or token is invalid"
}
```

#### Forbidden (403)
```json
{
  "error": "Insufficient permissions",
  "message": "Admin role required for this operation"
}
```

#### Rate Limit Exceeded (429)
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": "15 minutes"
}
```

#### Server Error (500)
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong on our end"
}
```

## JavaScript/Node.js Examples

### Using Axios

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login and set token
async function login(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken } = response.data.tokens;
    
    // Set token for future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response.data);
    throw error;
  }
}

// Search products
async function searchProducts(query, filters = {}) {
  try {
    const response = await api.get('/products', {
      params: { q: query, ...filters }
    });
    return response.data;
  } catch (error) {
    console.error('Search failed:', error.response.data);
    throw error;
  }
}

// Start scraping job
async function startScraping(query, options = {}) {
  try {
    const response = await api.post('/scraper/search', {
      query,
      maxPages: options.maxPages || 5,
      filters: options.filters || {}
    });
    return response.data;
  } catch (error) {
    console.error('Scraping failed:', error.response.data);
    throw error;
  }
}

// Usage example
async function main() {
  try {
    // Login
    await login('user@example.com', 'password');
    
    // Search products
    const products = await searchProducts('laptop', {
      category: 'Electronics',
      priceMin: 5000000,
      priceMax: 15000000
    });
    
    console.log('Found products:', products.products.length);
    
    // Start scraping
    const job = await startScraping('gaming laptop', {
      maxPages: 3,
      filters: { category: 'Electronics' }
    });
    
    console.log('Scraping job started:', job.jobId);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

## Python Examples

### Using Requests

```python
import requests
import json

class ShopeeScraperAPI:
    def __init__(self, base_url='http://localhost:3000/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
    
    def login(self, email, password):
        response = self.session.post(f'{self.base_url}/auth/login', 
                                   json={'email': email, 'password': password})
        response.raise_for_status()
        
        data = response.json()
        token = data['tokens']['accessToken']
        self.session.headers.update({'Authorization': f'Bearer {token}'})
        
        return data
    
    def search_products(self, query, **filters):
        params = {'q': query, **filters}
        response = self.session.get(f'{self.base_url}/products', params=params)
        response.raise_for_status()
        return response.json()
    
    def start_scraping(self, query, max_pages=5, filters=None):
        data = {
            'query': query,
            'maxPages': max_pages,
            'filters': filters or {}
        }
        response = self.session.post(f'{self.base_url}/scraper/search', json=data)
        response.raise_for_status()
        return response.json()

# Usage
api = ShopeeScraperAPI()

# Login
api.login('user@example.com', 'password')

# Search products
products = api.search_products('laptop', category='Electronics', priceMin=5000000)
print(f"Found {len(products['products'])} products")

# Start scraping
job = api.start_scraping('gaming laptop', max_pages=3, 
                        filters={'category': 'Electronics'})
print(f"Scraping job started: {job['jobId']}")
```
