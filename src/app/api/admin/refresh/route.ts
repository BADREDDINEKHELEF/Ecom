import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken, ADMIN_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/jwt'
import { requireAdmin, invalidateJtiOnly } from '@/lib/auth/adminAuth'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { getAdminCookieName, getAdminCookieOptions, ADMIN_COOKIE_NAME } from '@/cookie'
import { rotateSessionJti, createSession } from '@/lib/auth/sessions'

// POST /api/admin/refresh — re-issues the admin cookie without a password check.
// Only works when the current token is valid (not expired, not tampered, not revoked).
// The admin UI calls this at the 1h36m mark (80% of the 2-hour lifetime) to
// maintain a seamless 2-hour session.
//
// Rotation strategy:
//   1. Old JTI → revocation blocklist (old token is immediately dead)
//   2. Session row → JTI updated to new value (session stays is_active = true)
//   3. New token → set in cookie
// This differs from logout, which deactivates the session entirely.
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(getAdminCookieName())?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const denied = await requireAdmin(req)
    if (denied) return denied

    const ip = getClientIp(req)
    const ua = req.headers.get('user-agent') ?? 'unknown'
    const rl = await checkAdminApiRateLimit(ip, 'refresh', 10, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )

    const oldJti = await invalidateJtiOnly(token)
    const newJti = randomUUID()
    const newToken = await signAdminToken(newJti)
    const newExpiresAt = new Date(Date.now() + ADMIN_TOKEN_MAX_AGE_SECONDS * 1000)

    if (oldJti) {
      await rotateSessionJti(oldJti, newJti, newExpiresAt)
    } else {
      await createSession({ jti: newJti, userAgent: ua, ip, expiresAt: newExpiresAt })
    }

    const res = NextResponse.json({ ok: true })
    const cookieName = getAdminCookieName()
    const cookieOpts = getAdminCookieOptions(ADMIN_TOKEN_MAX_AGE_SECONDS)
    res.cookies.set(cookieName, newToken, cookieOpts)
    // Remove any legacy non-prefixed cookie left over from before the upgrade.
    if (cookieName !== ADMIN_COOKIE_NAME) {
      res.cookies.delete(ADMIN_COOKIE_NAME)
    }
    return res
  } catch (err) {
    logger.error('[POST /api/admin/refresh]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
