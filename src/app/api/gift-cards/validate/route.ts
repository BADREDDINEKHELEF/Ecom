import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkGiftCardRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkGiftCardRateLimit(ip)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })

  const { code } = await req.json().catch(() => ({}))
  if (!code || typeof code !== 'string' || code.length > 100) {
    return NextResponse.json({ error: 'Code requis' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('gift_cards')
    .select('id, balance, expires_at, is_active')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (!data || !data.is_active) {
    return NextResponse.json({ error: 'Code cadeau invalide ou désactivé' }, { status: 404 })
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce code cadeau a expiré' }, { status: 400 })
  }
  if (data.balance <= 0) {
    return NextResponse.json({ error: 'Ce code cadeau est épuisé' }, { status: 400 })
  }

  return NextResponse.json({ valid: true, id: data.id, balance: data.balance })
}
