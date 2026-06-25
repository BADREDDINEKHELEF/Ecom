import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const VALID_STATUSES = ['requested', 'approved', 'rejected', 'refunded', 'returned'] as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_REFUND_DZD = 10_000_000

const PatchReturnSchema = z.object({
  status:       z.enum(VALID_STATUSES).optional(),
  adminNote:    z.string().max(2000).optional(),
  refundAmount: z.number().nonnegative().max(MAX_REFUND_DZD).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'returns_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const { id } = await params
    if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchReturnSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return NextResponse.json({ error: 'Données invalides', ...(details && { details }) }, { status: 400 })
    }

    const supabase = createAdminClient()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.status)                update.status       = parsed.data.status
    if (parsed.data.adminNote !== undefined) update.admin_note = parsed.data.adminNote
    if (parsed.data.refundAmount !== undefined) {
      update.refund_amount = parsed.data.refundAmount
    }

    const { data: updated, error } = await supabase
      .from('return_requests')
      .update(update)
      .eq('id', id)
      .select('id')
      .single()

    if (error) throw error
    if (!updated) return NextResponse.json({ error: 'Retour introuvable' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/returns/[id]]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
