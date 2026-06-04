import { NextRequest } from 'next/server'

/**
 * Extracts the real client IP from a Next.js request.
 *
 * Security model:
 * - On Vercel: `x-real-ip` is injected by the edge network and cannot be
 *   spoofed by the client. We trust it unconditionally.
 * - On other hosts: if TRUSTED_PROXY_COUNT is set, we take the Nth entry
 *   from the right of X-Forwarded-For (the one added by our trusted proxy).
 *   If not set, we fall back to x-real-ip only — never the raw XFF header.
 *
 * Never trust the raw X-Forwarded-For from an untrusted source — it is a
 * client-controlled header that can be set to any value.
 */
export function getClientIp(req: NextRequest): string {
  // Vercel / trusted reverse proxy sets x-real-ip reliably
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // Configurable trusted proxy count (e.g. TRUSTED_PROXY_COUNT=1 for a
  // single nginx in front). Only used when x-real-ip is absent.
  const proxyCount = parseInt(process.env.TRUSTED_PROXY_COUNT ?? '0', 10)
  if (proxyCount > 0) {
    const xff = req.headers.get('x-forwarded-for')
    if (xff) {
      const ips = xff.split(',').map((s) => s.trim())
      // Take the entry added by our rightmost trusted proxy
      const idx = ips.length - proxyCount
      if (idx >= 0 && ips[idx]) return ips[idx]
    }
  }

  return '0.0.0.0'
}
