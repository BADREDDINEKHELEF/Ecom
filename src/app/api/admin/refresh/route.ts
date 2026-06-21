import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken, ADMIN_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/jwt'
import { requireAdmin, invalidateJtiOnly } from '@/lib/auth/adminAuth'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { rotateSessionJti, createSession } from '@/lib/auth/sessions'

// POST /api/admin/refresh — re-issues the admin cookie without a password check.
// Only works when the current token is valid (not expired, not tampered, not revoked).
// The admin UI calls this at the 1h50m mark to maintain a seamless 2-hour session.
//
// Rotation strategy:
//   1. Old JTI → revocation blocklist (old token is immediately dead)
//   2. Session row → JTI updated to new value (session stays is_active = true)
//   3. New token → set in cookie
// This differs from logout, which deactivates the session entirely.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Full check: signature + expiry + revocation blocklist
  const denied = await requireAdmin(req)
  if (denied) return denied

  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const rl = await checkAdminApiRateLimit(ip, 'refresh', 10, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  // Invalidate the old JTI (adds to blocklist) WITHOUT deactivating the session row.
  // Returns the old JTI so we can look up and rotate the session record.
  const oldJti = await invalidateJtiOnly(token)

  // Issue a fresh 2-hour token with a new JTI
  const newJti = randomUUID()
  const newToken = await signAdminToken(newJti)
  const newExpiresAt = new Date(Date.now() + ADMIN_TOKEN_MAX_AGE_SECONDS * 1000)

  if (oldJti) {
    // Normal path: rotate the existing session record to the new JTI
    await rotateSessionJti(oldJti, newJti, newExpiresAt)
  } else {
    // Fallback for tokens issued before session tracking was introduced:
    // create a brand-new session record so device tracking stays current.
    await createSession({ jti: newJti, userAgent: ua, ip, expiresAt: newExpiresAt })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('casbah_admin_token', newToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   ADMIN_TOKEN_MAX_AGE_SECONDS,
    path:     '/',
  })
  return res
}
