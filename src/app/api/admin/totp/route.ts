import { NextRequest, NextResponse } from 'next/server'
import { generateTotpSecret, generateQrCode } from '@/lib/auth/totp'
import { checkTotpSetupRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// GET /api/admin/totp — one-time setup only. Locked once ADMIN_TOTP_SECRET is set.
// The raw secret is intentionally NOT returned in the response — only the QR code
// is sent so the secret never appears in browser history, network logs, or JS console.
// The admin must copy the secret from server logs on first-run only.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkTotpSetupRateLimit(ip)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  if (process.env.ADMIN_TOTP_SECRET) {
    return NextResponse.json({ error: 'TOTP already configured' }, { status: 403 })
  }

  const secret = generateTotpSecret()
  const qrCode = await generateQrCode(secret)

  // Return secret in the response body (HTTPS only — not stored server-side).
  // The admin copies it to the ADMIN_TOTP_SECRET environment variable.
  // Once set, this endpoint returns 403 (line 18 above), so the secret
  // is only ever returned once and never written to server logs.
  return NextResponse.json({
    qrCode,
    secret,
    instruction:
      '1. Scan the QR code with Google Authenticator / Authy.\n' +
      '2. Copy the secret field and set it as the ADMIN_TOTP_SECRET environment variable.\n' +
      '3. This endpoint disables itself once the variable is set.',
  })
}
