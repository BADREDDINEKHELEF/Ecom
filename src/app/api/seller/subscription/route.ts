import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import {
  getVendorByUserIdServer,
  getSubscriptionPlans,
  getVendorSubscription,
  createVendorSubscription,
} from '@/lib/supabase/vendors'
import { getStoreSettings } from '@/lib/supabase/settings'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const SubmitSubscriptionSchema = z.object({
  plan_id:            z.string().min(1),
  payment_method:     z.string().min(1),
  payment_reference:  z.string().optional(),
  payment_proof_url:  z.string().url().optional(),
})

// GET /api/seller/subscription — current subscription + available plans
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'subscription_read', 60, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const [plans, subscription, settings] = await Promise.all([
      getSubscriptionPlans(),
      getVendorSubscription(vendor.id),
      getStoreSettings(),
    ])

    const paymentDetails = {
      ccp:       settings.paymentCcp,
      baridimob: settings.paymentBaridimob,
      note:      settings.paymentNote,
    }

    return NextResponse.json({ subscription, plans, vendor, paymentDetails })
  } catch (err) {
    logger.error('[GET /api/seller/subscription]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seller/subscription — submit payment proof to request activation
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'subscription_write', 5, 3600)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserRateLimit(user.id, 'subscription_write', 3, 3600)
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = SubmitSubscriptionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'plan_id and payment_method are required' }, { status: 400 })

    const { plan_id, payment_method, payment_reference, payment_proof_url } = parsed.data

    const plans = await getSubscriptionPlans()
    const plan = plans.find((p) => p.id === plan_id)
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const now = new Date()
    const expires = new Date(now)
    expires.setDate(expires.getDate() + plan.billing_period_days)
    const grace = new Date(expires)
    grace.setDate(grace.getDate() + 7)

    const sub = await createVendorSubscription({
      vendorId: vendor.id,
      planId: plan_id,
      status: 'trial',
      amountDzd: plan.price_dzd,
      startedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      gracePeriodEndsAt: grace.toISOString(),
      paymentMethod: payment_method as 'manual' | 'baridi_mob' | 'ccp' | 'edahabia',
      paymentReference: payment_reference ?? null,
      paymentProofUrl: payment_proof_url ?? null,
      adminNote: null,
      renewedFromId: null,
    })

    return NextResponse.json({ subscription: sub }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/subscription]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
