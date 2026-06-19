import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken } from '@/lib/auth/jwt'
import { requireAdmin, revokeAdminToken } from '@/lib/auth/adminAuth'

// POST /api/admin/refresh — re-issues the admin cookie without requiring a password.
// Only works if the current token is still valid (not expired, not tampered, not revoked).
// The admin UI calls this every 7 hours to maintain a seamless session.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Full check: signature + expiry + revocation blocklist
  const denied = await requireAdmin(req)
  if (denied) return denied

  // Revoke the old token before issuing a new one — prevents both being valid simultaneously
  await revokeAdminToken(token)

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
