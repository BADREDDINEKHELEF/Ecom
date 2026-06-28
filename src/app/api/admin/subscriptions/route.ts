import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { writeAuditLog } from '@/lib/auth/auditLog'
import {
  getAllVendorSubscriptions,
  updateVendorSubscription,
  getSubscriptionPlans,
  getVendorSubscriptionById,
} from '@/lib/supabase/vendors'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const PatchSubscriptionSchema = z.object({
  id:        z.string().min(1),
  status:    z.enum(['trial', 'active', 'grace_period', 'expired', 'cancelled']).optional(),
  admin_note: z.string().optional(),
  expires_at: z.string().optional(),
})

// GET /api/admin/subscriptions?status=trial&page=0
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'subscriptions_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

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
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'subscriptions_write', 30, 60)
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

    const parsed = PatchSubscriptionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates: Parameters<typeof updateVendorSubscription>[1] = {
      ...(parsed.data.status !== undefined       && { status: parsed.data.status }),
      ...(parsed.data.admin_note !== undefined   && { admin_note: parsed.data.admin_note }),
      ...(parsed.data.expires_at                 && { expires_at: parsed.data.expires_at }),
    }

    // When approving (trial → active), reset billing window from now
    if (parsed.data.status === 'active') {
      const [sub, plans] = await Promise.all([
        getVendorSubscriptionById(parsed.data.id),
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

    await updateVendorSubscription(parsed.data.id, updates)

    const auditAction =
      parsed.data.status === 'active'    ? 'subscription_approved' :
      parsed.data.status === 'cancelled' ? 'subscription_rejected' :
      'subscription_updated'
    await writeAuditLog({
      action: auditAction, ip, userAgent: ua, result: 'success',
      meta: { subscription_id: parsed.data.id, status: parsed.data.status },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/subscriptions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
