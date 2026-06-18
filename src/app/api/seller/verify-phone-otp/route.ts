import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOtpVerifyRateLimit } from '@/lib/auth/rateLimit'
import { timingSafeEqual } from 'crypto'

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('213')) return d
  if (d.startsWith('0'))   return '213' + d.slice(1)
  return '213' + d
}

function otpEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.padEnd(8))
    const bb = Buffer.from(b.padEnd(8))
    return ba.length === bb.length && timingSafeEqual(ba, bb) && a.length === b.length
  } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json() as { phone?: string; otp?: string }

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 })
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

    const { data: record } = await supabase
      .from('password_reset_otps')
      .select('id, otp, expires_at, used')
      .eq('phone', normalized)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!record) {
      return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 })
    }
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 })
    }
    if (!otpEqual(record.otp, otp)) {
      return NextResponse.json({ error: 'Code incorrect. Vérifiez et réessayez.' }, { status: 400 })
    }

    await supabase.from('password_reset_otps').update({ used: true }).eq('id', record.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
