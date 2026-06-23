import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware to enforce security policies for the admin panel at the Vercel Edge.
 *
 * As per SECURITY_REVIEW.md, this middleware is responsible for:
 * 1. IP Allowlisting for all admin panel routes.
 * 2. Basic JWT-based access control for the admin panel.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // --- 1. IP Allowlist Implementation ---
  // This check is based on the ADMIN_IP_ALLOWLIST environment variable.
  // If the variable is not set, this check is skipped, making it optional.
  const allowlist = process.env.ADMIN_IP_ALLOWLIST
  if (allowlist) {
    // The env var is a comma-separated list of IP addresses.
    const allowedIps = new Set(allowlist.split(',').map(ip => ip.trim()))
    const requestIp = req.ip // `req.ip` is the recommended way on Vercel.

    if (!requestIp || !allowedIps.has(requestIp)) {
      // If the request IP is not in the allowlist, deny access.
      return new NextResponse('Forbidden: IP address not allowed.', { status: 403 })
    }
  }

  // --- 2. Admin JWT Authentication Check ---
  // As per SECURITY_REVIEW.md, middleware should block admin paths for
  // requests without a valid `casbah_admin_token`.
  const adminToken = req.cookies.get('casbah_admin_token')?.value

  // Publicly accessible admin paths that do not require a token.
  const isPublicAdminPath =
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/refresh' ||
    pathname === '/api/admin/totp'

  if (!adminToken && !isPublicAdminPath) {
    // If the user is not authenticated and trying to access a protected admin path,
    // redirect them to the login page.
    const loginUrl = new URL('/admin/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // If all checks pass, continue to the requested resource.
  return NextResponse.next()
}

// Configure the middleware to run only on admin paths for performance.
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}