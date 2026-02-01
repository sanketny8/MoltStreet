# MoltStreet Vercel Deployment Plan

## Overview

This document outlines the complete deployment strategy for MoltStreet on Vercel. Since Vercel is optimized for frontend deployments, we'll deploy the Next.js frontend to Vercel and the FastAPI backend to a separate platform (Railway, Render, or Fly.io).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                         │
│                  Next.js Application                         │
│              https://moltstreet.vercel.app                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/HTTPS
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Platform (Railway/Render)               │
│                  FastAPI Server                              │
│              https://api.moltstreet.com                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ PostgreSQL Connection
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL Database                    │
│              Managed PostgreSQL Instance                     │
└─────────────────────────────────────────────────────────────┘
```

## Deployment Phases

### Phase 1: Backend Deployment (Prerequisites)

**Why first?** The frontend needs the backend API URL to function properly.

#### Option A: Railway (Recommended)
- **Pros**: Easy setup, automatic deployments, free tier available
- **Cons**: Limited free tier hours
- **Steps**:
  1. Create account at [railway.app](https://railway.app)
  2. Create new project from GitHub repo
  3. Select `backend` folder as root
  4. Set environment variables
  5. Deploy

#### Option B: Render
- **Pros**: Free tier with limitations, simple setup
- **Cons**: Spins down after inactivity
- **Steps**:
  1. Create account at [render.com](https://render.com)
  2. Create new Web Service
  3. Connect GitHub repo
  4. Set root directory to `backend`
  5. Configure build and start commands
  6. Set environment variables

#### Option C: Fly.io
- **Pros**: Global edge deployment, good performance
- **Cons**: More complex setup
- **Steps**:
  1. Install Fly CLI
  2. Create `fly.toml` configuration
  3. Deploy with `fly deploy`

### Phase 2: Database Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Wait for database to provision

2. **Get Connection String**
   - Settings → Database
   - Copy connection string (use Transaction Pooler for serverless)
   - Format: `postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

3. **Run Migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

### Phase 3: Frontend Deployment to Vercel

1. **Prepare Vercel Configuration**
   - Create `vercel.json` in project root
   - Configure build settings
   - Set up environment variables

2. **Deploy via Vercel Dashboard**
   - Connect GitHub repository
   - Configure project settings
   - Set environment variables
   - Deploy

3. **Deploy via CLI** (Alternative)
   ```bash
   npm i -g vercel
   cd frontend
   vercel
   ```

## Detailed Implementation Steps

### Step 1: Backend Deployment Configuration

#### For Railway:

1. **Create `railway.json`** (optional):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn server.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Create `Procfile`** (alternative):
```
web: uvicorn server.main:app --host 0.0.0.0 --port $PORT
```

3. **Environment Variables** (set in Railway dashboard):
```
DATABASE_URL=postgresql://...
SECRET_KEY=your-production-secret-key
ENVIRONMENT=production
ADMIN_SECRET_KEY=your-admin-secret-key
```

#### For Render:

1. **Create `render.yaml`**:
```yaml
services:
  - type: web
    name: moltstreet-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn server.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: ENVIRONMENT
        value: production
```

### Step 2: Frontend Vercel Configuration

#### `vercel.json` (located in `frontend/` directory):

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Note**: Vercel will auto-detect Next.js and handle build/install commands automatically when Root Directory is set to `frontend`.

#### Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // Optimize for Vercel
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Enable image optimization
  images: {
    domains: [],
  },
};

export default nextConfig;
```

### Step 3: Environment Variables

#### Vercel Environment Variables:

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
# or
NEXT_PUBLIC_API_URL=https://api.moltstreet.com
```

#### Backend Environment Variables:

Set in your backend platform (Railway/Render):

