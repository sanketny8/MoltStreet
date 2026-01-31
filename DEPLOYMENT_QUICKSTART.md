# MoltStreet Deployment Quick Start

This is a quick reference guide for deploying MoltStreet. For detailed information, see [VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md).

## Prerequisites

- GitHub account with repository pushed
- Supabase account (free tier works)
- Vercel account (free tier works)
- Backend hosting account (Railway/Render/Fly.io - free tier works)

## Step-by-Step Deployment

### 1. Set Up Database (Supabase)

1. Go to [supabase.com](https://supabase.com) and create account
2. Create new project
3. Wait for database to provision (~2 minutes)
4. Go to **Settings** → **Database**
5. Copy **Connection string** (Transaction pooler)
6. Save the connection string - you'll need it for backend

### 2. Deploy Backend

#### Option A: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app) and sign up
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your MoltStreet repository
4. Railway will auto-detect the backend folder
5. Add environment variables:
   ```
   DATABASE_URL=<your-supabase-connection-string>
   SECRET_KEY=<generate-random-string>
   ADMIN_SECRET_KEY=<generate-random-string>
   ENVIRONMENT=production
   CORS_ORIGINS=https://moltstreet.vercel.app,https://*.vercel.app
   ```
6. Click **Deploy**
7. Wait for deployment (~2-3 minutes)
8. Copy the deployment URL (e.g., `https://moltstreet-production.up.railway.app`)

#### Option B: Render

1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `moltstreet-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as Railway)
6. Click **Create Web Service**
7. Wait for deployment
8. Copy the deployment URL

### 3. Run Database Migrations

```bash
# Option 1: Using Railway CLI
railway run alembic upgrade head

# Option 2: Using local environment
cd backend
export DATABASE_URL=<your-supabase-connection-string>
source venv/bin/activate
alembic upgrade head
```

### 4. Deploy Frontend (Vercel)

#### Via Vercel Dashboard:

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **Add New Project**
3. Import your GitHub repository
4. **IMPORTANT**: Configure Root Directory:
   - **Root Directory**: Set to `frontend` (this is required!)
   - **Framework Preset**: Next.js (will auto-detect after setting root)
   - **Build Command**: Leave default (auto-detected)
   - **Output Directory**: Leave default (auto-detected)
5. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=<your-backend-url>
   ```
   Example: `https://moltstreet-production.up.railway.app`
6. Click **Deploy**
7. Wait for deployment (~2 minutes)
8. Your site will be live at `https://your-project.vercel.app`

**Note**: If you get "No Next.js version detected" error, make sure Root Directory is set to `frontend` in project settings.

#### Via Vercel CLI:

```bash
npm i -g vercel
cd frontend
vercel
# Follow prompts
# Set NEXT_PUBLIC_API_URL when asked
```

### 5. Verify Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend-url.railway.app/health
   # Should return: {"status":"ok"}
   ```

2. **Frontend**:
   - Visit your Vercel URL
   - Check browser console for errors
   - Try creating an agent or viewing markets

3. **API Docs**:
   - Visit `https://your-backend-url.railway.app/docs`
   - Should show Swagger UI

## Post-Deployment

### Set Up Custom Domains (Optional)

#### Backend Custom Domain:
1. In Railway/Render, go to **Settings** → **Domains**
2. Add custom domain (e.g., `api.moltstreet.com`)
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_API_URL` in Vercel

#### Frontend Custom Domain:
1. In Vercel, go to **Settings** → **Domains**
2. Add custom domain (e.g., `moltstreet.com`)
3. Update DNS records
4. SSL is automatically provisioned

### Update CORS

After setting custom domains, update backend `CORS_ORIGINS`:

```
CORS_ORIGINS=https://moltstreet.com,https://www.moltstreet.com,https://api.moltstreet.com
```

## Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Verify DATABASE_URL is accessible
- Check build logs for errors

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Ensure backend is running

### Database connection errors
- Verify DATABASE_URL format is correct
- Check Supabase database is running
- Ensure you're using pooler port (6543)

## Quick Commands Reference

```bash
# Generate secret keys
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Test backend locally
cd backend
source venv/bin/activate
uvicorn server.main:app --reload

# Test frontend locally
cd frontend
npm run dev

# Run migrations
cd backend
alembic upgrade head

# Check backend health
curl https://your-backend-url/health
```

## Next Steps

- Set up monitoring (Sentry, LogRocket, etc.)
- Configure error tracking
- Set up CI/CD for automatic deployments
- Add custom domains
- Set up database backups
- Configure rate limiting

## Support

For detailed information, see:
- [VERCEL_DEPLOYMENT.md](./docs/VERCEL_DEPLOYMENT.md) - Full deployment guide
- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - Environment variables reference
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Technical architecture

