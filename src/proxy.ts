import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getClientIp } from '@/lib/utils/ip'

function isIpAllowed(ip: string): boolean {
  const allowlist = process.env.ADMIN_IP_ALLOWLIST
  // If no allowlist configured, allow all IPs (open mode)
  if (!allowlist) return true
  const allowed = allowlist.split(',').map((s) => s.trim())
  return allowed.includes(ip)
}

async function verifyAdminJwt(token: string): Promise<boolean> {
  try {
    const secret = process.env.ADMIN_JWT_SECRET
    if (!secret) return false
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip the login page itself
  if (pathname === '/admin/login') return NextResponse.next()

  if (pathname.startsWith('/admin')) {
    const ip = getClientIp(request)

    // Layer 1 — IP allowlist
    if (!isIpAllowed(ip)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Layer 2 — JWT verification
    const token = request.cookies.get('casbah_admin_token')?.value
    if (!token || !(await verifyAdminJwt(token))) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      const next = pathname.startsWith('/') && !pathname.startsWith('//') ? pathname : '/admin/login'
      loginUrl.searchParams.set('next', next)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
