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
  const from  = process.env.TWILIO_WHATSAPP_FROM // e.g. +14155238886

  if (!sid || !token || !from) throw new Error('Twilio not configured')

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From:             `whatsapp:+${from.replace(/\D/g, '')}`,
        To:               `whatsapp:+${phone}`,
        ContentSid:       'HX229f5a04fd0510ce1b071852155d3e75',
        ContentVariables: JSON.stringify({ '1': otp }),
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
    if (!phone) return NextResponse.json({ error: 'Numéro de téléphone requis.' }, { status: 400 })

    const normalized = normalizePhone(phone)
    if (normalized.length < 11) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check vendor exists with this phone
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle()

    // Also try normalized format
    const { data: vendorNorm } = !vendor ? await supabase
      .from('vendors')
      .select('id, phone')
      .ilike('phone', `%${normalized.slice(-9)}`)
      .maybeSingle() : { data: null }

    // Always return success — don't leak which phones are registered
    if (!vendor && !vendorNorm) {
      logger.warn('[forgot-password] phone not found', { phone: normalized })
      return NextResponse.json({ success: true })
    }

    // Delete old unused OTPs for this phone
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('phone', normalized)

    // Generate and store OTP
    const otp = generateOTP()
    await supabase.from('password_reset_otps').insert({
      phone:      normalized,
      otp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    // Send via WhatsApp
    await sendWhatsAppOTP(normalized, otp)
    logger.info('[forgot-password] OTP sent', { phone: normalized })

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/seller/forgot-password]', { error: msg })
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ error: 'Impossible d\'envoyer le code. Réessayez.' }, { status: 500 })
  }
}
