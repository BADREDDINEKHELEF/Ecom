import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rateLimit'
import { signAdminToken, ADMIN_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/jwt'
import { verifyTotpGetCounter } from '@/lib/auth/totp'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { getClientIp } from '@/lib/utils/ip'
import { getAdminCookieName, getAdminCookieOptions } from '@/cookie'
import { createSession, isTotpCounterUsed, markTotpCounterUsed } from '@/lib/auth/sessions'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') ?? 'unknown'

  // Layer 1 — Rate limiting (5 attempts / 15 min / IP)
  const rateCheck = await checkRateLimit(ip)
  if (!rateCheck.allowed) {
    void writeAuditLog({
      action: 'admin_login_failure', ip, userAgent: ua,
      result: 'failure', meta: { reason: 'rate_limited' },
    })
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { password, totpCode } = body as { password?: string; totpCode?: string }

  // Layer 2 — Password check (timing-safe comparison prevents timing attacks)
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    console.error('[Admin Login] ADMIN_SECRET env var is not set')
    return NextResponse.json(
      { error: 'Admin panel is not configured.' },
      { status: 503 }
    )
  }
  let passwordMatch = false
  try {
    const { timingSafeEqual } = await import('crypto')
    const a = Buffer.from(password ?? '')
    const b = Buffer.from(adminSecret)
    passwordMatch = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    passwordMatch = false
  }
  if (!password || !passwordMatch) {
    void writeAuditLog({
      action: 'admin_login_failure', ip, userAgent: ua,
      result: 'failure', meta: { reason: 'wrong_password' },
    })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Layer 3 — TOTP check with replay protection (only if ADMIN_TOTP_SECRET is configured)
  const totpSecret = process.env.ADMIN_TOTP_SECRET
  if (totpSecret) {
    if (!totpCode) {
      return NextResponse.json({ error: 'TOTP code required', totpRequired: true }, { status: 401 })
    }

    // Validate the TOTP code and get the matching counter value
    const matchedCounter = verifyTotpGetCounter(totpCode, totpSecret)
    if (matchedCounter === null) {
      void writeAuditLog({
        action: 'admin_login_failure', ip, userAgent: ua,
        result: 'failure', meta: { reason: 'wrong_totp' },
      })
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
    }

    // Replay protection: reject a code that was already used in this 30-second window.
    // Without this, an attacker who intercepts a valid code can reuse it within the
    // same window (up to 90 seconds with window=1).
    const alreadyUsed = await isTotpCounterUsed(matchedCounter)
    if (alreadyUsed) {
      void writeAuditLog({
        action: 'admin_login_failure', ip, userAgent: ua,
        result: 'failure', meta: { reason: 'totp_replay' },
      })
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
    }

    // Mark the counter used BEFORE issuing the token so a race cannot slip two
    // requests through simultaneously.
    await markTotpCounterUsed(matchedCounter)
  }

  // All checks passed — issue a JWT with a pre-generated JTI so we can create
  // the session record atomically before setting the cookie.
  resetRateLimit(ip)
  const jti = randomUUID()
  const token = await signAdminToken(jti)
  const expiresAt = new Date(Date.now() + ADMIN_TOKEN_MAX_AGE_SECONDS * 1000)

  await createSession({ jti, userAgent: ua, ip, expiresAt })
  void writeAuditLog({ action: 'admin_login_success', ip, userAgent: ua, result: 'success' })

  const res = NextResponse.json({ ok: true })
  const cookieName = getAdminCookieName()
  const cookieOpts = getAdminCookieOptions(ADMIN_TOKEN_MAX_AGE_SECONDS)
  res.cookies.set(cookieName, token, cookieOpts)
  return res
}
