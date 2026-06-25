import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const NicheOrderSchema = z.object({
  nicheId:   z.string().min(1),
  direction: z.enum(['up', 'down']),
})

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'niches_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = NicheOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'nicheId and direction (up|down) required' }, { status: 400 })
    }

    const { nicheId, direction } = parsed.data

    const supabase = createAdminClient()

    // Get current row
    const { data: current } = await supabase
      .from('featured_niches')
      .select('id, display_order')
      .eq('niche_id', nicheId)
      .maybeSingle()

    const currentOrder = current?.display_order ?? 0

    // Find the neighbour to swap with
    const { data: neighbour } = await supabase
      .from('featured_niches')
      .select('id, display_order, niche_id')
      .order('display_order', { ascending: direction === 'down' })
      .gt('display_order', direction === 'down' ? currentOrder : -1)
      .lt('display_order', direction === 'up'   ? currentOrder : 99999)
      .limit(1)
      .maybeSingle()

    if (!neighbour) return NextResponse.json({ ok: true }) // Already at boundary

    // Upsert both rows with swapped display_order
    await Promise.all([
      supabase.from('featured_niches').upsert({ niche_id: nicheId, display_order: neighbour.display_order }, { onConflict: 'niche_id' }),
      supabase.from('featured_niches').upsert({ niche_id: neighbour.niche_id, display_order: currentOrder }, { onConflict: 'niche_id' }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/niches/order]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
