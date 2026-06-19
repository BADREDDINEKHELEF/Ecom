import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'

const VALID_STATUSES = ['requested', 'approved', 'rejected', 'refunded', 'returned'] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await params
    const { status, adminNote, refundAmount } = await req.json().catch(() => ({}))

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status)      update.status       = status
    if (adminNote !== undefined) update.admin_note = adminNote
    if (refundAmount !== undefined && !isNaN(Number(refundAmount))) {
      update.refund_amount = Math.max(0, Number(refundAmount))
    }

    const { error } = await supabase
      .from('return_requests')
      .update(update)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/returns/[id]]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
