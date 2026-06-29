import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getAdminCookieName } from '@/cookie'
import { getClientIp } from '@/lib/utils/ip'

function isIpAllowed(ip: string): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST
  if (!allowlist) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[SECURITY] ADMIN_IP_ALLOWLIST is not set. Denying all admin IP access as a fail-safe. ' +
          "Set the variable to '*' to explicitly allow all IPs, or provide a comma-separated allowlist."
      )
      return false
    }
    // In development/test, allow all IPs when the variable is absent for convenience.
    return true
  }
  if (allowlist.trim() === '*') return true
  const allowed = allowlist.split(',').map((s) => s.trim())
  return allowed.includes(ip)
}

async function verifyAdminJwt(token: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret) return false
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    if (payload.role !== 'admin') return false
    const jti = payload.jti as string | undefined
    if (!jti) return false
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      if (process.env.NODE_ENV === 'production') {
        console.error(
          '[SECURITY] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
            'Redis-backed JTI revocation is required in production. Denying admin JWT as a fail-safe.'
        )
        return false
      }
      // In development/test, skip revocation check when Redis is not configured.
      return true
    }
    const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${jti}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { result: string | null }
    if (data.result !== 'valid') return false
    return true
  } catch {
    return false
  }
}

/** Validate that a Supabase JWT cookie is at least structurally present.
 *  This is a lightweight existence/format check only — full vendor resolution
 *  happens inside each route handler.  The goal is a defense-in-depth catch-all
 *  so accidentally unprotected seller routes fail closed.
 */
function hasSupabaseSession(req: NextRequest): boolean {
  // Supabase stores its session in a cookie whose name begins with `sb-` and ends
  // with `-auth-token`.  We check for the existence of any such cookie.
  for (const [name] of req.cookies) {
    if (name.startsWith('sb-') && name.endsWith('-auth-token')) {
      return true
    }
  }
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Seller API routes ──────────────────────────────────────────────────────
  // Defense-in-depth: require a Supabase session cookie at the middleware layer.
  // Individual handlers still perform full vendor resolution.
  if (pathname.startsWith('/api/seller/')) {
    if (!hasSupabaseSession(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── Admin routes ───────────────────────────────────────────────────────────
  const ip = getClientIp(req)
  if (!isIpAllowed(ip)) {
    return new NextResponse('Forbidden: IP address not allowed.', { status: 403 })
  }

  const isPublicAdminPath =
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/refresh'

  if (!isPublicAdminPath) {
    const adminToken = req.cookies.get(getAdminCookieName())?.value
    if (!adminToken || !(await verifyAdminJwt(adminToken))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/admin/login', req.url)
      // Strict allowlist: only plain relative paths with no encoded characters,
      // no query strings, and no protocol-relative sequences are accepted.
      const SAFE_NEXT_RE = /^\/[a-zA-Z0-9/_-]*$/
      const next = SAFE_NEXT_RE.test(pathname) ? pathname : '/admin'
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/seller/:path*'],
}
