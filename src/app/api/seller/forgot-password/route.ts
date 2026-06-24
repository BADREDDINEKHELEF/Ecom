import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpSendRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/utils/ip'

const RequestSchema = z.object({
  email: z.string().email('Format d\'email invalide'),
})

function generateOTP(): string {
  return randomInt(100000, 1000000).toString()
}

async function sendOTPEmail(email: string, otp: string): Promise<void> {
  await sendEmail(
    email,
    'Votre code de vérification StoreDz',
    `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px">
      <h2 style="color:#059669">Réinitialisation de mot de passe</h2>
      <p>Votre code de vérification StoreDz est : <strong style="font-size:24px">${otp}</strong></p>
      <p style="color:#6b7280">Ce code expire dans 5 minutes. Ne le partagez avec personne.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px">StoreDz — La marketplace algérienne</p>
    </div>
    `,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Adresse e-mail valide requise.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const { email } = parsed.data

    const ip = getClientIp(req)
    const rl = await checkOtpSendRateLimit(ip, email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    // Check vendor exists with this email (from vendors table)
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    // Always return success — don't leak which emails are registered
    if (!vendor) {
      logger.warn('[forgot-password] email not found', { email })
      return NextResponse.json({ success: true })
    }

    // Delete old unused OTPs for this email
    await supabase.from('password_reset_otps').delete().eq('email', email)

    // Generate and store OTP
    const otp = generateOTP()
    await supabase.from('password_reset_otps').insert({
      email:      email,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    // Send via email — non-blocking; OTP is already stored in DB
    let emailError: string | null = null
    try {
      await sendOTPEmail(email, otp)
      logger.info('[forgot-password] OTP sent', { email })
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
      logger.warn('[forgot-password] email delivery failed', { error: emailError })
    }

    if (emailError && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email. Vérifiez votre adresse ou réessayez plus tard." },
        { status: 502 },
      )
    }

    return NextResponse.json({
      success: true,
      ...(emailError ? { _emailError: emailError } : {}),
      ...(process.env.NODE_ENV === 'development' ? { _devOtp: otp } : {}),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/forgot-password]', { error: msg })
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ error: 'Impossible d\'envoyer le code. Réessayez.' }, { status: 500 })
  }
}

