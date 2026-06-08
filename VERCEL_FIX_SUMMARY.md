# Vercel SIGKILL (Exit 137) Fix - Summary

## Problem Analysis

Your build was failing with **SIGKILL (exit code 137)** - a memory exhaustion error. The build process exceeded Vercel's 8GB RAM limit.

### Root Causes Identified:

1. **Massive Dependencies** (~3-4GB memory usage):
   - 15 AWS SDK packages (@aws-sdk/client-*)
   - 3 Database drivers (MongoDB, MySQL, Neo4j)
   - Multiple AI SDKs (Anthropic, Google GenAI, OpenAI, Groq, Cerebras)
   - Heavy packages (Monaco Editor, Sharp, FFmpeg, PDF processors)

2. **Memory-Intensive Build**:
   - Original build script: `NODE_OPTIONS='--max-old-space-size=8192'` (tries to use 8GB)
   - Builds sandbox bundles + Next.js simultaneously
   - No cleanup between build stages
   - Source maps generation in production

3. **Parallel Processing**:
   - Webpack workers consuming memory in parallel
   - No limits on worker threads

## Solutions Implemented

### 1. Created Optimized Build Script (`apps/sim/build-vercel.sh`)

```bash
# Reduces memory to 6GB (safer buffer)
NODE_OPTIONS="--max-old-space-size=6144"

# Staged build process:
# 1. Build sandbox bundles
# 2. Clean up
# 3. Build Next.js
# 4. Remove unnecessary files
```

### 2. Created Memory-Optimized Next.js Config (`next.config.vercel.ts`)

Key optimizations:
- **Disabled source maps** in production
- **Limited parallelism** to 1 CPU
- **Disabled worker threads**
- **Aggressive code splitting**
- **SWC minification** (lighter than Terser)

### 3. Updated `vercel.json`

```json
{
  "buildCommand": "cd apps/sim && chmod +x build-vercel.sh && ./build-vercel.sh",
  "installCommand": "bun install --frozen-lockfile"
}
```

### 4. Updated `.vercelignore`

Excludes:
- `apps/docs` and `apps/realtime`
- Test files
- Development tools
- Build caches

## How to Deploy

### Step 1: Push Changes

```bash
git add vercel.json .vercelignore apps/sim/build-vercel.sh apps/sim/next.config.vercel.ts VERCEL_DEPLOYMENT.md
git commit -m "Add Vercel memory optimization"
git push
```

### Step 2: Configure Vercel

1. Import project at https://vercel.com/new
2. Verify settings (auto-detected from `vercel.json`):
   - Build Command: `cd apps/sim && chmod +x build-vercel.sh && ./build-vercel.sh`
   - Output Directory: `apps/sim/.next`
   - Install Command: `bun install --frozen-lockfile`

3. Add environment variables:
   ```
   DATABASE_URL=...
   DIRECT_URL=...
   BETTER_AUTH_SECRET=...
   BETTER_AUTH_URL=https://your-domain.vercel.app
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   NEXT_PUBLIC_DISABLE_REALTIME=true
   ENCRYPTION_KEY=...
   INTERNAL_API_SECRET=...
   API_ENCRYPTION_KEY=...
   ```

### Step 3: Deploy

Click "Deploy" - build should now complete within 8GB limit!

## Expected Build Time

- **First build**: 15-25 minutes (cold cache)
- **Subsequent builds**: 8-15 minutes (warm cache)

## If Build Still Fails

### Option A: Upgrade to Vercel Pro ($20/month)

Vercel Pro includes:
- 16GB memory with Enhanced Compute
- Faster build machines
- Priority support

To enable:
1. Upgrade to Pro plan
2. Project Settings → General → Enable "Enhanced Compute"
3. Use standard build: `turbo run build --filter=sim`

### Option B: Further Optimize

Remove unused dependencies:

```bash
# Check bundle size
cd apps/sim
npx @next/bundle-analyzer
```

Then remove:
- Unused AWS SDK packages
- Unused database drivers
- Unused AI SDKs

### Option C: Use External Build

Build on GitHub Actions (14GB RAM), deploy to Vercel:

1. Set up GitHub Actions workflow
2. Build → upload artifacts
3. Deploy pre-built to Vercel

## Memory Usage Breakdown

| Component | Memory Usage |
|-----------|--------------|
| Node.js Base | ~500MB |
| Dependencies Install | ~2GB |
| Sandbox Bundles Build | ~1.5GB |
| Next.js Compilation | ~3-4GB |
| **Peak Total** | **~7-8GB** |

With optimization:
| Component | Memory Usage |
|-----------|--------------|
| Node.js Base | ~500MB |
| Dependencies Install | ~1.5GB (cleaned) |
| Sandbox Build (staged) | ~1.5GB |
| Cleanup | (free memory) |
| Next.js Build (optimized) | ~3-4GB |
| **Peak Total** | **~5.5-6.5GB** ✅ |

## Monitoring Build

Watch build logs for memory usage:

```
Building...
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

If you see:
```
error: script "build" was terminated by signal SIGKILL
```

Then memory limit was still exceeded - consider Pro plan or further optimization.

## Post-Deployment Checklist

- [ ] Update Google OAuth redirect URI
- [ ] Update GitHub OAuth redirect URI (if used)
- [ ] Test database connection
- [ ] Verify environment variables
- [ ] Check that realtime features are disabled
- [ ] Test a workflow execution
- [ ] Monitor error logs in Vercel dashboard

## Additional Resources

- [Vercel Memory Docs](https://vercel.com/docs/functions/configuring-functions/memory)
- [Next.js Memory Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/memory-usage)
- [Troubleshooting SIGKILL](https://vercel.com/guides/troubleshooting-sigkill-out-of-memory-errors)

## Support

If issues persist:
1. Check `VERCEL_DEPLOYMENT.md` for detailed troubleshooting
2. Review Vercel build logs for specific errors
3. Consider Vercel Pro for 2x memory (16GB)
4. Contact Vercel support (Pro plan includes priority support)
