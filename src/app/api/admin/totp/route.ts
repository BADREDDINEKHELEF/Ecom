import { NextResponse } from 'next/server'
import { generateTotpSecret, generateQrCode } from '@/lib/auth/totp'

// GET /api/admin/totp — one-time setup only. Locked once ADMIN_TOTP_SECRET is set.
export async function GET() {
  // If TOTP is already configured, this endpoint is disabled
  if (process.env.ADMIN_TOTP_SECRET) {
    return NextResponse.json({ error: 'TOTP already configured' }, { status: 403 })
  }

  const secret = generateTotpSecret()
  const qrCode = await generateQrCode(secret)

  return NextResponse.json({
    secret,
    qrCode,
    instruction: `1. Scan the QR code with Google Authenticator / Authy.
2. Set ADMIN_TOTP_SECRET=${secret} in your environment variables.
3. This endpoint will be disabled automatically once the variable is set.`,
  })
}
