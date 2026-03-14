# Enrollment System - Deployment Setup Guide

## Overview

This guide covers deploying the Enrollment System, which consists of:
- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js + Node.js with SQLite3
- **Database**: SQLite with better-sqlite3 driver

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Deployment](#local-deployment)
3. [Production Deployment](#production-deployment)
4. [Cloud Deployment Options](#cloud-deployment-options)
5. [Environment Configuration](#environment-configuration)
6. [Database Deployment](#database-deployment)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: v16.x or higher
- **npm**: v7.x or higher (comes with Node.js)
- **Git**: For version control
- **Operating System**: Windows, macOS, or Linux

### Verify Installation
```bash
node --version
npm --version
git --version
```

---

## Local Deployment

### 1. Clone the Repository

```bash
git clone <repository-url>
cd enroll-sys-rework-main
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd src/backend-setup
npm install
cd ../..
```

### 4. Configure Environment Variables

Create `.env.local` in the root directory:

```env
# Frontend
VITE_API_BASE_URL=http://localhost:5000

# Backend
PORT=5000
NODE_ENV=development
DB_PATH=./enrollment_system.db
JWT_SECRET=your_secret_key_change_this_in_production
CORS_ORIGIN=http://localhost:5173
FILE_UPLOAD_DIR=./src/backend-setup/uploads
```

Create `src/backend-setup/.env` for backend-specific settings:

```env
PORT=5000
NODE_ENV=development
DB_PATH=../../../enrollment_system.db
JWT_SECRET=your_secret_key_change_this_in_production
CORS_ORIGIN=http://localhost:5173
FILE_UPLOAD_DIR=./uploads
```

### 5. Setup Database

```bash
cd src/backend-setup
npm run db:setup
npm run db:add-students  # Optional: Add sample data
cd ../..
```

### 6. Run Development Servers

**Terminal 1 - Frontend (Port 5173):**
```bash
npm run dev
```

**Terminal 2 - Backend (Port 5000):**
```bash
cd src/backend-setup
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

---

## Production Deployment

### 1. Build Frontend

```bash
npm run build
```

Output will be in the `dist/` directory.

### 2. Build Backend

```bash
cd src/backend-setup
npm run build
cd ../..
```

Output will be in `src/backend-setup/dist/` directory.

### 3. Prepare Production Environment

Create `.env.production` in the root:

```env
# Frontend
VITE_API_BASE_URL=https://api.your-domain.com

# Backend
PORT=5000
NODE_ENV=production
DB_PATH=/var/lib/enrollment_system/enrollment_system.db
JWT_SECRET=generate_a_strong_random_secret_here
CORS_ORIGIN=https://your-domain.com
FILE_UPLOAD_DIR=/var/lib/enrollment_system/uploads
```

### 4. Start Production Servers

**Backend:**
```bash
cd src/backend-setup
npm run start
```

**Frontend (with static server):**
Use a reverse proxy like Nginx to serve the `dist/` folder.

---

## Cloud Deployment Options

### Option 1: Heroku

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

1. **Create Heroku App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

2. **Add Procfile** (root directory):
   ```
   web: npm run build && npm start
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set PORT=5000
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_production_secret
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 2: AWS (EC2 + RDS)

#### Prerequisites
- AWS account
- EC2 instance (Ubuntu 20.04 LTS recommended)
- RDS instance (MySQL/PostgreSQL)

#### Steps

1. **Connect to EC2 Instance**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd enroll-sys-rework-main
   ```

4. **Install Dependencies**
   ```bash
   npm install
   cd src/backend-setup && npm install && cd ../..
   ```

5. **Configure Environment**
   ```bash
   # Create .env files with production values
   nano .env.local
   nano src/backend-setup/.env
   ```

6. **Build and Start**
   ```bash
   npm run build
   cd src/backend-setup && npm run build
   # Use PM2 for process management
   sudo npm install -g pm2
   pm2 start dist/server.js --name "enrollment-api"
   pm2 startup
   pm2 save
   ```

### Option 3: Docker + Docker Compose

#### Dockerfile (Root)
```dockerfile
# Frontend
FROM node:16-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

#### Dockerfile (Backend - src/backend-setup/Dockerfile)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      VITE_API_BASE_URL: http://backend:5000

  backend:
    build: ./src/backend-setup
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      DB_PATH: /data/enrollment_system.db
      CORS_ORIGIN: http://localhost
    volumes:
      - ./data:/data
      - ./uploads:/app/uploads
```

**Deploy with Docker Compose:**
```bash
docker-compose up -d
```

### Option 4: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_BASE_URL=https://your-backend-url`

#### Backend on Railway
1. Create new project on Railway
2. Connect GitHub repository
3. Set start command: `cd src/backend-setup && npm run start`
4. Add environment variables from `.env.production`
5. Deploy

---

## Environment Configuration

### Frontend Variables (.env.local)
```env
VITE_API_BASE_URL=http://localhost:5000        # Backend API URL
VITE_APP_NAME=Enrollment System               # Application name
```

### Backend Variables (.env)
```env
PORT=5000                                      # Server port
NODE_ENV=development|production                # Environment mode
DB_PATH=./enrollment_system.db                # SQLite database path
JWT_SECRET=your_secret_key                    # JWT signing key
CORS_ORIGIN=http://localhost:5173             # Allowed frontend origin
FILE_UPLOAD_DIR=./uploads                     # File upload location
LOG_LEVEL=debug|info|warn|error               # Logging level
```

### Security Best Practices for Environment Variables
1. Never commit `.env` files to git
2. Use `.env.example` template for configuration reference
3. Rotate secrets regularly in production
4. Use strong random strings for `JWT_SECRET` (minimum 32 characters)
5. Store secrets in secure vaults (AWS Secrets Manager, Vault, etc.)

---

## Database Deployment

### SQLite Considerations

**Advantages:**
- No separate server needed
- Single file database
- Good for small to medium applications

**Limitations:**
- Not suitable for highly concurrent write operations
- File-based locking can cause issues with network storage
- Limited scalability

### Backing Up SQLite Database

```bash
# Manual backup
cp enrollment_system.db enrollment_system.backup.db

# Automated backup (Linux/macOS)
0 2 * * * cp /path/to/enrollment_system.db /path/to/backups/enrollment_system.$(date +\%Y\%m\%d).db
```

### Migrating to MySQL/PostgreSQL

If planning to scale:

1. **Install production database**
2. **Update dependencies** in `src/backend-setup/package.json`
3. **Modify database connection** in backend code
4. **Update environment variables** with new database credentials
5. **Migrate data** using migration tools

---

## Security Considerations

### 1. HTTPS/SSL Certificate
```nginx
# Nginx configuration example
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

### 2. Authentication & Authorization
- Change default JWT_SECRET immediately
- Implement proper password hashing (bcryptjs is configured)
- Enable rate limiting on authentication endpoints
- Use HTTPS only for cookie transmission

### 3. Database Security
- Restrict database file permissions: `chmod 600 enrollment_system.db`
- Keep regular backups in secure location
- Test database restoration procedures

### 4. File Upload Security
- Validate file types and sizes
- Store uploads outside web root
- Implement virus scanning for uploaded files
- Use unique filenames to prevent directory traversal

### 5. CORS Configuration
- Limit CORS origins to your domain only
- Never use `*` in production

### 6. Dependencies
- Keep Node.js and npm packages updated
- Run `npm audit` regularly
- Use lock files (package-lock.json)

---

## Monitoring & Maintenance

### Health Checks

Add endpoint for monitoring:
```bash
GET /api/health
# Response: { status: "ok", timestamp: "2024-03-14T..." }
```

### Logging
- Implement centralized logging (ELK Stack, Datadog, etc.)
- Monitor error rates and performance
- Keep logs for audit trails

### Database Maintenance
- Monitor database file size
- Implement data archival strategy
- Regular integrity checks

---

## Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <pid> /F

# macOS/Linux
lsof -i :5000
kill -9 <pid>
```

### Database Connection Errors
```bash
# Check database file exists and has proper permissions
ls -la enrollment_system.db
chmod 600 enrollment_system.db
```

### CORS Errors
- Verify `CORS_ORIGIN` matches frontend URL
- Check network tab in browser dev tools
- Ensure backend is running on correct port

### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be v16+
```

### Memory Issues in Production
- Increase Node.js heap size: `node --max-old-space-size=4096 dist/server.js`
- Monitor memory usage with `top` or `pm2 monit`
- Consider using cluster mode for load balancing

---

## Production Checklist

- [ ] Environment variables configured securely
- [ ] Database backups established
- [ ] HTTPS/SSL certificate installed
- [ ] CORS origins properly configured
- [ ] JWT secret changed from default
- [ ] File upload permissions configured
- [ ] Logging and monitoring set up
- [ ] Error handling and alerting configured
- [ ] Database connection pooling enabled
- [ ] Rate limiting implemented
- [ ] Security headers configured (Nginx)
- [ ] Disaster recovery plan documented
- [ ] Performance testing completed
- [ ] Load testing completed

---

## Support & Resources

- **Node.js Documentation**: https://nodejs.org/en/docs/
- **Express.js Guide**: https://expressjs.com/
- **Vite Documentation**: https://vitejs.dev/
- **SQLite Documentation**: https://www.sqlite.org/docs.html

---

## Deployment Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md)
3. Check application logs
4. Open an issue in the repository

---

**Last Updated**: March 14, 2026
**Version**: 1.0.0
