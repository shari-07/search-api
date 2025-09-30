# 🚀 Railway.app Deployment Guide

## Overview

Railway.app is a modern platform that makes deploying apps incredibly simple. It's perfect for your Bun/TypeScript API.

**Benefits:**
- ✅ Simple deployment (git push)
- ✅ Free SSL certificates
- ✅ Built-in Redis and PostgreSQL
- ✅ Easy custom domain setup
- ✅ Free tier: $5 credit monthly
- ✅ Automatic deployments from Git

---

## Prerequisites

- Cloudflare account with domain
- Fly.io account (free)
- Your application code

---

## Quick Start (5 Minutes)

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

This will open a browser for authentication.

### Step 3: Create Fly.io Configuration

In your project directory:

```bash
cd /Users/shariyuan/workspace/product_search_api

# Initialize Fly app
fly launch --no-deploy
```

**Answer the prompts:**
```
App Name: product-search-api (or your choice)
Region: Choose closest to your users
PostgreSQL: No (we use Redis)
Redis: Yes (select Upstash Redis)
Deploy: No (we'll configure first)
```

This creates a `fly.toml` file.

### Step 4: Configure fly.toml

Edit the generated `fly.toml`:

```toml
app = "product-search-api"
primary_region = "sjc"  # or your chosen region

[build]
  [build.args]
    NODE_VERSION = "18"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 3000
  processes = ["app"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "1s"
    restart_limit = 0
```

### Step 5: Create Dockerfile

Fly.io needs a Dockerfile. Create one:

```bash
nano Dockerfile
```

Add this configuration for Bun:

```dockerfile
# Use Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the app
CMD ["bun", "run", "src/index.ts"]
```

### Step 6: Create .dockerignore

```bash
nano .dockerignore
```

Add:
```
node_modules
.git
.env
*.log
.DS_Store
```

### Step 7: Set Environment Variables (Secrets)

#### Required API Keys (Minimum to fix Taobao API error):

```bash
# Taobao API Configuration
fly secrets set TAOBAO_KEY=503184
fly secrets set TAOBAO_SECRET=W5NMyQgkq6dYTwoglpNaCZawrVpWvyhG
fly secrets set TAOBAO_ACCESS_TOKEN=50000800223xIJTpgcPTlq9h9S3txcYdmuG134d3d1dItawrefBdp7owRz5Yyl
```

#### Additional API Keys:

```bash
# 1688 API Configuration (Alibaba B2B)
fly secrets set ALIBABA_1688_KEY=7983099
fly secrets set ALIBABA_1688_SECRET=9h7SKdxfbW
fly secrets set ALIBABA_1688_TOKEN=60a94e4b-9953-4dfd-a2d3-0b966c1cbc91

# OneBound API Configuration
fly secrets set ONEBOUND_API_KEY=t3312931327
fly secrets set ONEBOUND_API_SECRET=13270f91

# Redis Configuration (Choose one option)

# Option 1: Upstash Redis (Recommended - Free tier available)
# Get URL from: https://console.upstash.com/
fly secrets set REDIS_URL=redis://your-upstash-redis-url

# Option 2: Redis Cloud
# fly secrets set REDIS_URL=redis://username:password@host:port

# Option 3: Local Redis (for development only)
# fly secrets set REDIS_URL=redis://your-upstash-redis-url

# Discord Logging (Optional)
fly secrets set DISCORD_LOGGING_WEBHOOK=your_discord_webhook_url

# OAuth Configuration
fly secrets set OAUTH_CALLBACK_URL=https://yourdomain.com/oauth/callback

# Frontend Configuration
fly secrets set FRONTEND_URL=https://yourdomain.com

ONEBOUND_API_KEY=t3312931327
ONEBOUND_API_SECRET=13270f91

TAOBAO_KEY=503184
TAOBAO_SECRET=W5NMyQgkq6dYTwoglpNaCZawrVpWvyhG
TAOBAO_ACCESS_TOKEN=50000800223xIJTpgcPTlq9h9S3txcYdmuG134d3d1dItawrefBdp7owRz5Yyl

ALIBABA_1688_KEY=7983099
ALIBABA_1688_SECRET=9h7SKdxfbW
ALIBABA_1688_TOKEN=60a94e4b-9953-4dfd-a2d3-0b966c1cbc91

REDIS_URL=redis://your-upstash-redis-url
```

#### Set Multiple Secrets at Once (Faster):

```bash
fly secrets set \
ONEBOUND_API_KEY=t3312931327 \
ONEBOUND_API_SECRET=13270f91 \
TAOBAO_KEY=503184 \
TAOBAO_SECRET=W5NMyQgkq6dYTwoglpNaCZawrVpWvyhG \
TAOBAO_ACCESS_TOKEN=50000800223xIJTpgcPTlq9h9S3txcYdmuG134d3d1dItawrefBdp7owRz5Yyl \
ALIBABA_1688_KEY=7983099 \
ALIBABA_1688_SECRET=9h7SKdxfbW \
ALIBABA_1688_TOKEN=60a94e4b-9953-4dfd-a2d3-0b966c1cbc91 \
REDIS_URL=redis://your-upstash-redis-url
```

