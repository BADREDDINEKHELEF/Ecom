import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { writeAuditLog } from '@/lib/auth/auditLog'
import {
  getAllVendorSubscriptions,
  updateVendorSubscription,
  getSubscriptionPlans,
  getSubscriptionById,
} from '@/lib/supabase/vendors'

// GET /api/admin/subscriptions?status=trial&page=0
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? undefined
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const result = await getAllVendorSubscriptions({ status, page, pageSize: 50 })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/subscriptions — approve / reject / update a subscription
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  const ua = req.headers.get('user-agent') ?? 'unknown'

  try {
    const body = await req.json().catch(() => ({})) as {
      id?: string
      status?: string
      admin_note?: string
      expires_at?: string
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const validStatuses = ['trial', 'active', 'grace_period', 'expired', 'cancelled']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Parameters<typeof updateVendorSubscription>[1] = {
      ...(body.status !== undefined       && { status: body.status as 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled' }),
      ...(body.admin_note !== undefined   && { admin_note: body.admin_note }),
      ...(body.expires_at                 && { expires_at: body.expires_at }),
    }

    // When approving (trial → active), reset billing window from now
    if (body.status === 'active') {
      const [sub, plans] = await Promise.all([
        getSubscriptionById(body.id),
        getSubscriptionPlans(),
      ])
      const plan = sub ? plans.find((p) => p.id === sub.plan_id) : null
      if (plan) {
        const now = new Date()
        const expires = new Date(now)
        expires.setDate(expires.getDate() + plan.billing_period_days)
        const grace = new Date(expires)
        grace.setDate(grace.getDate() + 7)
        updates.started_at = now.toISOString()
        updates.expires_at = expires.toISOString()
        updates.grace_period_ends_at = grace.toISOString()
      }
    }

    await updateVendorSubscription(body.id, updates)

    const auditAction =
      body.status === 'active'    ? 'subscription_approved' :
      body.status === 'cancelled' ? 'subscription_rejected' :
      'subscription_updated'
    await writeAuditLog({
      action: auditAction, ip, userAgent: ua, result: 'success',
      meta: { subscription_id: body.id, status: body.status },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
