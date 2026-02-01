# Environment Variables Guide

This document describes all environment variables needed for MoltStreet deployment.

## Frontend (Vercel)

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.moltstreet.com` | Yes |

### Setting in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the variable with appropriate value
4. Select environments (Production, Preview, Development)
5. Redeploy if needed

## Backend (Railway/Render/Fly.io)

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres.xxx:password@host:5432/db` | Yes |
| `SECRET_KEY` | Secret key for JWT/sessions | Generate strong random string | Yes |
| `ENVIRONMENT` | Environment name | `production` | Yes |
| `ADMIN_SECRET_KEY` | Admin API key | Generate strong random string | Yes |

### Optional Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `*` | No |
| `TRADING_FEE_RATE` | Trading fee percentage | `0.01` (1%) | No |
| `MARKET_CREATION_FEE` | Fee to create a market | `10.00` | No |
| `SETTLEMENT_FEE_RATE` | Settlement fee percentage | `0.02` (2%) | No |
| `MODERATOR_PLATFORM_SHARE` | Moderator share of platform fees | `0.30` (30%) | No |
| `MODERATOR_WINNER_FEE` | Additional fee from winner profits | `0.005` (0.5%) | No |

### Generating Secrets

#### SECRET_KEY and ADMIN_SECRET_KEY

```bash
# Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### CORS Configuration Examples

#### Development (allow all):
```
CORS_ORIGINS=*
```

#### Production (specific domains):
```
CORS_ORIGINS=https://moltstreet.vercel.app,https://www.moltstreet.com,https://moltstreet.com
```

#### With preview deployments:
```
CORS_ORIGINS=https://moltstreet.vercel.app,https://*.vercel.app
```

## Database (Supabase)

### Getting DATABASE_URL

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **Transaction pooler** (recommended for serverless)
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with your database password

### Connection String Format

```
postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Important**: Use the **Transaction pooler** port (6543) for serverless deployments, not the direct connection port (5432).

## Environment-Specific Examples

### Local Development

**Frontend** (`.env.local` in `frontend/`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`.env` in `backend/`):
```
DATABASE_URL=sqlite+aiosqlite:///./moltstreet.db
SECRET_KEY=dev-secret-change-in-production
ENVIRONMENT=development
CORS_ORIGINS=*
```

### Production

**Frontend** (Vercel):
```
NEXT_PUBLIC_API_URL=https://api.moltstreet.com
```

**Backend** (Railway/Render):
```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
SECRET_KEY=<generated-secret-key>
ADMIN_SECRET_KEY=<generated-admin-secret>
ENVIRONMENT=production
CORS_ORIGINS=https://moltstreet.vercel.app,https://www.moltstreet.com
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets** regularly (especially if compromised)
4. **Use strong random strings** (at least 32 characters)
5. **Restrict CORS** in production to specific domains
6. **Use HTTPS** for all production URLs
7. **Enable database SSL** (Supabase does this automatically)

## Verification

### Check Frontend Environment Variables

```bash
# In browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
```

### Check Backend Environment Variables

```bash
# Health check endpoint should work
curl https://api.moltstreet.com/health

# Check API docs
curl https://api.moltstreet.com/docs
```

## Troubleshooting

### Frontend can't connect to backend

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check that backend is accessible at that URL
3. Verify CORS is configured to allow your frontend domain
4. Check browser console for CORS errors

### Database connection fails

1. Verify `DATABASE_URL` is correct
2. Check that password is properly URL-encoded
3. Ensure you're using the pooler port (6543) for serverless
4. Verify database is accessible from your backend platform

### CORS errors

1. Check `CORS_ORIGINS` includes your frontend domain
2. Verify domain matches exactly (including https://)
3. Check for trailing slashes
4. Ensure credentials are set correctly
