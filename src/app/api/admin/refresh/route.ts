import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken, signAdminToken } from '@/lib/auth/jwt'

// POST /api/admin/refresh — re-issues the admin cookie without requiring a password.
// Only works if the current token is still valid (not expired, not tampered).
// The admin UI calls this every 7 hours to maintain a seamless session.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

  // Issue a fresh 8-hour token
  const newToken = await signAdminToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('casbah_admin_token', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60,
    path: '/',
  })
  return res
}
