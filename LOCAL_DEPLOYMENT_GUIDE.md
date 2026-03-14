# Enrollment System - Local Deployment Guide

Quick start guide for running the Enrollment System locally.

## Prerequisites

- **Node.js**: v16.x or higher
- **npm**: v7.x or higher

Verify installation:
```bash
node --version
npm --version
```

## Setup Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd enroll-sys-rework-main
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd src/backend-setup
npm install
cd ../..
```

### 3. Configure Environment

Create `.env.local` in root directory:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Create `src/backend-setup/.env`:
```env
PORT=5000
NODE_ENV=development
DB_PATH=../../../enrollment_system.db
JWT_SECRET=dev_secret_key_change_in_production
CORS_ORIGIN=http://localhost:5173
FILE_UPLOAD_DIR=./uploads
```

### 4. Setup Database

```bash
cd src/backend-setup
npm run db:setup
npm run db:add-students
cd ../..
```

### 5. Run Development Servers

**Terminal 1 - Frontend (Port 5173):**
```bash
npm run dev
```

**Terminal 2 - Backend (Port 5000):**
```bash
cd src/backend-setup
npm run dev
```

## Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

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

### Database Issues
```bash
# Reinstall dependencies
cd src/backend-setup
rm -rf node_modules package-lock.json
npm install
npm run db:setup
```

### Dependencies Missing
```bash
# Clear and reinstall all
rm -rf node_modules package-lock.json
npm install
cd src/backend-setup
npm install
```

---

**Last Updated**: March 14, 2026
