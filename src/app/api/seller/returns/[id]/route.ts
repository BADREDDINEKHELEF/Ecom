import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

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
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'returns_write', 30, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))

    const result = await requireVendorPermission(req, 'orders:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserDualRateLimit(user.id, 'returns_write', {
      burstMax: 10, burstWindowSecs: 60,
      sustainedMax: 60, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite de modifications atteinte.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const { id } = await params
    if (!UUID_RE.test(id)) return copyCookies(response, NextResponse.json({ error: 'Invalid id' }, { status: 400 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchReturnSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return copyCookies(response, NextResponse.json({ error: 'Données invalides', ...(details && { details }) }, { status: 400 }))
    }

    const admin = createAdminClient()
    
    // First, verify ownership: this return request must be associated with this vendor
    const { data: existingReturn } = await admin
      .from('return_requests')
      .select('id')
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .maybeSingle()

    if (!existingReturn) {
      return copyCookies(response, NextResponse.json({ error: 'Retour introuvable ou accès refusé' }, { status: 404 }))
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (parsed.data.status)                update.status       = parsed.data.status
    if (parsed.data.adminNote !== undefined) update.admin_note = parsed.data.adminNote
    if (parsed.data.refundAmount !== undefined) {
      update.refund_amount = parsed.data.refundAmount
    }

    const { error: updateErr } = await admin
      .from('return_requests')
      .update(update)
      .eq('id', id)

    if (updateErr) throw updateErr

    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/returns/[id]]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
