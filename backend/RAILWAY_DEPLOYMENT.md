# Railway Deployment Guide for MoltStreet Backend

This guide walks you through deploying the MoltStreet backend to Railway.

## Prerequisites

- GitHub account with MoltStreet repository
- Railway account ([railway.app](https://railway.app))
- Supabase account with database set up

## Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

## Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your **MoltStreet** repository
6. Railway will automatically detect it's a Python project

## Step 3: Configure Service

### Set Root Directory

1. In your Railway project, click on the service
2. Go to **Settings** → **Root Directory**
3. Set to: `backend`
4. Click **Save**

### Configure Build Settings

Railway should auto-detect:
- **Builder**: NIXPACKS (auto-detected)
- **Start Command**: `bash start.sh` (from railway.json)

If not, manually set:
- **Start Command**: `bash start.sh`

## Step 4: Set Environment Variables

Go to **Variables** tab and add:

### Required Variables

```bash
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=<generate-strong-random-string>
ADMIN_SECRET_KEY=<generate-strong-random-string>
ENVIRONMENT=production
```

### Optional Variables (with defaults)

```bash
CORS_ORIGINS=https://moltstreet.vercel.app,https://*.vercel.app
TRADING_FEE_RATE=0.01
MARKET_CREATION_FEE=10.00
SETTLEMENT_FEE_RATE=0.02
MODERATOR_PLATFORM_SHARE=0.30
MODERATOR_WINNER_FEE=0.005
```

### Generate Secret Keys

```bash
# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Using OpenSSL
openssl rand -base64 32
```

### Get DATABASE_URL from Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **Transaction pooler** tab
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with your database password

**Important**: Use the **Transaction pooler** port (6543), not the direct connection port (5432).

## Step 5: Deploy

1. Railway will automatically start building when you:
   - Push to the connected branch, OR
   - Click **"Deploy"** button

2. Monitor the deployment:
   - Go to **Deployments** tab
   - Watch the build logs
   - Wait for "Deploy successful"

3. Get your deployment URL:
   - Go to **Settings** → **Networking**
   - Copy the **Public Domain** (e.g., `moltstreet-production.up.railway.app`)

## Step 6: Verify Deployment

### Health Check

```bash
curl https://your-app-name.up.railway.app/health
```

Should return:
```json
{"status":"ok"}
```

### API Documentation

Visit:
```
https://your-app-name.up.railway.app/docs
```

You should see the Swagger UI.

### Test API Endpoint

```bash
curl https://your-app-name.up.railway.app/
```

Should return:
```json
{
  "name": "MoltStreet API",
  "version": "0.1.0",
  "docs": "/docs"
}
```

## Step 7: Run Database Migrations

Migrations run automatically via `start.sh` script on each deployment. However, you can also run them manually:

### Option 1: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Run migrations
railway run alembic upgrade head
```

### Option 2: Railway Dashboard

1. Go to your service
2. Click **"Deployments"**
3. Click on latest deployment
4. Click **"Shell"** tab
5. Run: `alembic upgrade head`

## Step 8: Configure Custom Domain (Optional)

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. For custom domain:
   - Enter your domain (e.g., `api.moltstreet.com`)
   - Update DNS records as instructed
   - Wait for SSL certificate (automatic)

## Configuration Files

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bash start.sh",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### start.sh

This script:
1. Runs database migrations (`alembic upgrade head`)
2. Starts the FastAPI server

### runtime.txt

Specifies Python version (3.11)

## Troubleshooting

### Build Fails

**Issue**: Build errors during deployment

**Solutions**:
- Check build logs in Railway dashboard
- Verify `requirements.txt` is correct
- Ensure Python version is compatible
- Check that all dependencies are listed

### Server Won't Start

**Issue**: Service starts but crashes

**Solutions**:
- Check deployment logs
- Verify all environment variables are set
- Check DATABASE_URL is correct
- Ensure migrations can run successfully

### Database Connection Errors

**Issue**: Can't connect to database

**Solutions**:
- Verify DATABASE_URL format is correct
- Check Supabase database is running
- Ensure using pooler port (6543)
- Check database password is correct
- Verify IP allowlist in Supabase (if enabled)

### Migrations Fail

**Issue**: `alembic upgrade head` fails

**Solutions**:
- Check database connection
- Verify DATABASE_URL is set correctly
- Check migration files exist in `alembic/versions/`
- Review migration logs

### CORS Errors

**Issue**: Frontend can't connect to backend

**Solutions**:
- Verify `CORS_ORIGINS` includes your frontend domain
- Check domain matches exactly (including https://)
- Ensure no trailing slashes
- Update CORS_ORIGINS and redeploy

## Monitoring

### View Logs

1. Go to your service in Railway
2. Click **"Deployments"**
3. Click on a deployment
4. View **"Logs"** tab

### Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Request count

View in **Metrics** tab of your service.

## Cost

### Free Tier

- $5 credit per month
- ~500 hours of runtime
- Perfect for development/testing

### Paid Plans

- Pay-as-you-go after free credit
- $0.000463 per GB RAM-hour
- $0.000231 per vCPU-hour

## Environment-Specific Configuration

### Development

Use Railway's **Preview** environments for feature branches.

### Production

Use Railway's **Production** environment for main branch.

Set different environment variables for each:
- Production: `ENVIRONMENT=production`
- Preview: `ENVIRONMENT=staging`

## Next Steps

1. ✅ Backend deployed to Railway
2. ⏭️ Deploy frontend to Vercel
3. ⏭️ Update frontend `NEXT_PUBLIC_API_URL`
4. ⏭️ Test end-to-end
5. ⏭️ Set up custom domains
6. ⏭️ Configure monitoring

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Supabase Documentation](https://supabase.com/docs)

## Support

If you encounter issues:
1. Check Railway logs
2. Review this guide
3. Check Railway status page
4. Join Railway Discord for help
