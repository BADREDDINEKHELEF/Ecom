import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { writeAuditLog, type AuditAction } from '@/lib/auth/auditLog'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllVendors } from '@/lib/supabase/vendors'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const PatchVendorSchema = z.object({
  id:         z.string().uuid(),
  action:     z.enum(['approve', 'decline', 'suspend', 'reactivate']),
  admin_note: z.string().max(1000).optional(),
})

// GET /api/admin/vendors?filter=pending|approved|all&page=0
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'vendors_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const { searchParams } = new URL(req.url)
    const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const result = await getAllVendors(page, 100)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/vendors
// Body: { id, action: 'approve' | 'decline' | 'suspend' | 'reactivate', admin_note? }
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'vendors_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  const ua = req.headers.get('user-agent') ?? 'unknown'

  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchVendorSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      if (issue?.path[0] === 'id') return NextResponse.json({ error: 'id is required' }, { status: 400 })
      if (issue?.path[0] === 'action') return NextResponse.json({ error: 'action is required' }, { status: 400 })
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const admin = createAdminClient()

    const updates: Record<string, unknown> =
      parsed.data.action === 'approve'
        ? { is_approved: true,  is_active: true,  admin_note: null }
        : parsed.data.action === 'decline'
        ? { is_approved: false, is_active: false, admin_note: parsed.data.admin_note ?? null }
        : parsed.data.action === 'suspend'
        ? { is_active: false }
        : { is_active: true }

    const { error, count } = await admin.from('vendors').update(updates, { count: 'exact' }).eq('id', parsed.data.id)
    if (error) throw error
    if (count === 0) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const actionMap: Record<string, AuditAction> = {
      approve:    'vendor_approved',
      decline:    'vendor_declined',
      suspend:    'vendor_suspended',
      reactivate: 'vendor_reactivated',
    }
    await writeAuditLog({
      action:    actionMap[parsed.data.action],
      ip, userAgent: ua, result: 'success',
      meta: { vendor_id: parsed.data.id, admin_note: parsed.data.admin_note },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/vendors]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
