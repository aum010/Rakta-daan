# Deployment Guide

## Prerequisites

- Node.js 20+ and pnpm installed
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

## Quick Start (Docker)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Manual Installation

### 1. Database Setup

```bash
# Create database
createdb rakta_daan
createuser -s rakta

# Or use Docker
docker run --name postgres -e POSTGRES_PASSWORD=rakta -e POSTGRES_DB=rakta_daan -p 5432:5432 -d postgres:16-alpine
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Run Migrations

```bash
# From the apps/api directory
cd apps/api
npx prisma migrate deploy
npx prisma generate
```

### 4. Build and Run

```bash
# API Backend
cd apps/api
pnpm build
pnpm start:prod

# Frontend (in a separate terminal)
cd apps/web
pnpm build
pnpm start:prod
```

## Production Deployment

### Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secure random string (32+ chars) |
| `JWT_REFRESH_SECRET` | Secure random string (32+ chars) |
| `OTP_PEPPER` | Secure random string (32+ chars) |
| `API_URL` | Your API domain (e.g., https://api.example.com) |
| `WEB_URL` | Your web domain (e.g., https://example.com) |
| `SMS_PROVIDER` | "sparrow" for production |
| `SPARROW_TOKEN` | Sparrow SMS API token |
| `SPARROW_FROM` | Sender ID (max 11 chars) |

### Security Checklist

- [ ] Use production-grade secrets (JWT_SECRET, JWT_REFRESH_SECRET, OTP_PEPPER)
- [ ] Set `DEV_EXPOSE_OTP=false`
- [ ] Set `NODE_ENV=production`
- [ ] Update CORS_ORIGINS with your production domains
- [ ] Configure HTTPS (use a reverse proxy like Nginx or Cloudflare)
- [ ] Set up monitoring (Sentry DSN)
- [ ] Configure log rotation
- [ ] Enable database SSL connections

### Docker Production Build

```bash
# Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Monitoring

### Health Check

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Logs

```bash
# API logs
docker-compose logs api

# Frontend logs
docker-compose logs web

# PostgreSQL logs
docker-compose logs postgres
```

## Database Backups

```bash
# Backup database
docker exec rakta-daan-postgres pg_dump -U rakta rakta_daan > backup.sql

# Restore database
docker exec -i rakta-daan-postgres psql -U rakta rakta_daan < backup.sql
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U rakta -d rakta_daan -c "SELECT 1"
```

### API Not Starting

```bash
# Check API logs
docker-compose logs api

# Rebuild API
docker-compose build api
docker-compose up -d api
```

### Frontend Not Starting

```bash
# Check frontend logs
docker-compose logs web

# Rebuild frontend
docker-compose build web
docker-compose up -d web
```
