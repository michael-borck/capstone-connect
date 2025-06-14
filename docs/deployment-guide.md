---
layout: default
title: Deployment Guide
nav_order: 6
---

# Deployment Guide - Proxy Server Setup

Complete guide for deploying Curtin Capstone Connect behind a proxy server (Nginx, Apache, or cloud load balancer).

## 🎯 Overview

This application is designed to run behind a reverse proxy for production deployments. The proxy handles:
- SSL termination
- Static file serving (optional)
- Load balancing (if multiple instances)
- Security headers
- Rate limiting (optional)

## 🔧 Application Configuration

### 1. Environment Setup

**Copy and customize the production environment file:**
```bash
cp .env.production .env
```

**Required environment variables:**
```env
# CRITICAL: Change these for production
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key

# Your domain configuration
PROXY_DOMAIN=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Server binding (internal interface)
PORT=1077
HOST=127.0.0.1
```

### 2. Application Changes

The application includes these proxy-ready configurations:
- `app.set('trust proxy', 1)` - Trusts first proxy
- CORS configured for proxy domains
- Proper header handling for forwarded requests

## 🌐 Nginx Configuration

### 1. Install Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. SSL Certificate Setup
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. Nginx Configuration
```bash
# Copy the example configuration
sudo cp nginx.conf.example /etc/nginx/sites-available/capstone-connect

# Edit with your domain details
sudo nano /etc/nginx/sites-available/capstone-connect

# Enable the site
sudo ln -s /etc/nginx/sites-available/capstone-connect /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 4. Key Nginx Settings Explained

**Proxy Headers:**
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

**Security Headers:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
```

**File Upload Support:**
```nginx
client_max_body_size 10M;
```

## 🔒 Apache Configuration

### 1. Enable Required Modules
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite
```

### 2. Virtual Host Configuration
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/fullchain.pem
    SSLCertificateKeyFile /path/to/your/privkey.pem
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
    
    # Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:1077/
    ProxyPassReverse / http://127.0.0.1:1077/
    
    # Forward headers
    ProxyPassReverse / http://127.0.0.1:1077/
    ProxyPassReverseMatch ^(/.*) http://127.0.0.1:1077$1
    
    # File upload limit
    LimitRequestBody 10485760
</VirtualHost>
```

## ☁️ Cloud Load Balancer Setup

### AWS Application Load Balancer

**Target Group Configuration:**
- Protocol: HTTP
- Port: 1077
- Health Check Path: `/api/health`
- Health Check Interval: 30 seconds

**Load Balancer Configuration:**
- Scheme: Internet-facing
- IP address type: IPv4
- Listeners: HTTPS:443 → Target Group

**Environment Variables:**
```env
PROXY_DOMAIN=https://your-alb-domain.elb.amazonaws.com
ALLOWED_ORIGINS=https://your-domain.com,https://your-alb-domain.elb.amazonaws.com
```

### Google Cloud Load Balancer

**Backend Service Configuration:**
- Protocol: HTTP
- Port: 1077
- Health Check: HTTP on `/api/health`

**URL Map Configuration:**
- Default service: Your backend service
- Host and path rules as needed

## 🐳 Docker Deployment

### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set up data directories
RUN mkdir -p database logs uploads
RUN chown -R nodejs:nodejs database logs uploads

USER nodejs

EXPOSE 1077

CMD ["npm", "start"]
```

### 2. Docker Compose with Nginx
```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: capstone-connect
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./database:/app/database
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - capstone-network

  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - capstone-network

networks:
  capstone-network:
    driver: bridge
```

## 🔐 Security Considerations

### 1. Firewall Configuration
```bash
# Allow only HTTP/HTTPS through proxy
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 1077/tcp   # Block direct access to app
sudo ufw enable
```

### 2. SSL Best Practices
- Use strong SSL ciphers
- Enable HSTS headers
- Use HTTP/2 when possible
- Regular certificate renewal

### 3. Rate Limiting
Configure rate limiting at both proxy and application level:

**Nginx Rate Limiting:**
```nginx
http {
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    
    server {
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://127.0.0.1:1077;
        }
    }
}
```

## 📊 Monitoring and Logging

### 1. Application Logs
```bash
# Application logs
tail -f logs/api-$(date +%Y-%m-%d).log
tail -f logs/system-$(date +%Y-%m-%d).log
```

### 2. Nginx Logs
```bash
# Access and error logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 3. Health Monitoring
```bash
# Health check endpoint
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-06-14T10:30:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Proxy configuration tested
- [ ] Database backup created
- [ ] Firewall rules configured

### Deployment
- [ ] Application started and healthy
- [ ] Proxy configuration applied
- [ ] SSL redirect working
- [ ] Health check responding
- [ ] All user flows tested

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Test all functionality
- [ ] Verify security headers
- [ ] Check performance metrics
- [ ] Set up monitoring alerts

## 🔄 Updates and Maintenance

### 1. Application Updates
```bash
# Stop application
sudo systemctl stop capstone-connect

# Backup database
npm run backup

# Update code
git pull origin main
npm install

# Run migrations if needed
npm run migrate

# Start application
sudo systemctl start capstone-connect
```

### 2. Proxy Updates
```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx (zero downtime)
sudo nginx -s reload

# Or restart if needed
sudo systemctl restart nginx
```

## 💡 Troubleshooting

### Common Issues

**502 Bad Gateway:**
- Check if application is running: `sudo systemctl status capstone-connect`
- Verify proxy configuration: `sudo nginx -t`
- Check application logs

**CORS Errors:**
- Verify `PROXY_DOMAIN` and `ALLOWED_ORIGINS` in `.env`
- Check proxy headers are being forwarded

**SSL Issues:**
- Verify certificate paths in proxy config
- Check certificate expiration: `sudo certbot certificates`
- Test SSL configuration: `openssl s_client -connect your-domain.com:443`

**Performance Issues:**
- Check application resource usage
- Review proxy caching settings
- Monitor database performance

---

This deployment guide ensures your Curtin Capstone Connect application runs securely and efficiently behind a proxy server.