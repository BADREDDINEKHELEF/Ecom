import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'
import withBundleAnalyzer from '@next/bundle-analyzer'

const analyzeBundles = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

// ── Security Headers ────────────────────────────────────────────────────────
// Applied to all routes. Admin routes get a stricter override below.

// unsafe-eval is NOT required in development or production; Next.js compiles
// dependencies so they do not rely on eval/new Function at runtime. Keep
// script-src tight everywhere to avoid accidentally shipping unsafe CSPs.
const BASE_SCRIPT_SRC = "script-src 'self' 'unsafe-inline'"

function buildCsp(extra: string[] = []): string {
  return [
    "default-src 'self'",
    `${BASE_SCRIPT_SRC} https://connect.facebook.net https://www.googletagmanager.com https://analytics.tiktok.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    [
      "img-src 'self' data: blob:",
      'https://images.unsplash.com',
      'https://via.placeholder.com',
      'https://picsum.photos',
      'https://*.supabase.co',
      'https://www.facebook.com',
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
      'https://analytics.tiktok.com',
    ].join(' '),
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://nominatim.openstreetmap.org',
      'https://api.yalidine.app',
      'https://*.sentry.io',
      'https://graph.facebook.com',
      'https://www.facebook.com',
      'https://connect.facebook.net',
      'https://business-api.tiktok.com',
      'https://www.google-analytics.com',
    ].join(' '),
    "frame-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    ...extra,
  ].join('; ')
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',       value: 'on' },
  { key: 'X-Frame-Options',              value: 'DENY' },
  { key: 'X-Content-Type-Options',       value: 'nosniff' },
  { key: 'X-XSS-Protection',             value: '0' },
  { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
  { key: 'Permissions-Policy',           value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'Content-Security-Policy',   value: buildCsp() },
]

// Admin panel gets the most restrictive policy — no external images,
// no unsafe-inline scripts (admin should not be inline-script-heavy),
// no-store cache to prevent sensitive data leaking via browser cache.
const adminSecurityHeaders = [
  {
    key:   'Content-Security-Policy',
    value: buildCsp(),
  },
  { key: 'X-Frame-Options',              value: 'DENY' },
  { key: 'X-Content-Type-Options',       value: 'nosniff' },
  { key: 'X-XSS-Protection',             value: '0' },
  { key: 'Referrer-Policy',              value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
  { key: 'Cache-Control',                value: 'no-store, no-cache, must-revalidate, private' },
  { key: 'Pragma',                       value: 'no-cache' },
]

// ── Next.js Config ──────────────────────────────────────────────────────────

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Silence the "multiple lockfiles" warning from workspace root detection
  outputFileTracingRoot: process.cwd(),

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // Limit image sizes to prevent unbounded image processing
    deviceSizes:    [640, 750, 828, 1080, 1200, 1920],
    imageSizes:     [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
  },

  // Compress responses
  compress: true,

  experimental: {
    // Tree-shake heavy icon/chart packages instead of bundling them whole
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-icons'],
  },

  // Strict mode: fail build on type errors
  typescript: {
    ignoreBuildErrors: false,
  },

  async headers() {
    return [
      {
        source:  '/(.*)',
        headers: securityHeaders,
      },
      {
        source:  '/admin/:path*',
        headers: adminSecurityHeaders,
      },
    ]
  },


}

// Sentry is opt-in: if SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is not set the
// withSentryConfig wrapper is a no-op (all Sentry features are disabled).
// To enable: add SENTRY_DSN and SENTRY_AUTH_TOKEN to your Vercel env vars.
export default withSentryConfig(analyzeBundles(nextConfig), {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Suppress the "Sentry CLI not configured" warning when DSN is not set
  silent: !process.env.SENTRY_DSN,

  // Upload source maps to Sentry for readable stack traces in production
  widenClientFileUpload: true,

  // Disable the Sentry telemetry that phones home about SDK usage
  telemetry: false,

  // Required to avoid conflict with Next.js internal route collection
  tunnelRoute: '/monitoring-tunnel',

  // Tree-shake Sentry logger statements in production bundles
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
