import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Edge Middleware — runs before every matching request on the CDN edge.
 *
 * Protects /admin/* and /api/admin/* so that a forgotten requireAdmin()
 * call in a new route handler never silently exposes admin functionality.
 * This is defence-in-depth on top of the per-route requireAdmin() checks.
 *
 * The /api/admin/login route is explicitly excluded — it's the auth endpoint.
 * The /api/admin/totp route is excluded — used during initial TOTP setup.
 */

const ADMIN_TOKEN_COOKIE = 'casbah_admin_token'

// Routes that must bypass the auth check
const PUBLIC_ADMIN_ROUTES = new Set([
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/totp',
  '/admin/login',
])

function isPublicAdminRoute(pathname: string): boolean {
  return PUBLIC_ADMIN_ROUTES.has(pathname)
}

async function verifyAdminJwt(token: string): Promise<boolean> {
  const raw = process.env.ADMIN_JWT_SECRET
  if (!raw) return false
  try {
    const secret = new TextEncoder().encode(raw)
    const { payload } = await jwtVerify(token, secret)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only intercept admin routes
  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi  = pathname.startsWith('/api/admin')
  if (!isAdminPage && !isAdminApi) return NextResponse.next()

  // Allow public admin routes through
  if (isPublicAdminRoute(pathname)) return NextResponse.next()

  const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value
  const valid  = token ? await verifyAdminJwt(token) : false

  if (!valid) {
    if (isAdminApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/admin/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // IP allowlist enforcement (optional — set ADMIN_IP_ALLOWLIST=1.2.3.4,5.6.7.8)
  const allowlist = process.env.ADMIN_IP_ALLOWLIST
  if (allowlist) {
    const allowed = allowlist.split(',').map((s) => s.trim())
    const clientIp =
      req.headers.get('x-real-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      '0.0.0.0'
    if (!allowed.includes(clientIp)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
}
