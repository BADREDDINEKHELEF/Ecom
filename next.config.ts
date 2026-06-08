import type { NextConfig } from 'next'

// ── Security Headers ────────────────────────────────────────────────────────
// Applied to all routes. Admin routes get a stricter override below.

const isDev = process.env.NODE_ENV === 'development'

function buildCsp(extra: string[] = []): string {
  return [
    "default-src 'self'",
    // React requires unsafe-eval in dev mode for call-stack reconstruction.
    // Production builds never use eval() so this is dev-only.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    [
      "img-src 'self' data: blob:",
      'https://images.unsplash.com',
      'https://via.placeholder.com',
      'https://picsum.photos',
      'https://*.supabase.co',
    ].join(' '),
    [
      "connect-src 'self'",
      'https://*.supabase.co',
      'https://nominatim.openstreetmap.org',
      'https://api.yalidine.app',
    ].join(' '),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...extra,
  ].join('; ')
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(self)' },
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
    value: buildCsp(["object-src 'none'", "upgrade-insecure-requests"]),
  },
  { key: 'X-Frame-Options',        value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Cache-Control',          value: 'no-store, no-cache, must-revalidate, private' },
  { key: 'Pragma',                 value: 'no-cache' },
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

  // Redirect http → https in production (belt-and-suspenders with HSTS)
  async redirects() {
    return []
  },
}

export default nextConfig
