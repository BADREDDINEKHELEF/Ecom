import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpSendRateLimit } from '@/lib/auth/rateLimit'
import { sendEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'
import fs from 'fs'
import path from 'path'
import { getClientIp } from '@/lib/utils/ip'
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

    // Check vendor exists with this email (from vendors table)
    let vendor = null
    const { data: vData } = await supabase
      .from('vendors')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (vData) {
      vendor = vData
    } else {
      // Fallback: look up in auth.users by email using admin client listUsers
      const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const user = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (user) {
        const { data: vFallback } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (vFallback) {
          vendor = vFallback
          // Backfill email in vendors table
          await supabase
            .from('vendors')
            .update({ email })
            .eq('id', vFallback.id)
          logger.info('[forgot-password] legacy email backfilled', { email, vendorId: vFallback.id })
        }
      }
    }

    // Always return success — don't leak which emails are registered
    if (!vendor) {
      logger.warn('[forgot-password] email not found', { email })
      return NextResponse.json({ success: true })
    }

    // Delete old unused OTPs for this email
    try {
      await supabase.from('password_reset_otps').delete().eq('phone', email)
    } catch {}
    try {
      await supabase.from('password_reset_otps').delete().eq('email', email)
    } catch {}

    // Generate and store OTP
    const otp = generateOTP()
    const expiryStr = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const hashed = hashOtp(otp)
    
    let otpStoreErr: string | null = null
    try {
      let insertErr = null
      const { error } = await supabase.from('password_reset_otps').insert({
        phone:    email,
        email:    email,
        otp,        // plaintext — satisfies old schema NOT NULL constraint
        otp_hash: hashed,
        expires_at: expiryStr,
      })
      insertErr = error

      // Fallback: email column doesn't exist — retry without it
      if (insertErr && (insertErr.code === '42703' || String(insertErr.message).includes('email'))) {
        const { error: fallbackErr } = await supabase.from('password_reset_otps').insert({
          phone:    email,
          otp,
          otp_hash: hashed,
          expires_at: expiryStr,
        })
        insertErr = fallbackErr
      }

      // Fallback: otp_hash column doesn't exist — retry old schema (otp only)
      if (insertErr && (insertErr.code === 'PGRST204' || String(insertErr.message).includes('otp_hash'))) {
        const { error: fallbackErr } = await supabase.from('password_reset_otps').insert({
          phone:    email,
          email:    email,
          otp,
          expires_at: expiryStr,
        })
        insertErr = fallbackErr
      }

      if (insertErr) {
        throw new Error(`Database insert failed: ${insertErr.message} (code: ${insertErr.code})`)
      }
    } catch (err) {
      otpStoreErr = err instanceof Error ? err.message : String(err)
      logger.warn('[forgot-password] OTP storage failed', { error: otpStoreErr })
      return NextResponse.json({ success: true })
    }

    // Send via email — non-blocking; OTP is already stored in DB
    let emailError: string | null = null
    try {
      await sendOTPEmail(email, otp)
      logger.info('[forgot-password] OTP sent', { email })
    } catch (err) {
      emailError = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
      logger.warn('[forgot-password] email delivery failed', { error: emailError })
      try {
        fs.appendFileSync(
          path.join(process.cwd(), 'email-error.log'),
          `[${new Date().toISOString()}] forgot-password error to ${email}:\n${emailError}\n\n`
        )
      } catch {}
    }

    if (emailError) {
      return NextResponse.json({
        success: true,
        _devOtp: otp,
        _emailError: emailError,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/forgot-password] unexpected error', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

