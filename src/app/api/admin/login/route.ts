import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, resetRateLimit } from '@/lib/auth/rateLimit'
import { signAdminToken } from '@/lib/auth/jwt'
import { verifyTotp } from '@/lib/auth/totp'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') ?? 'unknown'

  // Layer 1 — Rate limiting (5 attempts / 15 min / IP)
  const rateCheck = await checkRateLimit(ip)
  if (!rateCheck.allowed) {
    await writeAuditLog({ action: 'admin_login_failure', ip, userAgent: ua, result: 'failure', meta: { reason: 'rate_limited' } })
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
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
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
    await writeAuditLog({ action: 'admin_login_failure', ip, userAgent: ua, result: 'failure', meta: { reason: 'wrong_password' } })
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  // Layer 3 — TOTP check (only if ADMIN_TOTP_SECRET is configured)
  const totpSecret = process.env.ADMIN_TOTP_SECRET
  if (totpSecret) {
    if (!totpCode) {
      return NextResponse.json({ error: 'TOTP code required', totpRequired: true }, { status: 401 })
    }
    if (!verifyTotp(totpCode, totpSecret)) {
      await writeAuditLog({ action: 'admin_login_failure', ip, userAgent: ua, result: 'failure', meta: { reason: 'wrong_totp' } })
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
    }
  }

  // All checks passed — issue JWT
  resetRateLimit(ip)
  const token = await signAdminToken()

  await writeAuditLog({ action: 'admin_login_success', ip, userAgent: ua, result: 'success' })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('casbah_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60,   // 8 hours — matches JWT expiry
    path: '/',
  })
  return res
}
