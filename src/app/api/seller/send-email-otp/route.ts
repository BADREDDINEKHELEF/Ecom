import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpSendRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'
import { getClientIp } from '@/lib/utils/ip'
import { logSecurityFailure } from '@/lib/auth/securityEvents'
import { hashOtp } from '@/lib/auth/otp'

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
    const body = await req.json().catch(() => ({}))
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Adresse e-mail valide requise.', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const email = parsed.data.email.trim().toLowerCase()

    const ip = getClientIp(req)
    const rl = await checkOtpSendRateLimit(ip, email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    let otpStoreErr: string | null = null
    try {
      // Remove old OTPs for this email
      try { await supabase.from('password_reset_otps').delete().eq('phone', email).eq('purpose', 'registration') } catch {}
      try { await supabase.from('password_reset_otps').delete().eq('email', email).eq('purpose', 'registration') } catch {}

      const otp = generateOTP()
      const expiryStr = new Date(Date.now() + 15 * 60 * 1000).toISOString()
      const hashed = hashOtp(otp)

      let insertErr = null
      const otpPayload = {
        phone:    email,
        email:    email,
        otp_hash: hashed,
        expires_at: expiryStr,
        purpose:  'registration' as const,
      }
      const { error } = await supabase.from('password_reset_otps').insert(otpPayload)
      insertErr = error

      // Fallback: older deployments without email/purpose columns — retry with phone only
      if (insertErr && (insertErr.code === '42703' || String(insertErr.message).includes('column'))) {
        const { error: fallbackErr } = await supabase.from('password_reset_otps').insert({
          phone:    email,
          otp_hash: hashed,
          expires_at: expiryStr,
        })
        insertErr = fallbackErr
      }

      if (insertErr) {
        throw new Error(`Database insert failed: ${insertErr.message} (code: ${insertErr.code})`)
      }

      // Try to send the email. If email sending fails (e.g. no provider configured),
      // the OTP is returned as a fallback so registration can still proceed.
      // This is critical for Vercel deployments where RESEND_API_KEY may not be set.
      try {
        await sendOTPEmail(email, otp)
        logger.info('[send-email-otp] OTP sent', { email })
      } catch (err) {
        const emailError = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
        logger.warn('[send-email-otp] email delivery failed', { error: emailError })
        
        // Log to security_events table in Supabase so we can read it on Vercel
        await logSecurityFailure({
          actorType: 'system',
          action: 'email_delivery_failure',
          resource: `email:${email.slice(0, 4)}...`,
          ipAddress: ip,
          meta: { error: emailError.slice(0, 1000) }
        })

        return NextResponse.json(
          { error: 'Impossible d\'envoyer l\'e-mail de vérification. Veuillez réessayer.' },
          { status: 503 },
        )
      }

      return NextResponse.json({ success: true })
    } catch (err) {
      otpStoreErr = err instanceof Error ? err.message : String(err)
      logger.error('[send-email-otp] OTP storage failed', { error: otpStoreErr })
      return NextResponse.json(
        { error: 'Une erreur interne s\'est produite. Veuillez réessayer.' },
        { status: 500 },
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/send-email-otp] unexpected error', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}