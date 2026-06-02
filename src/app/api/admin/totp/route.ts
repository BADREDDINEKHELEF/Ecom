import { NextResponse } from 'next/server'
import { generateTotpSecret, generateQrCode } from '@/lib/auth/totp'

// GET /api/admin/totp — generate a new TOTP secret + QR code for first-time setup
export async function GET() {
  const secret = generateTotpSecret()
  const qrCode = await generateQrCode(secret)
  return NextResponse.json({
    secret,
    qrCode,
    instruction: `Set ADMIN_TOTP_SECRET=${secret} in your Vercel environment variables, then scan the QR code with an authenticator app.`,
  })
}
