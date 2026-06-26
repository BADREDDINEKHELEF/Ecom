import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getAdminCookieName } from '@/cookie'
import { getClientIp } from '@/lib/utils/ip'

function isIpAllowed(ip: string): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST
  if (!allowlist) return true
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
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/${jti}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      })
      if (!res.ok) return false
      const data = await res.json() as { result: string | null }
      if (data.result !== 'valid') return false
    }
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const ip = getClientIp(req)
  if (!isIpAllowed(ip)) {
    return new NextResponse('Forbidden: IP address not allowed.', { status: 403 })
  }

  const isPublicAdminPath =
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/refresh' ||
    pathname === '/api/admin/totp'

  if (!isPublicAdminPath) {
    const adminToken = req.cookies.get(getAdminCookieName())?.value
    if (!adminToken || !(await verifyAdminJwt(adminToken))) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/admin/login', req.url)
      const next = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/admin/login'
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
