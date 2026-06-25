import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const AbandonedPatchSchema = z.object({
  id:     z.string().min(1),
  status: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'abandoned_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'all'
  const supabase = createAdminClient()
  let query = supabase
    .from('abandoned_checkouts')
    .select('*')
    .eq('status', 'abandoned')
    .order('cart_total', { ascending: false })
    .limit(100)
  if (period === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString())
  } else if (period === 'week') {
    const start = new Date(); start.setDate(start.getDate() - 7)
    query = query.gte('created_at', start.toISOString())
  }
  const { data, error } = await query
  if (error) {
    logger.error('[GET /api/admin/abandoned]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'abandoned_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = AbandonedPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const { id, status } = parsed.data
  const supabase = createAdminClient()
  const { error } = await supabase.from('abandoned_checkouts').update({
    status,
    ...(status === 'recovered' ? { recovered_at: new Date().toISOString() } : {}),
  }).eq('id', id)
  if (error) {
    logger.error('[PATCH /api/admin/abandoned]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
