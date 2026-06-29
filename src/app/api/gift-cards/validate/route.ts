import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkGiftCardRateLimit, checkGiftCardCodeRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const ValidateSchema = z.object({
  code: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkGiftCardRateLimit(ip)
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ValidateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Code requis' }, { status: 400 })

  const code = parsed.data.code.trim().toUpperCase()

  // Per-code gate: blocks enumeration even when attacker rotates IPs
  const codeRl = await checkGiftCardCodeRateLimit(code)
  if (!codeRl.allowed) return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('gift_cards')
      .select('id, balance, expires_at, is_active')
      .eq('code', code)
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
  } catch (err) {
    logger.error('[POST /api/gift-cards/validate]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
