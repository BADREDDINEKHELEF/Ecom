import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
import { timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

function otpEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.padEnd(8))
    const bb = Buffer.from(b.padEnd(8))
    return ba.length === bb.length && timingSafeEqual(ba, bb) && a.length === b.length
  } catch { return false }
}

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('213')) return d
  if (d.startsWith('0'))   return '213' + d.slice(1)
  return '213' + d
}

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, newPassword } = await req.json() as {
      phone?: string
      otp?: string
      newPassword?: string
    }

    if (!phone || !otp || !newPassword) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })
    }

    const normalized = normalizePhone(phone)

    const rl = await checkOtpVerifyRateLimit(normalized)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createAdminClient()

    // Verify OTP
    const { data: record } = await supabase
      .from('password_reset_otps')
      .select('id, otp, expires_at, used')
      .eq('phone', normalized)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'Code invalide ou expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!otpEqual(record.otp, otp)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    // Find vendor by exact phone match (not ilike — avoids ambiguous last-9-digit collisions)
    const { data: vendor } = await supabase
      .from('vendors')
      .select('user_id')
      .eq('phone', normalized)
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

    // Mark OTP as used
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', record.id)

    logger.info('[verify-otp] password reset successful', { phone: normalized })
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/verify-otp]', { error: msg })
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}
