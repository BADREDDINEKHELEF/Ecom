import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getAdminCookieName } from '@/cookie'
import { getClientIp } from '@/lib/utils/ip'
import { isSessionRevoked } from '@/lib/auth/sellerSessions'

const SUPABASE_AUTH_COOKIE_NAME = process.env.NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + (4 - (input.length % 4)) % 4,
    '='
  )
  try {
    return atob(padded)
  } catch {
    return ''
  }
}

/** Lightweight structural validation of a Supabase auth JWT cookie.
 *  Verifies the cookie looks like a JWT (3 base64url segments), decodes the
 *  payload, checks `exp` and `iss`, and confirms the `sub` claim is a UUID.
 *  This prevents trivial fake-cookie bypasses without the cost of a full
 *  cryptographic verification on every request (handlers do that).
 */
function isValidSupabaseSessionCookie(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const payloadStr = base64UrlDecode(parts[1])
  if (!payloadStr) return false
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(payloadStr) as Record<string, unknown>
  } catch {
    return false
  }
  if (typeof payload.exp !== 'number') return false
  if (payload.exp * 1000 < Date.now()) return false
  const issuer = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (issuer && payload.iss !== issuer) return false
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  if (!sub) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)
}

function findSupabaseSessionCookie(req: NextRequest): string | undefined {
  // Prefer exact env-configured name. Supabase may chunk large sessions into
  // multiple cookies (sb-...-auth-token.0, sb-...-auth-token.1). For the
  // middleware gate we only need to validate the first chunk; the handler will
  // reassemble the full session.
  const preferredName = SUPABASE_AUTH_COOKIE_NAME
  if (preferredName) {
    const exact = req.cookies.get(preferredName)?.value
    if (exact) return exact
  }
  for (const [name, cookie] of req.cookies) {
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      return cookie.value
    }
  }
  return undefined
}

function hasValidSupabaseSession(req: NextRequest): boolean {
  const cookieValue = findSupabaseSessionCookie(req)
  if (!cookieValue) return false
  return isValidSupabaseSessionCookie(cookieValue)
}

/** Extracts the user id (sub claim) from the Supabase session cookie without
 *  verifying the signature. The handlers perform full verification; this is
 *  only used for an early revocation check in the seller middleware gate.
 */
function getSupabaseSessionUserId(req: NextRequest): string | null {
  const cookieValue = findSupabaseSessionCookie(req)
  if (!cookieValue) return null
  const parts = cookieValue.split('.')
  if (parts.length !== 3) return null
  const payloadStr = base64UrlDecode(parts[1])
  if (!payloadStr) return null
  try {
    const payload = JSON.parse(payloadStr) as Record<string, unknown>
    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    if (!sub) return null
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)) return null
    return sub
  } catch {
    return null
  }
}

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

async function verifyAdminJwt(token: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret) return { valid: false, reason: 'missing_secret' }
    let payload
    try {
      const verified = await jwtVerify(token, new TextEncoder().encode(secret))
      payload = verified.payload
    } catch (e) {
      return { valid: false, reason: `jwt_verify_failed_${e instanceof Error ? e.message : 'unknown'}` }
    }
    if (payload.role !== 'admin') return { valid: false, reason: 'invalid_role' }
    const jti = payload.jti as string | undefined
    if (!jti) return { valid: false, reason: 'missing_jti' }

    const rawUrl = process.env.UPSTASH_REDIS_REST_URL
    const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!rawUrl || !rawToken) {
      if (process.env.NODE_ENV === 'production') {
        return { valid: false, reason: 'missing_redis_env_in_production' }
      }
      return { valid: true }
    }

    const cleanUrl = rawUrl.replace(/^["'](.*)["']$/, '$1').replace(/\/+$/, '')
    const cleanToken = rawToken.replace(/^["'](.*)["']$/, '$1')

    const url = `${cleanUrl}/get/${encodeURIComponent(jti)}?nocache=${Date.now()}`
    let res
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Cache-Control': 'no-store',
        },
        cache: 'no-store',
      })
    } catch (e) {
      return { valid: false, reason: `redis_fetch_error_${e instanceof Error ? e.message : 'unknown'}` }
    }
    if (!res.ok) {
      return { valid: false, reason: `redis_status_${res.status}` }
    }
    let data
    try {
      data = (await res.json()) as { result: string | null }
    } catch {
      return { valid: false, reason: 'redis_invalid_json' }
    }
    if (data.result !== 'valid') {
      return { valid: false, reason: `redis_jti_state_${data.result}` }
    }
    return { valid: true }
  } catch (e) {
    return { valid: false, reason: `unexpected_${e instanceof Error ? e.message : 'unknown'}` }
  }
}



// Public seller-facing auth endpoints that must remain reachable before the
// user has a Supabase session (registration, password reset, email OTP).
const PUBLIC_SELLER_API_PATHS = new Set([
  '/api/seller/register',
  '/api/seller/forgot-password',
  '/api/seller/verify-otp',
  '/api/seller/send-email-otp',
  '/api/seller/verify-email-otp',
  '/api/seller/check-slug',
])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Seller API routes ──────────────────────────────────────────────────────
  // Defense-in-depth: require a Supabase session cookie at the middleware layer.
  // Individual handlers still perform full vendor resolution.
  // Public auth endpoints are excluded so unauthenticated users can register
  // or reset their password.
  if (pathname.startsWith('/api/seller/')) {
    if (PUBLIC_SELLER_API_PATHS.has(pathname)) {
      return NextResponse.next()
    }
    if (!hasValidSupabaseSession(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Defense-in-depth: check seller session revocation at the edge before
    // the handler runs. A missing row means a new/untracked device and is
    // allowed; the handler's full Supabase auth check remains authoritative.
    const sellerUserId = getSupabaseSessionUserId(req)
    if (sellerUserId) {
      try {
        const revoked = await isSessionRevoked(
          sellerUserId,
          req.headers.get('user-agent') ?? 'unknown',
          getClientIp(req),
        )
        if (revoked) {
          return NextResponse.json({ error: 'Session revoked' }, { status: 401 })
        }
      } catch {
        // Fail open: if the revocation check errors, let the handler decide.
      }
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
    const authResult = adminToken ? await verifyAdminJwt(adminToken) : { valid: false, reason: 'no_token' }
    if (!adminToken || !authResult.valid) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'MIDDLEWARE_AUTH_FAILED', reason: authResult.reason },
          {
            status: 401,
            headers: {
              'X-Auth-Denied-By': 'Middleware',
              'X-Token-Present': adminToken ? 'true' : 'false',
              'X-Token-Valid': authResult.valid ? 'true' : authResult.reason ?? 'false',
            },
          }
        )
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
