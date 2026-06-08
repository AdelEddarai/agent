import type { NextConfig } from 'next'
import { env, isTruthy } from './lib/core/config/env'
import { isDev } from './lib/core/config/feature-flags'
import {
  getChatEmbedCSPPolicy,
  getFormEmbedCSPPolicy,
  getMainCSPPolicy,
  getWorkflowExecutionCSPPolicy,
} from './lib/core/security/csp'

/**
 * Optimized Next.js configuration for Vercel deployment
 * Reduces memory usage during build and function bundle sizes
 */

const isVercelBuild = process.env.VERCEL === '1'

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  
  // CRITICAL: Use standalone output to avoid 250MB function limit
  output: 'standalone',
  
  // Optimize build memory usage
  ...(isVercelBuild && {
    productionBrowserSourceMaps: false,
    swcMinify: true,
  }),
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.stability.ai',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      ...(process.env.NEXT_PUBLIC_BRAND_LOGO_URL
        ? (() => {
            try {
              return [
                {
                  protocol: 'https' as const,
                  hostname: new URL(process.env.NEXT_PUBLIC_BRAND_LOGO_URL!).hostname,
                },
              ]
            } catch {
              return []
            }
          })()
        : []),
      ...(process.env.NEXT_PUBLIC_BRAND_FAVICON_URL
        ? (() => {
            try {
              return [
                {
                  protocol: 'https' as const,
                  hostname: new URL(process.env.NEXT_PUBLIC_BRAND_FAVICON_URL!).hostname,
                },
              ]
            } catch {
              return []
            }
          })()
        : []),
    ],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },

  output: isTruthy(env.DOCKER_BUILD) ? 'standalone' : undefined,
  
  serverExternalPackages: [
    '@1password/sdk',
    'unpdf',
  ],
  
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/sharp/**/*',
      './node_modules/@img/**/*',
    ],
  },
  
  experimental: {
    optimizeCss: true,
    preloadEntriesOnStart: false,
    
    // Memory optimization for Vercel
    ...(isVercelBuild && {
      workerThreads: false,
      cpus: 1,
      memoryBasedWorkersCount: false,
    }),
    
    // Aggressive package optimization
    optimizePackageImports: [
      'lodash',
      'framer-motion',
      'reactflow',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-slider',
      'streamdown',
      'zod',
      'lucide-react',
      '@tanstack/react-query',
      'date-fns',
    ],
  },
  
  ...(isDev && {
    serverActions: {
      allowedOrigins: [
        ...(env.NEXT_PUBLIC_APP_URL
          ? (() => {
              try {
                return [new URL(env.NEXT_PUBLIC_APP_URL).host]
              } catch {
                return []
              }
            })()
          : []),
        'localhost:3000',
        'localhost:3001',
      ],
    },
  }),
  
  transpilePackages: [
    'prettier',
    '@react-email/components',
    '@react-email/render',
    '@t3-oss/env-nextjs',
    '@t3-oss/env-core',
    '@sim/db',
    'better-auth-harmony',
  ],
  
  // Webpack optimizations for Vercel
  webpack: (config, { isServer, webpack }) => {
    if (isVercelBuild) {
      // Extreme memory reduction
      config.optimization = config.optimization || {}
      config.optimization.minimize = true
      config.optimization.splitChunks = false // Disable to save memory
      config.optimization.runtimeChunk = false
      
      // Limit parallelism to save memory
      config.parallelism = 1
      
      // Disable cache to save memory
      config.cache = false
      
      // Reduce module resolution complexity
      config.snapshot = {
        managedPaths: [],
        immutablePaths: [],
      }
    }
    
    return config
  },
  
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept' },
        ],
      },
      {
        source: '/api/workflows/:id/execute',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
          {
            key: 'Content-Security-Policy',
            value: getWorkflowExecutionCSPPolicy(),
          },
        ],
      },
      {
        source: '/((?!_next|_vercel|api|favicon.ico|w/.*|workspace/.*|api/tools/drive).*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/(w/.*|workspace/.*|api/tools/drive|_next/.*|_vercel/.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
      {
        source: '/(.*)\\.map$',
        headers: [
          {
            key: 'x-robots-tag',
            value: 'noindex',
          },
        ],
      },
      {
        source: '/chat/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: getChatEmbedCSPPolicy(),
          },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
        ],
      },
      {
        source: '/form/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: getFormEmbedCSPPolicy(),
          },
          { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
          { key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' },
        ],
      },
      {
        source: '/((?!workspace|chat|form|login|signup|$).*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: getMainCSPPolicy(),
          },
        ],
      },
    ]
  },
  
  async redirects() {
    const redirects = []
    
    redirects.push(
      {
        source: '/discord',
        destination: 'https://discord.gg/Hr4UWYEcTT',
        permanent: false,
      },
      {
        source: '/x',
        destination: 'https://x.com/simdotai',
        permanent: false,
      },
      {
        source: '/github',
        destination: 'https://github.com/simstudioai/sim',
        permanent: false,
      },
      {
        source: '/team',
        destination: 'https://cal.com/emirkarabeg/sim-team',
        permanent: false,
      },
      {
        source: '/careers',
        destination: 'https://jobs.ashbyhq.com/sim',
        permanent: true,
      }
    )
    
    redirects.push(
      {
        source: '/building/:path*',
        destination: 'https://www.sim.ai/blog/:path*',
        permanent: true,
      },
      {
        source: '/studio/:path*',
        destination: 'https://www.sim.ai/blog/:path*',
        permanent: true,
      }
    )
    
    redirects.push(
      {
        source: '/rss.xml',
        destination: '/blog/rss.xml',
        permanent: true,
      },
      {
        source: '/sitemap-images.xml',
        destination: '/blog/sitemap-images.xml',
        permanent: true,
      }
    )
    
    return redirects
  },
  
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
      },
      {
        source: '/r/:shortCode',
        destination: 'https://go.trybeluga.ai/:shortCode',
      },
    ]
  },
}

export default nextConfig
