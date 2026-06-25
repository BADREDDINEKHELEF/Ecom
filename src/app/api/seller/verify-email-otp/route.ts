import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
import { timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

function otpEqual(a: string, b: string): boolean {
  const sa = String(a).trim()
  const sb = String(b).trim()
  if (sa.length !== sb.length) return false
  try {
    const ba = Buffer.from(sa)
    const bb = Buffer.from(sb)
    return timingSafeEqual(ba, bb)
  } catch { return false }
}

const VerifyEmailOtpSchema = z.object({
  email: z.string().email(),
  otp:   z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = VerifyEmailOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }

    const email = parsed.data.email.trim().toLowerCase()
    const otp = parsed.data.otp.trim()

    const rl = await checkOtpVerifyRateLimit(email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    let record = null
    let queryErr = null
    
    // Try to query by email column first
    const { data: dataEmail, error: errEmail } = await supabase
      .from('password_reset_otps')
      .select('id, otp, expires_at, used')
      .eq('email', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    const isEmailColumnMissing = errEmail && (
      errEmail.code === '42703' || 
      String(errEmail.message).includes('column') || 
      String(errEmail.message).includes('email')
    )

    if (isEmailColumnMissing) {
      // Fallback: query by phone column
      const { data: dataPhone, error: errPhone } = await supabase
        .from('password_reset_otps')
        .select('id, otp, expires_at, used')
        .eq('phone', email)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      record = dataPhone
      queryErr = errPhone
    } else if (errEmail) {
      queryErr = errEmail
    } else if (dataEmail) {
      record = dataEmail
    } else {
      // Column exists but returned no record. Fall back to phone column
      // in case the OTP was created with phone only (e.g. via send-email-otp).
      const { data: dataPhone, error: errPhone } = await supabase
        .from('password_reset_otps')
        .select('id, otp, expires_at, used')
        .eq('phone', email)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      record = dataPhone
      queryErr = errPhone
    }

    if (queryErr) {
      throw new Error(`Database query failed: ${queryErr.message} (code: ${queryErr.code})`)
    }

    if (!record) {
      return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!otpEqual(record.otp, otp)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    const { error: updateErr } = await supabase.from('password_reset_otps').update({ used: true }).eq('id', record.id)
    if (updateErr) {
      logger.warn('[verify-email-otp] failed to mark OTP as used', { error: updateErr.message })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/verify-email-otp]', { error: msg })
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
