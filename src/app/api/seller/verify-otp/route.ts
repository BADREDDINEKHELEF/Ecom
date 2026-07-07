import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
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

/**
 * Signs out all active Supabase sessions for a user via the GoTrue admin REST
 * API. Called after a successful password reset so a compromised session cannot
 * remain valid after the owner regains control of their account.
 * Non-fatal: the password was already changed, so failure here is acceptable.
 */
async function signOutAllUserSessions(userId: string): Promise<void> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/logout`
    await fetch(url, {
      method: 'POST',
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    // non-fatal
  }
}

export async function POST(req: NextRequest) {
  try {
    // The 'phone' field here is actually the user's email for this flow.
    const { email: emailInput, phone, otp: otpInput, newPassword } = await req.json() as {
      email?: string
      phone?: string
      otp?: string
      newPassword?: string
    }
    const rawEmail = emailInput || phone

    if (!rawEmail || !otpInput || !newPassword) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }
    const email = rawEmail.trim().toLowerCase()
    const otp = otpInput.trim()
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }

    const rl = await checkOtpVerifyRateLimit(email)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    const { record, queryErr } = await findActiveOtp(supabase, email, 'password_reset')
    if (queryErr) {
      throw queryErr
    }

    if (!record) {
      return NextResponse.json({ error: 'Code invalide ou expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!verifyOtpHash(otp, record.otp_hash)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    // Find vendor by email (case-insensitive)
    let vendor = null
    const { data: vData } = await supabase
      .from('vendors')
      .select('user_id, id')
      .ilike('email', email)
      .maybeSingle()

    if (vData) {
      vendor = vData
    } else {
      // Fallback: look up in auth.users by email.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const userLookupRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      let user: { id: string } | null = null
      if (userLookupRes.ok) {
        const userLookupJson = await userLookupRes.json() as { users?: { id: string; email?: string }[] }
        user = userLookupJson?.users?.[0] ?? null
      }
      if (user) {
        const { data: vFallback } = await supabase
          .from('vendors')
          .select('user_id, id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (vFallback) {
          vendor = vFallback
          // Backfill email in vendors table
          await supabase
            .from('vendors')
            .update({ email })
            .eq('id', vFallback.id)
          logger.info('[verify-otp] legacy email backfilled', { email, vendorId: vFallback.id })
        }
      }
    }

    if (!vendor?.user_id) {
      return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
    }

    // Update password via admin API
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      vendor.user_id,
      { password: newPassword }
    )

    if (updateErr) {
      logger.error('[verify-otp] password update failed', { error: updateErr.message })
      return NextResponse.json({ error: 'Impossible de mettre à jour le mot de passe. Réessayez.' }, { status: 500 })
    }

    // Invalidate all existing Supabase sessions for this user so that a
    // compromised session can't be used after the owner resets their password.
    await signOutAllUserSessions(vendor.user_id)

    // Mark OTP as used
    const { error: updateErr2 } = await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', record.id)
    if (updateErr2) {
      logger.warn('[verify-otp] failed to mark OTP as used', { error: updateErr2.message })
    }

    logger.info('[verify-otp] password reset successful', { email: email })
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/verify-otp]', { error: msg })
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}
