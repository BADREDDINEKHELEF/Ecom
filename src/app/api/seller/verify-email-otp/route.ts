import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyFrontendRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'
import { verifyOtpHash } from '@/lib/auth/otp'

type OtpRecord = {
  id: string
  otp_hash: string
  expires_at: string
  used: boolean
  purpose: string | null
}

async function findActiveOtp(supabase: ReturnType<typeof createAdminClient>, email: string, purpose: string): Promise<{ record: OtpRecord | null; queryErr: Error | null }> {
  let record: OtpRecord | null = null
  let queryErr: Error | null = null

  const { data: dataEmail, error: errEmail } = await supabase
    .from('password_reset_otps')
    .select('id, otp_hash, expires_at, used, purpose')
    .eq('email', email)
    .eq('used', false)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isColumnMissing = errEmail && (
    errEmail.code === '42703' ||
    String(errEmail.message).includes('column')
  )

  if (isColumnMissing) {
    const { data: dataPhone, error: errPhone } = await supabase
      .from('password_reset_otps')
      .select('id, otp_hash, expires_at, used, purpose')
      .eq('phone', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    record = dataPhone as OtpRecord | null
    queryErr = errPhone ? new Error(`Database query failed: ${errPhone.message} (code: ${errPhone.code})`) : null
  } else if (errEmail) {
    queryErr = new Error(`Database query failed: ${errEmail.message} (code: ${errEmail.code})`)
  } else if (dataEmail) {
    record = dataEmail as OtpRecord
  } else {
    const { data: dataPhone, error: errPhone } = await supabase
      .from('password_reset_otps')
      .select('id, otp_hash, expires_at, used, purpose')
      .eq('phone', email)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    record = dataPhone as OtpRecord | null
    queryErr = errPhone ? new Error(`Database query failed: ${errPhone.message} (code: ${errPhone.code})`) : null
  }

  return { record, queryErr }
}

export async function POST(req: NextRequest) {
  try {
    const { email: emailInput, otp: otpInput } = await req.json() as { email?: string; otp?: string }

    if (!emailInput || !otpInput) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }

    const email = emailInput.trim().toLowerCase()
    const otp = otpInput.trim()

    const rl = await checkOtpVerifyFrontendRateLimit(email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()
    const { record, queryErr } = await findActiveOtp(supabase, email, 'registration')

    if (queryErr) {
      throw queryErr
    }

    if (!record) {
      return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!verifyOtpHash(otp, record.otp_hash)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    // Do NOT mark the OTP as used here. The registration endpoint will verify
    // the OTP again and mark it used atomically when creating the vendor.
    // Password-reset flows use /api/seller/verify-otp, which marks it used.

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/verify-email-otp]', { error: msg })
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
