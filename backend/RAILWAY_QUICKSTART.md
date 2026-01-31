# Railway Deployment - Quick Start

## 🚀 Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. **Set Root Directory**: `backend`

### 3. Set Environment Variables

In Railway → Variables tab, add:

```bash
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=<generate-random-32-chars>
ADMIN_SECRET_KEY=<generate-random-32-chars>
ENVIRONMENT=production
CORS_ORIGINS=https://moltstreet.vercel.app,https://*.vercel.app
```

### 4. Deploy
Railway will auto-deploy. Get your URL from Settings → Networking.

### 5. Verify
```bash
curl https://your-app.up.railway.app/health
# Should return: {"status":"ok"}
```

## 📋 Files Created

- ✅ `railway.json` - Railway configuration
- ✅ `start.sh` - Startup script (runs migrations + starts server)
- ✅ `runtime.txt` - Python version
- ✅ `.railwayignore` - Files to exclude
- ✅ `RAILWAY_DEPLOYMENT.md` - Full guide

## 🔑 Generate Secrets

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 📚 Full Guide

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

