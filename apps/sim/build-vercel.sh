#!/bin/bash

# Optimized build script for Vercel deployment
# Reduces memory usage by building in stages and cleaning up between stages

set -e

echo "🚀 Starting optimized Vercel build..."

# Set memory-optimized Node options
export NODE_OPTIONS="--max-old-space-size=6144 --max-semi-space-size=128"

# Use Vercel-optimized Next.js config
export NEXT_CONFIG_FILE="next.config.vercel.ts"

echo "📦 Step 1/3: Building sandbox bundles..."
bun run ./lib/execution/sandbox/bundles/build.ts

# Clean up after sandbox build
echo "🧹 Cleaning up sandbox build artifacts..."
rm -rf node_modules/.cache 2>/dev/null || true

echo "🏗️  Step 2/3: Building Next.js application..."
# Use Next.js with reduced memory profile
next build

echo "✨ Step 3/3: Optimizing build output..."
# Remove unnecessary files from build
find .next -name "*.map" -type f -delete 2>/dev/null || true
find .next/static -name "*.LICENSE.txt" -type f -delete 2>/dev/null || true

echo "✅ Build completed successfully!"
