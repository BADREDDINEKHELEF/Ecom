import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const VALID_STATUSES = ['requested', 'approved', 'rejected', 'refunded', 'returned'] as const

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const { status, adminNote, refundAmount } = await req.json().catch(() => ({}))

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    if (adminNote !== undefined && (typeof adminNote !== 'string' || adminNote.length > 2000)) {
      return NextResponse.json({ error: 'adminNote invalide (max 2000 caractères)' }, { status: 400 })
    }

    const MAX_REFUND_DZD = 10_000_000
    if (refundAmount !== undefined && (isNaN(Number(refundAmount)) || Number(refundAmount) < 0 || Number(refundAmount) > MAX_REFUND_DZD)) {
      return NextResponse.json({ error: `Montant invalide (0 – ${MAX_REFUND_DZD.toLocaleString()} DZD)` }, { status: 400 })
    }

    const supabase = createAdminClient()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status)                update.status        = status
    if (adminNote !== undefined) update.admin_note  = adminNote
    if (refundAmount !== undefined) {
      update.refund_amount = Math.max(0, Math.min(MAX_REFUND_DZD, Number(refundAmount)))
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
