import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'giftcard')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })

  const { code, amount } = await req.json().catch(() => ({}))
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code requis' }, { status: 400 })
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: card } = await supabase
    .from('gift_cards')
    .select('id, balance, expires_at, is_active')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle()

  if (!card || !card.is_active) {
    return NextResponse.json({ error: 'Code cadeau invalide ou désactivé' }, { status: 404 })
  }
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce code cadeau a expiré' }, { status: 400 })
  }
  if (card.balance <= 0) {
    return NextResponse.json({ error: 'Ce code cadeau est épuisé' }, { status: 400 })
  }

  const deduct = Math.min(amount, card.balance)
  const newBalance = card.balance - deduct

  const { error } = await supabase
    .from('gift_cards')
    .update({ balance: newBalance })
    .eq('id', card.id)

  if (error) {
    return NextResponse.json({ error: 'Erreur lors de la réduction du solde' }, { status: 500 })
  }

  return NextResponse.json({ deducted: deduct, remainingBalance: newBalance })
}