#### Verify Secrets:

```bash
# Check if secrets are set correctly
fly secrets list

# Deploy to apply the changes
fly deploy
```

### Step 8: Deploy to Fly.io

```bash
fly deploy
```

This will:
1. Build your Docker image
2. Push to Fly.io
3. Deploy to global edge network
4. Give you a URL: `https://product-search-api.fly.dev`

### Step 9: Test Deployment

```bash
# Test the deployment
curl https://product-search-api.fly.dev/oauth/status

# Or open in browser
fly open
```

---

## Connect Cloudflare Domain

### Option 1: CNAME Method (Recommended)

#### Step 1: Get Fly.io App Hostname

```bash
fly info
```

Note the hostname: `product-search-api.fly.dev`

#### Step 2: Add Domain to Fly.io

```bash
fly certs add yourdomain.com
fly certs add www.yourdomain.com
```

Fly.io will provide CNAME records.

#### Step 3: Configure Cloudflare DNS

1. **Login to Cloudflare Dashboard**
2. **Select your domain**
3. **Go to DNS** → **Records**
4. **Add CNAME records**:

```
Type: CNAME
Name: @ (or yourdomain.com)
Target: product-search-api.fly.dev
Proxy status: DNS only (grey cloud)
TTL: Auto
```

```
Type: CNAME
Name: www
Target: product-search-api.fly.dev
Proxy status: DNS only (grey cloud)
TTL: Auto
```

⚠️ **Important**: Set to "DNS only" (grey cloud), not proxied (orange cloud)

#### Step 4: Verify Certificate

```bash
fly certs check yourdomain.com
```

Wait for SSL certificate to be issued (usually 1-5 minutes).

### Option 2: Cloudflare Proxy (Orange Cloud)

If you want to use Cloudflare's proxy:

1. **In Cloudflare DNS**, set proxy to "Proxied" (orange cloud)
2. **In Cloudflare SSL/TLS**, set to "Full (strict)"
3. **No need for `fly certs`** - Cloudflare handles SSL

---

## Redis Setup

### Option 1: Use Fly.io Redis (Upstash)

If you created Redis during setup:

```bash
# Get Redis connection URL
fly redis list

# It's automatically set as environment variable
# No additional configuration needed!
```

### Option 2: External Redis

If using external Redis:

```bash
fly secrets set REDIS_URL=redis://your-redis-url:6379
```

---

## Update OAuth Callback URL

Now that you have your domain:

```bash
# Update the callback URL
fly secrets set OAUTH_CALLBACK_URL=https://yourdomain.com/oauth/callback

# Restart app to apply changes
fly apps restart product-search-api
```

Don't forget to update the callback URL in Taobao app settings!

---

## Useful Fly.io Commands

### Deployment

```bash
# Deploy app
fly deploy

# Deploy with custom Dockerfile
fly deploy --dockerfile Dockerfile

# Deploy to specific region
fly deploy --region sjc
```

### Monitoring

```bash
# View logs
fly logs

# Real-time logs
fly logs -f

# SSH into machine
fly ssh console

# Check app status
fly status

# View app info
fly info
```

### Scaling

```bash
# Scale to 2 machines
fly scale count 2

# Scale VM size
fly scale vm shared-cpu-1x

# Scale to specific region
fly scale count 1 --region sjc
```

### Secrets

```bash
# List secrets
fly secrets list

# Set secret
fly secrets set KEY=value

# Unset secret
fly secrets unset KEY

# Import from .env file
fly secrets import < .env
```

### Domains

```bash
# Add custom domain
fly certs add yourdomain.com

# Check certificate status
fly certs check yourdomain.com

# List certificates
fly certs list

# Remove certificate
fly certs remove yourdomain.com
```

---

## Complete Deployment Workflow

```bash
# 1. Install Fly CLI
brew install flyctl

# 2. Login
fly auth login

# 3. Initialize (in project directory)
fly launch --no-deploy

# 4. Set secrets
fly secrets set TAOBAO_KEY=xxx TAOBAO_SECRET=xxx ...

# 5. Deploy
fly deploy

# 6. Add custom domain
fly certs add yourdomain.com

# 7. Configure Cloudflare DNS
# Add CNAME: @ → product-search-api.fly.dev

# 8. Verify
fly certs check yourdomain.com
curl https://yourdomain.com/oauth/status
```

---

## Cloudflare DNS Configuration

### Recommended Setup

