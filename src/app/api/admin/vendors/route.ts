import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { writeAuditLog, type AuditAction } from '@/lib/auth/auditLog'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllVendors } from '@/lib/supabase/vendors'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

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
    const body = await req.json().catch(() => ({})) as {
      id?:         string
      action?:     'approve' | 'decline' | 'suspend' | 'reactivate'
      admin_note?: string
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!body.id || !UUID_RE.test(body.id)) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    if (!body.action) return NextResponse.json({ error: 'action is required' }, { status: 400 })
    if (!['approve', 'decline', 'suspend', 'reactivate'].includes(body.action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (body.admin_note && body.admin_note.length > 1000) {
      return NextResponse.json({ error: 'admin_note trop long' }, { status: 400 })
    }

    const admin = createAdminClient()

    const updates: Record<string, unknown> =
      body.action === 'approve'
        ? { is_approved: true,  is_active: true,  admin_note: null }
        : body.action === 'decline'
        ? { is_approved: false, is_active: false, admin_note: body.admin_note ?? null }
        : body.action === 'suspend'
        ? { is_active: false }
        : { is_active: true }

    const { error } = await admin.from('vendors').update(updates).eq('id', body.id)
    if (error) throw error

    const actionMap: Record<string, AuditAction> = {
      approve:    'vendor_approved',
      decline:    'vendor_declined',
      suspend:    'vendor_suspended',
      reactivate: 'vendor_reactivated',
    }
    await writeAuditLog({
      action:    actionMap[body.action],
      ip, userAgent: ua, result: 'success',
      meta: { vendor_id: body.id, admin_note: body.admin_note },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
