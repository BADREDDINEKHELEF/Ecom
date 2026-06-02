import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('shopdz_admin')?.value
    // In development skip the gate so the dashboard is accessible.
    // In production, remove the NODE_ENV check and require a real token.
    if (process.env.NODE_ENV === 'production' && token !== process.env.ADMIN_SECRET) {
      const login = request.nextUrl.clone()
      login.pathname = '/auth'
      login.searchParams.set('redirect', pathname)
      login.searchParams.set('role', 'admin')
      return NextResponse.redirect(login)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
