# Vercel Deployment Guide for Sim App

This guide explains how to deploy only the `sim` app (not `docs` or `realtime`) to Vercel from this monorepo.

## Files Created

1. **`vercel.json`** - Configures Vercel to build only the `sim` app
2. **`.vercelignore`** - Excludes unnecessary files from deployment

## Vercel Dashboard Setup

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository

### 2. Configure Build Settings

Vercel should automatically detect the `vercel.json` configuration, but verify:

- **Framework Preset**: Other (or None)
- **Root Directory**: Leave empty (monorepo root)
- **Build Command**: `turbo run build --filter=sim`
- **Output Directory**: `apps/sim/.next`
- **Install Command**: `bun install`

### 3. Environment Variables

Add all required environment variables from `apps/sim/.env` to Vercel:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=...  # Generate: openssl rand -hex 32
BETTER_AUTH_URL=https://your-domain.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# NextJS
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_DISABLE_REALTIME=true

# Security
ENCRYPTION_KEY=...  # Generate: openssl rand -hex 32
INTERNAL_API_SECRET=...  # Generate: openssl rand -hex 32
API_ENCRYPTION_KEY=...  # Generate: openssl rand -hex 32
```

#### Important Notes

- Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your actual Vercel domain
- Set `NEXT_PUBLIC_DISABLE_REALTIME=true` since realtime server won't be deployed
- Update Google OAuth redirect URIs to: `https://your-domain.vercel.app/api/auth/callback/google`

### 4. Advanced Settings (Optional)

- **Node.js Version**: 20.x or higher
- **Build & Output Settings**: Already configured via `vercel.json`

## Monorepo Configuration

The `vercel.json` file tells Vercel:

```json
{
  "buildCommand": "turbo run build --filter=sim",
  "installCommand": "bun install",
  "framework": null,
  "outputDirectory": "apps/sim/.next"
}
```

- **`--filter=sim`**: Only builds the `sim` app (excludes `docs` and `realtime`)
- **`bun install`**: Installs all workspace dependencies
- **`outputDirectory`**: Points to the Next.js build output

## What Gets Deployed

✅ **Included:**
- `apps/sim` - Main application
- `packages/*` - Shared packages (db, auth, logger, utils, etc.)
- Root `node_modules`

❌ **Excluded:**
- `apps/docs` - Documentation site
- `apps/realtime` - Socket.IO server
- Test files
- Development tools

## Troubleshooting

### Build Fails with "Cannot find module"

**Solution:** Make sure all workspace dependencies are properly linked in `apps/sim/package.json`:

```json
{
  "dependencies": {
    "@sim/db": "workspace:*",
    "@sim/auth": "workspace:*",
    "@sim/logger": "workspace:*",
    // etc...
  }
}
```

### Build Command Not Found

**Solution:** Ensure `turbo` is installed as a devDependency in root `package.json`.

### Environment Variables Not Working

**Solution:** 
1. All env vars must be added in Vercel Dashboard
2. Use `NEXT_PUBLIC_` prefix for client-side variables
3. Redeploy after adding new variables

### Build Timeout

**Solution:** The build has high memory requirements. In `vercel.json`, you can't set memory limits directly, but you can:
1. Contact Vercel support for increased limits
2. Optimize the build by removing unused dependencies

### Realtime Features Not Working

**Solution:** This is expected! The `realtime` server is not deployed. Make sure:
- `NEXT_PUBLIC_DISABLE_REALTIME=true` is set
- Collaborative features will be disabled

## Post-Deployment

### Update OAuth Redirect URIs

After deployment, update your OAuth providers:

**Google Cloud Console:**
1. Go to Credentials → OAuth 2.0 Client IDs
2. Add to Authorized redirect URIs:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```

**GitHub OAuth (if used):**
1. Go to Settings → Developer settings → OAuth Apps
2. Update Authorization callback URL:
   ```
   https://your-domain.vercel.app/api/auth/callback/github
   ```

### Database Migrations

Run migrations manually after first deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Connect to your deployment
vercel env pull

# Run migrations
cd apps/sim
bun run db:migrate
```

## Local Testing

Test the production build locally:

```bash
# Build only sim app
turbo run build --filter=sim

# Start production server
cd apps/sim
bun run start
```

## Continuous Deployment

Once configured, Vercel will automatically:
- Deploy on every push to `main` (production)
- Create preview deployments for pull requests
- Only rebuild when `apps/sim` or `packages/*` change

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test the build locally first
4. Check [Vercel Documentation](https://vercel.com/docs)
