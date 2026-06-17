import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('213')) return d
  if (d.startsWith('0'))   return '213' + d.slice(1)
  return '213' + d
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendWhatsAppOTP(phone: string, otp: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM

  if (!sid || !token || !from) throw new Error('Twilio not configured')

  const body = `🔐 *ShopDZ* — Code de vérification : *${otp}*\n\nValide 5 minutes. Ne partagez jamais ce code.`

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:+${from.replace(/\D/g, '')}`,
        To:   `whatsapp:+${phone}`,
        Body: body,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Twilio error ${res.status}: ${err.message ?? 'unknown'}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json() as { phone?: string }
    if (!phone) return NextResponse.json({ error: 'Numéro requis.' }, { status: 400 })

    const normalized = normalizePhone(phone)
    if (normalized.length < 11) {
      return NextResponse.json({ error: 'Numéro invalide.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    await supabase.from('password_reset_otps').delete().eq('phone', normalized)

    const otp = generateOTP()
    await supabase.from('password_reset_otps').insert({
      phone:      normalized,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    await sendWhatsAppOTP(normalized, otp)
    logger.info('[send-phone-otp] OTP sent', { phone: normalized })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/send-phone-otp]', { error: msg })
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ error: 'Impossible d\'envoyer le code. Réessayez.' }, { status: 500 })
  }
}