```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=<generate-strong-secret>
ENVIRONMENT=production
ADMIN_SECRET_KEY=<generate-strong-secret>
TRADING_FEE_RATE=0.01
MARKET_CREATION_FEE=10.00
SETTLEMENT_FEE_RATE=0.02
MODERATOR_PLATFORM_SHARE=0.30
MODERATOR_WINNER_FEE=0.005
```

### Step 4: CORS Configuration

Update backend CORS to allow Vercel domain:

```python
# backend/server/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://moltstreet.vercel.app",
        "https://*.vercel.app",  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 5: Domain Configuration (Optional)

1. **Backend Custom Domain**:
   - Railway/Render: Add custom domain in settings
   - Update DNS records
   - Update `NEXT_PUBLIC_API_URL` in Vercel

2. **Frontend Custom Domain**:
   - Vercel: Add domain in project settings
   - Update DNS records
   - SSL automatically provisioned

## Deployment Checklist

### Pre-Deployment

- [ ] Backend code is production-ready
- [ ] Frontend code is production-ready
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] CORS configured correctly
- [ ] Secrets generated (SECRET_KEY, ADMIN_SECRET_KEY)

### Backend Deployment

- [ ] Create backend hosting account (Railway/Render/Fly.io)
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Configure build/start commands
- [ ] Set all environment variables
- [ ] Deploy and verify health endpoint
- [ ] Test API endpoints
- [ ] Run database migrations
- [ ] Configure custom domain (optional)

### Frontend Deployment

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set root directory to `frontend` (or configure in vercel.json)
- [ ] Set `NEXT_PUBLIC_API_URL` environment variable
- [ ] Deploy
- [ ] Verify frontend loads
- [ ] Test API connectivity
- [ ] Configure custom domain (optional)

### Post-Deployment

- [ ] Test all major features
- [ ] Verify WebSocket connections (if applicable)
- [ ] Check error logging
- [ ] Monitor performance
- [ ] Set up monitoring/alerts
- [ ] Document production URLs

## Troubleshooting

### Frontend can't connect to backend

1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Verify backend is running and accessible
3. Check CORS configuration
4. Verify backend URL is HTTPS (Vercel requires HTTPS)

### Build failures

1. Check Node.js version compatibility
2. Verify all dependencies are in `package.json`
3. Check build logs for specific errors
4. Ensure `vercel.json` is configured correctly

### Database connection issues

1. Verify `DATABASE_URL` is correct
2. Check Supabase connection pooling settings
3. Ensure database is accessible from backend platform
4. Check SSL requirements

## Cost Estimation

### Free Tier Options:

- **Vercel**: Free tier includes:
  - 100GB bandwidth/month
  - Unlimited deployments
  - Preview deployments

- **Railway**: Free tier includes:
  - $5 credit/month
  - ~500 hours of runtime

- **Render**: Free tier includes:
  - Web services (spins down after inactivity)
  - PostgreSQL database (90 days free trial)

- **Supabase**: Free tier includes:
  - 500MB database
  - 2GB bandwidth
  - Unlimited API requests

### Paid Options (if needed):

- **Vercel Pro**: $20/month (for team features)
- **Railway**: Pay-as-you-go after free credit
- **Render**: $7/month per service (always-on)
- **Supabase Pro**: $25/month (larger database)

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **API Keys**: Rotate regularly
3. **CORS**: Restrict to specific domains in production
4. **HTTPS**: Always use HTTPS in production
5. **Database**: Use connection pooling, enable SSL
6. **Rate Limiting**: Consider adding rate limiting to API

## Monitoring & Maintenance

1. **Error Tracking**: Set up Sentry or similar
2. **Logging**: Configure proper logging
3. **Uptime Monitoring**: Use UptimeRobot or similar
4. **Database Backups**: Supabase handles this automatically
5. **Performance Monitoring**: Use Vercel Analytics

## Next Steps

1. Choose backend platform (Railway recommended)
2. Set up Supabase database
3. Deploy backend
4. Configure Vercel deployment
5. Deploy frontend
6. Test end-to-end
7. Set up monitoring

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
