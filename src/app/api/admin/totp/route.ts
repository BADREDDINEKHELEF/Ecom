import { NextResponse } from 'next/server'
import { generateTotpSecret, generateQrCode } from '@/lib/auth/totp'

// GET /api/admin/totp — one-time setup only. Locked once ADMIN_TOTP_SECRET is set.
// The raw secret is intentionally NOT returned in the response — only the QR code
// is sent so the secret never appears in browser history, network logs, or JS console.
// The admin must copy the secret from server logs on first-run only.
export async function GET() {
  if (process.env.ADMIN_TOTP_SECRET) {
    return NextResponse.json({ error: 'TOTP already configured' }, { status: 403 })
  }

  const secret = generateTotpSecret()
  const qrCode = await generateQrCode(secret)

  // Log secret server-side only — never send it to the browser
  console.info('[TOTP SETUP] Copy this secret into ADMIN_TOTP_SECRET env var:', secret)

  return NextResponse.json({
    qrCode,
    instruction:
      '1. Scan the QR code with Google Authenticator / Authy.\n' +
      '2. Copy ADMIN_TOTP_SECRET from your server logs and set it as an environment variable.\n' +
      '3. This endpoint disables itself once the variable is set.',
  })
}
