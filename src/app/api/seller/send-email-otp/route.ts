import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpSendRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/utils/ip'

function generateOTP(): string {
  return randomInt(100000, 1000000).toString()
}

async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await sendEmail(
    email,
    'Votre code de vérification StoreDz',
    `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
      <h2 style="color:#059669">Vérifiez votre adresse e-mail</h2>
      <p>Votre code de vérification StoreDz est : <strong style="font-size:24px">${otp}</strong></p>
      <p style="color:#6b7280">Ce code expire dans 5 minutes. Ne le partagez avec personne.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
    </div>
    `,
  )
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string }
    if (!email) return NextResponse.json({ error: 'Adresse e-mail requise.' }, { status: 400 })

    const ip = getClientIp(req)
    const rl = await checkOtpSendRateLimit(ip, email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    // Remove old OTPs for this email
    await supabase.from('password_reset_otps').delete().eq('phone', email)

    const otp = generateOTP()
    await supabase.from('password_reset_otps').insert({
      phone:      email,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    await sendOTPEmail(email, otp)
    logger.info('[send-email-otp] OTP sent', { email })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/send-email-otp]', { error: msg })
    return NextResponse.json({ error: 'Impossible d\'envoyer le code. Réessayez.' }, { status: 500 })
  }
}