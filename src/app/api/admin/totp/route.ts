import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { generateTotpSecret, generateQrCode } from '@/lib/auth/totp'
import { checkTotpSetupRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// POST /api/admin/totp — one-time bootstrap setup only. Locked once ADMIN_TOTP_SECRET is set.
// Requires ADMIN_SECRET password in the request body as a bootstrap credential, so an
// unauthenticated attacker cannot race the legitimate admin to claim the TOTP secret.
// The secret IS returned once in the response body (HTTPS only).
// The admin scans the QR code and copies the secret to the ADMIN_TOTP_SECRET env var.
// Once that env var is set this endpoint returns 403, so the secret is exposed exactly once.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkTotpSetupRateLimit(ip)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  // Bootstrap credential: require ADMIN_SECRET before revealing the TOTP secret.
  // This prevents an unauthenticated attacker from calling this endpoint before the
  // legitimate admin and registering their own authenticator first.
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json(
      { error: 'Admin panel not configured. Set ADMIN_SECRET in environment.' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const { password } = body as { password?: string }

  let passwordMatch = false
  try {
    const a = Buffer.from(password ?? '')
    const b = Buffer.from(adminSecret)
    passwordMatch = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    passwordMatch = false
  }
  if (!password || !passwordMatch) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  if (process.env.ADMIN_TOTP_SECRET) {
    return NextResponse.json({ error: 'TOTP already configured' }, { status: 403 })
  }

  const secret = generateTotpSecret()
  const qrCode = await generateQrCode(secret)

  // Return secret and QR code in response body (HTTPS only, not logged server-side).
  // Admin scans QR code with an authenticator app and sets ADMIN_TOTP_SECRET env var.
  // After that, this endpoint permanently returns 403.
  return NextResponse.json({
    qrCode,
    secret,
    instruction:
      '1. Scan the QR code with Google Authenticator / Authy.\n' +
      '2. Copy the secret field and set it as the ADMIN_TOTP_SECRET environment variable.\n' +
      '3. This endpoint disables itself once the variable is set.',
  })
}
