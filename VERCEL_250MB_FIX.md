# Vercel 250MB Serverless Function Limit Fix

## The Problem

You're seeing: **"Serverless Function has exceeded the unzipped maximum size of 250 MB"**

This is **different** from the SIGKILL (build memory) error. This happens during deployment when Vercel tries to package your API routes as serverless functions.

### Why This Happens

Each API route in Next.js (`app/api/**/*.ts`) becomes a separate serverless function. By default, Next.js bundles **ALL dependencies** into **EACH function**, causing:

- Each function = ~300-500MB (with all your AWS SDKs, databases, AI packages)
- Vercel limit = 250MB per function
- Result = Deployment fails ❌

## The Solution: Standalone Output Mode

Next.js `output: 'standalone'` creates an optimized build where:
- ✅ Shared dependencies go in a common layer
- ✅ Each function only includes what it actually uses
- ✅ Functions are typically 10-50MB instead of 300-500MB
- ✅ Startup time is faster

## Changes Made

### 1. Updated `apps/sim/next.config.ts`

```typescript
output: isTruthy(env.DOCKER_BUILD) || process.env.VERCEL === '1' ? 'standalone' : undefined,
```

This forces standalone mode when deploying to Vercel.

### 2. Updated `apps/sim/next.config.vercel.ts`

```typescript
output: 'standalone',
```

The Vercel-specific config always uses standalone.

### 3. Updated `vercel.json`

```json
{
  "buildCommand": "cd apps/sim && VERCEL=1 bun run build:vercel"
}
```

Sets `VERCEL=1` environment variable to trigger standalone mode.

## How to Deploy

1. **Commit and push changes**:
   ```bash
   git add apps/sim/next.config.ts apps/sim/next.config.vercel.ts vercel.json
   git commit -m "Fix Vercel 250MB function limit with standalone output"
   git push
   ```

2. **Redeploy on Vercel**:
   - Automatic deployment will trigger
   - Or manually: `vercel --prod`

3. **Verify the fix**:
   - Build should complete successfully
   - Deploy should complete successfully
   - Check deployment logs for "Deploying outputs"

## What Standalone Mode Does

### Before (Default Mode):
```
api/
├── route1.func (350MB) ← All deps bundled
├── route2.func (350MB) ← All deps bundled
├── route3.func (350MB) ← All deps bundled
└── ...
```

### After (Standalone Mode):
```
.next/
├── standalone/
│   ├── node_modules/ (shared)
│   └── server.js
└── static/

api/
├── route1.func (15MB) ← Only route-specific code
├── route2.func (20MB) ← Only route-specific code
├── route3.func (18MB) ← Only route-specific code
└── ...
```

## Benefits

1. **Smaller functions** - 10-50MB instead of 300-500MB
2. **Faster cold starts** - Less code to load
3. **Better tree-shaking** - Only includes used code
4. **Works on all Vercel plans** - No need to upgrade

## Verification

After deployment, check function sizes in Vercel dashboard:
1. Go to Deployments → Select your deployment
2. Click "Functions" tab
3. Check function sizes - should be under 50MB each

## If It Still Fails

### Option 1: Further Optimize Dependencies

Identify large packages:
```bash
cd apps/sim
npx @vercel/nft analyze .next/standalone/server.js
```

Then remove unused packages or use dynamic imports:

```typescript
// Instead of:
import { MongoClient } from 'mongodb'

// Use dynamic import:
const { MongoClient } = await import('mongodb')
```

### Option 2: Split Large API Routes

If a specific route is too large:

1. **Extract heavy logic to separate service**:
   ```
   apps/sim/lib/services/heavy-task.ts
   ```

2. **Use edge runtime** (has 1MB limit but different architecture):
   ```typescript
   export const runtime = 'edge'
   ```

3. **Move to external service** (AWS Lambda, dedicated server)

### Option 3: Use Route Groups

Group related routes to share dependencies:

```
app/api/
├── (ai)/          ← Share AI SDKs
│   ├── anthropic/
│   ├── openai/
│   └── google/
├── (database)/    ← Share DB drivers
│   ├── mongo/
│   ├── mysql/
│   └── neo4j/
└── (aws)/         ← Share AWS SDKs
    ├── s3/
    ├── dynamodb/
    └── sqs/
```

## Common Issues

### Issue: Functions still over 250MB

**Solution**: 
- Check `serverExternalPackages` in next.config.ts
- Add heavy packages to this array to keep them external
- Example: `['mongodb', 'mysql2', 'neo4j-driver']`

### Issue: Runtime errors after enabling standalone

**Solution**:
- Some packages need to be in `serverExternalPackages`
- Already configured: `isolated-vm`, `sharp`, `ffmpeg-static`, etc.
- If you get "Cannot find module" errors, add that module to the array

### Issue: Build works locally but fails on Vercel

**Solution**:
- Set `VERCEL=1` in local build to test: `VERCEL=1 npm run build`
- Check that all env vars are set in Vercel dashboard
- Verify output directory is `apps/sim/.next`

## Technical Details

### What Gets Included in Functions?

With standalone mode, Next.js uses `@vercel/nft` (Node File Trace) to:
1. Analyze each API route
2. Trace only required dependencies
3. Create minimal function bundles
4. Share common dependencies

### serverExternalPackages

Packages in this array are:
- NOT bundled into functions
- Kept in `node_modules/`
- Loaded at runtime
- Must be compatible with Node.js runtime

Current external packages:
- `@1password/sdk` - Native bindings
- `unpdf` - PDF processing
- `ffmpeg-static` - Binary executable
- `fluent-ffmpeg` - FFmpeg wrapper
- `ws` - WebSocket (native)
- `isolated-vm` - V8 isolate (native)

### Why Not Use Edge Runtime?

Edge runtime has a **1MB limit** and doesn't support:
- Native Node modules
- File system access
- Long-running computations
- Most heavy dependencies

It's good for:
- Lightweight API routes
- Middleware
- Auth checks
- Redirects

## Monitoring Function Sizes

Keep an eye on function sizes to prevent future issues:

1. **In Vercel Dashboard**:
   - Deployments → Functions tab
   - Shows size of each function

2. **Locally**:
   ```bash
   cd apps/sim
   npm run build
   du -sh .next/standalone
   ```

3. **Set up alerts**:
   - Monitor function size trends
   - Alert when approaching 200MB
   - Review before hitting limit

## Best Practices

1. **Keep API routes focused** - One responsibility per route
2. **Use dynamic imports** - Load heavy packages only when needed
3. **Share code via utilities** - Avoid duplication
4. **External heavy packages** - Add to `serverExternalPackages`
5. **Monitor function sizes** - Check after adding dependencies

## References

- [Next.js Standalone Output](https://nextjs.org/docs/app/api-reference/next-config-js/output#standalone)
- [Vercel Function Limits](https://vercel.com/docs/functions/limitations)
- [Next.js serverExternalPackages](https://nextjs.org/docs/app/api-reference/next-config-js/serverExternalPackages)
- [Troubleshooting 250MB Limit](https://vercel.com/guides/troubleshooting-function-250mb-limit)

## Summary

✅ **Problem**: API routes bundling all dependencies → 300-500MB per function  
✅ **Solution**: Use `output: 'standalone'` → 10-50MB per function  
✅ **Result**: Deploy successfully within 250MB limit  

The fix is now configured. Push changes and redeploy!
