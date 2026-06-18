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

  // Single atomic RPC: SELECT FOR UPDATE + relative decrement in one DB transaction.
  // Fixes the stale-read race where two concurrent requests both read the same balance
  // and then write SET balance = stale_value - deduct, corrupting the final balance.
  const { data, error } = await supabase.rpc('redeem_gift_card', {
    p_code:   code.trim(),
    p_amount: amount,
  })

  if (error) {
    const msg = error.message ?? ''
    if (msg.includes('invalid_card') || msg.includes('inactive_card')) {
      return NextResponse.json({ error: 'Code cadeau invalide ou désactivé' }, { status: 404 })
    }
    if (msg.includes('expired_card')) {
      return NextResponse.json({ error: 'Ce code cadeau a expiré' }, { status: 400 })
    }
    if (msg.includes('zero_balance')) {
      return NextResponse.json({ error: 'Ce code cadeau est épuisé' }, { status: 400 })
    }
    logger.error('[gift-cards/redeem] rpc failed', { error: msg })
    return NextResponse.json({ error: 'Erreur lors de la réduction du solde' }, { status: 500 })
  }

  // RPC returns a single row: { deducted, remaining_balance }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return NextResponse.json({ error: 'Solde insuffisant ou code déjà utilisé' }, { status: 409 })
  }

  return NextResponse.json({ deducted: row.deducted, remainingBalance: row.remaining_balance })
}
