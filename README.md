# 🛒 Shopee Scraper System

[![Security Status](https://img.shields.io/badge/security-0%20vulnerabilities-brightgreen)](https://github.com/lockadi8/shopee-scraper-system)
[![Dependencies](https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen)](https://github.com/lockadi8/shopee-scraper-system)
[![Node.js](https://img.shields.io/badge/node.js-18%2B-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Sistem scraper Shopee profesional dengan arsitektur modular yang dibangun
menggunakan Node.js, MongoDB, Redis, dan Elasticsearch.**

## 🚀 **LATEST UPDATE - SECURITY PATCH**

✅ **All 15 security vulnerabilities FIXED** ✅ **Dependencies updated to latest
secure versions** ✅ **Production-ready with zero known vulnerabilities** ✅
**Enhanced error handling and fallback mechanisms**

## 🚀 Fitur Utama

- **Scraping Otomatis**: Scraping produk, toko, dan kategori Shopee secara
  otomatis
- **Queue System**: Sistem antrian dengan BullMQ untuk mengelola job scraping
- **Real-time Updates**: WebSocket untuk update real-time status scraping
- **Search & Analytics**: Pencarian canggih dengan Elasticsearch dan analytics
- **API Management**: RESTful API dengan rate limiting dan authentication
- **Dashboard**: Frontend React untuk monitoring dan management
- **Monitoring**: Prometheus + Grafana untuk monitoring sistem
- **Scalable**: Arsitektur modular yang mudah di-scale

## 🏗️ Arsitektur Sistem

```
├── src/                    # Source code utama
│   ├── controllers/        # API controllers
│   ├── models/            # Database models (Mongoose)
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   ├── workers/           # Background workers
│   └── index.js           # Entry point aplikasi
├── config/                # Konfigurasi aplikasi
├── frontend/              # React dashboard
├── docs/                  # Dokumentasi
├── tests/                 # Unit tests
├── logs/                  # Log files
└── uploads/               # File uploads
```

## 🛠️ Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database utama
- **Mongoose** - ODM untuk MongoDB
- **Redis** - Caching dan session storage
- **BullMQ** - Queue management
- **Elasticsearch** - Search engine dan analytics

### Scraping

- **Puppeteer** - Browser automation
- **Puppeteer Cluster** - Parallel scraping
- **Cheerio** - HTML parsing
- **Axios** - HTTP client

### Monitoring & Security

- **Winston** - Logging
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboard
- **JWT** - Authentication
- **Helmet** - Security headers
- **Rate Limiting** - API protection

### Frontend

- **React** - UI framework
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Socket.IO** - Real-time communication
- **Chart.js** - Data visualization

## 📋 Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- Git

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd shopee-scraper-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
cp .env.example .env
# Edit .env file dengan konfigurasi yang sesuai
```

### 4. Start Infrastructure Services

```bash
npm run docker:up
```

Ini akan menjalankan:

- MongoDB (port 27017)
- Redis (port 6379)
- Elasticsearch (port 9200)
- Kibana (port 5601)
- Prometheus (port 9090)
- Grafana (port 3001)
- Redis Commander (port 8081)
- Mongo Express (port 8082)

### 5. Start Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 6. Start Workers

```bash
# Di terminal terpisah
npm run worker
```

## 🔧 Konfigurasi

### Environment Variables

Salin `.env.example` ke `.env` dan sesuaikan konfigurasi:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/shopee_scraper?authSource=admin
REDIS_HOST=localhost
ELASTICSEARCH_NODE=http://localhost:9200

# Security
JWT_SECRET=your-super-secret-jwt-key
BCRYPT_ROUNDS=12

# Scraping
SCRAPER_CONCURRENT_LIMIT=5
SCRAPER_DELAY_MIN=1000
SCRAPER_DELAY_MAX=3000
```

### Docker Services

Services yang tersedia:

- **MongoDB**: Database utama dengan Mongo Express UI
- **Redis**: Cache dan queue dengan Redis Commander UI
- **Elasticsearch**: Search engine dengan Kibana UI
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboard (admin/admin123)

## 📚 API Documentation

### Authentication

```bash
# Register
POST /api/auth/register
{
  "username": "user123",
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "Password123"
}
```

### Scraping

```bash
# Search products
POST /api/scraper/search
{
  "query": "laptop gaming",
  "maxPages": 5,
  "filters": {
    "priceMin": 5000000,
    "priceMax": 15000000,
    "category": "Elektronik"
  }
}

# Scrape single product
POST /api/scraper/product
{
  "url": "https://shopee.co.id/product/123456789"
}

# Get job status
GET /api/scraper/jobs/:jobId
```

### Products

```bash
# Get products with filters
GET /api/products?q=laptop&category=Elektronik&priceMin=5000000&sort=price&order=asc

# Get product details
GET /api/products/:productId

# Get price history
GET /api/products/:productId/price-history
```

## 🔍 Monitoring

### Health Check

```bash
GET /health
```

### Metrics

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)

### Database UIs

- **Mongo Express**: http://localhost:8082 (admin/admin123)
- **Redis Commander**: http://localhost:8081
- **Kibana**: http://localhost:5601

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 Scripts

```bash
# Development
npm run dev              # Start dengan nodemon
npm run worker           # Start background workers
npm run scheduler        # Start job scheduler

# Production
npm start               # Start aplikasi
npm run docker:up       # Start Docker services
npm run docker:down     # Stop Docker services

# Database
npm run migrate         # Run database migrations
npm run seed           # Seed database dengan data sample

# Maintenance
npm run lint           # Check code style
npm run lint:fix       # Fix code style issues
```

## 🔒 Security Features

- **JWT Authentication** dengan refresh tokens
- **Rate Limiting** per endpoint dan user
- **API Key** untuk external access
- **Input Validation** dengan express-validator
- **Security Headers** dengan Helmet
- **Password Hashing** dengan bcrypt
- **CORS Protection**

## 📊 Performance

- **Concurrent Scraping** dengan Puppeteer Cluster
- **Redis Caching** untuk data yang sering diakses
- **Database Indexing** untuk query optimization
- **Queue System** untuk background processing
- **Connection Pooling** untuk database connections

## 🚀 Deployment

### Docker Production

```bash
# Build production image
docker build -t shopee-scraper .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Install dependencies
npm ci --only=production

# Build frontend
cd frontend && npm run build

# Start with PM2
pm2 start ecosystem.config.js
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/your-repo/discussions)

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**⚠️ Disclaimer**: Sistem ini dibuat untuk tujuan edukasi dan penelitian.
Pastikan untuk mematuhi Terms of Service Shopee dan robots.txt saat menggunakan
scraper ini.
# shopee-scraper-system
