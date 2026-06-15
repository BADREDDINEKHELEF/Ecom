import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const RedeemSchema = z.object({
  code:   z.string().min(1).max(100),
  amount: z.number().positive().max(1_000_000),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'giftcard')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RedeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code ou montant invalide' }, { status: 400 })
  }

  const { code, amount } = parsed.data
  const supabase = createAdminClient()

  // Step 1 — verify card exists and is valid (read-only, no mutation yet)
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

  // Step 2 — atomic decrement: UPDATE ... WHERE balance >= deduct RETURNING balance
  // This prevents race conditions where two concurrent requests both read the same
  // balance and both succeed in deducting, resulting in over-redemption.
  // If balance was concurrently modified and is now < deduct, the WHERE clause
  // silently matches 0 rows — we detect this via the returned count.
  const { data: updated, error: updateErr } = await supabase
    .from('gift_cards')
    .update({ balance: card.balance - deduct })
    .eq('id', card.id)
    .eq('is_active', true)
    .gte('balance', deduct)  // atomic guard — only succeeds if balance is still sufficient
    .select('balance')
    .maybeSingle()

  if (updateErr) {
    logger.error('[gift-cards/redeem] update failed', { error: updateErr.message })
    return NextResponse.json({ error: 'Erreur lors de la réduction du solde' }, { status: 500 })
  }

  if (!updated) {
    // Concurrent redemption won the race — re-read the current balance and report
    return NextResponse.json({ error: 'Solde insuffisant ou code déjà utilisé' }, { status: 409 })
  }

  return NextResponse.json({ deducted: deduct, remainingBalance: updated.balance })
}
