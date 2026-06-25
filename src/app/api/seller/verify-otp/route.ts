import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
import { timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'
import { normalizePhone } from '@/lib/utils/phone'

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
      // in case the OTP was created with phone only.
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
      return NextResponse.json({ error: 'Code invalide ou expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!otpEqual(record.otp, otp)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    // Find vendor by email (case-insensitive)
    const { data: vendor } = await supabase
      .from('vendors')
      .select('user_id')
      .ilike('email', email)
      .maybeSingle()

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