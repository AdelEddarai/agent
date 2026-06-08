# Vercel Deployment Guide for Sim App

This guide explains how to deploy only the `sim` app (not `docs` or `realtime`) to Vercel from this monorepo.

## Memory Optimization Strategy

This project has been optimized to work within Vercel's 8GB memory limit by:

1. **Staged Build Process** - Builds sandbox bundles separately from Next.js
2. **Reduced Node Memory** - Uses 6GB instead of 8GB to prevent OOM kills
3. **Optimized Next.js Config** - Disables source maps, uses SWC minification
4. **Single-threaded Build** - Reduces parallel memory usage
5. **Aggressive Cleanup** - Removes cache between build stages

## Files Created

1. **`vercel.json`** - Main Vercel configuration with optimized build command
2. **`.vercelignore`** - Excludes unnecessary files from deployment
3. **`apps/sim/next.config.vercel.ts`** - Memory-optimized Next.js config for Vercel
4. **`apps/sim/build-vercel.sh`** - Staged build script that reduces memory usage

## Quick Start

### Option 1: Standard Vercel Free Tier (8GB Memory)

Use the optimized build configuration (already configured):

```bash
# This is what Vercel will run
cd apps/sim && chmod +x build-vercel.sh && ./build-vercel.sh
```

### Option 2: Upgrade to Pro Plan (16GB Memory)

If you have Vercel Pro, enable Enhanced Compute:

1. Go to Project Settings → General
2. Enable "Enhanced Compute" 
3. Update `vercel.json`:

```json
{
  "buildCommand": "turbo run build --filter=sim",
  "installCommand": "bun install --frozen-lockfile"
}
```

This allows the standard 8GB build without optimization tricks.

## Vercel Dashboard Setup

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository

### 2. Configure Build Settings

Vercel should automatically detect the `vercel.json` configuration, but verify:

- **Framework Preset**: Other (or None)
- **Root Directory**: Leave empty (monorepo root)
- **Build Command**: `cd apps/sim && chmod +x build-vercel.sh && ./build-vercel.sh`
- **Output Directory**: `apps/sim/.next`
- **Install Command**: `bun install --frozen-lockfile`
- **Node.js Version**: 20.x or higher

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

### Build Fails with SIGKILL (Exit Code 137) - Out of Memory

**Symptoms:**
```
error: script "build" was terminated by signal SIGKILL (Forced quit)
ERROR  sim#build: command (/vercel/path0/apps/sim) /bun1/bun run build exited (137)
```

**Root Cause:** Build process exceeds Vercel's 8GB memory limit. This happens because:
- 15+ AWS SDK packages (~2GB)
- Multiple database drivers (MongoDB, MySQL, Neo4j)
- Heavy AI SDKs (Anthropic, Google, OpenAI)
- Monaco Editor, PDF processing, FFmpeg
- Large Next.js bundle compilation

**Solutions (in order of preference):**

1. **Use the Optimized Build (Already Configured)**
   - The project now uses `apps/sim/build-vercel.sh` which:
     - Reduces Node memory to 6GB (safer than 8GB)
     - Builds in stages (sandbox → Next.js)
     - Cleans up between stages
     - Uses memory-optimized Next.js config
   - This should work on Vercel Free tier

2. **Upgrade to Vercel Pro + Enhanced Compute**
   - Vercel Pro gives 16GB memory with Enhanced Compute
   - Go to Project Settings → General → Enable "Enhanced Compute"
   - Cost: $20/month
   - [Learn more](https://vercel.com/docs/deployments/build-environments)

3. **Further Optimize Dependencies**
   - Remove unused AWS SDK clients
   - Use dynamic imports for heavy packages
   - Split large API routes into separate functions

4. **Use External Build Process**
   - Build on GitHub Actions (14GB memory)
   - Upload build artifacts to Vercel
   - Requires custom deployment workflow

**Quick Fix to Try First:**

Ensure `next.config.vercel.ts` is being used. In Vercel Dashboard, add env var:
```
NEXT_CONFIG_FILE=next.config.vercel.ts
```

Then redeploy.

### Build Command Not Found

**Solution:** Ensure `turbo` is installed as a devDependency in root `package.json`.

### Environment Variables Not Working

**Solution:** 
1. All env vars must be added in Vercel Dashboard
2. Use `NEXT_PUBLIC_` prefix for client-side variables
3. Redeploy after adding new variables

### Build Takes Too Long (>45 minutes)

**Solution:** 
1. Enable build cache in Vercel (automatic)
2. Use the optimized build script (already configured)
3. Upgrade to Pro for faster build machines

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