```
┌──────────────┬────────┬─────────────────────────────┬─────────────┐
│ Type         │ Name   │ Content                     │ Proxy       │
├──────────────┼────────┼─────────────────────────────┼─────────────┤
│ CNAME        │ @      │ product-search-api.fly.dev  │ DNS only    │
│ CNAME        │ www    │ product-search-api.fly.dev  │ DNS only    │
│ CNAME        │ api    │ product-search-api.fly.dev  │ DNS only    │
└──────────────┴────────┴─────────────────────────────┴─────────────┘
```

### With Cloudflare Proxy (Alternative)

```
┌──────────────┬────────┬─────────────────────────────┬─────────────┐
│ Type         │ Name   │ Content                     │ Proxy       │
├──────────────┼────────┼─────────────────────────────┼─────────────┤
│ CNAME        │ @      │ product-search-api.fly.dev  │ Proxied ☁️  │
│ CNAME        │ www    │ product-search-api.fly.dev  │ Proxied ☁️  │
└──────────────┴────────┴─────────────────────────────┴─────────────┘

Then in Cloudflare SSL/TLS settings:
- SSL/TLS encryption mode: Full (strict)
```

---

## Environment Variables

Your app will automatically have these from secrets:

```env
TAOBAO_KEY
TAOBAO_SECRET
TAOBAO_ACCESS_TOKEN
TAOBAO_REFRESH_TOKEN
1688_KEY
1688_SECRET
1688_TOKEN
ONEBOUND_API_KEY
ONEBOUND_API_SECRET
REDIS_URL  # Automatically set if using Fly Redis
OAUTH_CALLBACK_URL
PORT=3000  # Set in fly.toml
NODE_ENV=production  # Set in fly.toml
```

---

## Pricing

### Fly.io Free Tier

```
✅ 3 shared-cpu-1x VMs (256MB RAM)
✅ 3GB persistent storage
✅ 160GB outbound data transfer
✅ Free SSL certificates

Cost: $0/month (within free tier limits)
```

### Paid Tier (if needed)

```
VM (shared-cpu-1x): ~$2/month
Additional storage: $0.15/GB/month
Additional bandwidth: $0.02/GB

Example: 1 VM + 1GB storage + 50GB bandwidth = ~$3/month
```

### Upstash Redis (via Fly.io)

```
Free tier: 10k commands/day
Paid: $0.20 per 100k commands
```

---

## Deployment Checklist

- [ ] Install Fly CLI
- [ ] Login to Fly.io
- [ ] Create Dockerfile
- [ ] Create fly.toml
- [ ] Set all secrets
- [ ] Deploy app (`fly deploy`)
- [ ] Add custom domain (`fly certs add`)
- [ ] Configure Cloudflare DNS (CNAME records)
- [ ] Verify SSL certificate
- [ ] Update OAuth callback URL
- [ ] Test all endpoints
- [ ] Monitor logs (`fly logs`)

---

## Troubleshooting

### App Not Starting

```bash
# Check logs
fly logs

# Check app status
fly status

# SSH into machine
fly ssh console

# Check if port 3000 is correct
# Verify in fly.toml: internal_port = 3000
```

### SSL Certificate Issues

```bash
# Check certificate status
fly certs check yourdomain.com

# Make sure Cloudflare DNS is set to "DNS only" (grey cloud)
# Wait 5-10 minutes for certificate issuance
```

### Domain Not Working

```bash
# Verify DNS propagation
nslookup yourdomain.com

# Check if CNAME points to fly.dev
dig yourdomain.com

# Try accessing fly.dev URL directly
curl https://product-search-api.fly.dev/oauth/status
```

### Redis Connection Issues

```bash
# Check if Redis URL is set
fly secrets list

# Get Redis connection string
fly redis list

# Test Redis connection (SSH into machine)
fly ssh console
redis-cli -u $REDIS_URL ping
```

---

## Advantages over AWS EC2

| Feature | Fly.io | AWS EC2 |
|---------|--------|---------|
| Deployment | `fly deploy` | Complex setup |
| SSL | Automatic & Free | Requires ACM/Certbot |
| Scaling | `fly scale count 2` | Manual/Auto Scaling Groups |
| Global Edge | Built-in | Need CloudFront |
| Cost (small app) | Free/$2-3/month | $10-20/month |
| Maintenance | Minimal | Manual updates |
| Setup Time | 5 minutes | 30-60 minutes |

---

## Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying to Fly.io..."

# Deploy
fly deploy

# Check status
fly status

# Show URL
echo "✅ Deployed to:"
fly info | grep Hostname

# Show logs
fly logs --lines 50
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Summary

**Setup Time:** 5-10 minutes
**Monthly Cost:** Free (within limits) or $2-3
**SSL:** Automatic
**Global:** Edge network included
**Scaling:** Simple commands

**Your app will be live at:**
- `https://product-search-api.fly.dev` (Fly.io subdomain)
- `https://yourdomain.com` (your Cloudflare domain)

🎉 **Much simpler than EC2!**
