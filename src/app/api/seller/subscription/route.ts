import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import {
  getVendorByUserIdServer,
  getSubscriptionPlans,
  getVendorSubscription,
  createVendorSubscription,
} from '@/lib/supabase/vendors'
import { getStoreSettings } from '@/lib/supabase/settings'

// GET /api/seller/subscription — current subscription + available plans
export async function GET(req: NextRequest) {
  try {
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seller/subscription — submit payment proof to request activation
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const body = await req.json().catch(() => ({})) as {
      plan_id?: string
      payment_method?: string
      payment_reference?: string
      payment_proof_url?: string
    }

    const { plan_id, payment_method, payment_reference, payment_proof_url } = body

    if (!plan_id || !payment_method) {
      return NextResponse.json({ error: 'plan_id and payment_method are required' }, { status: 400 })
    }

    const plans = await getSubscriptionPlans()
    const plan = plans.find((p) => p.id === plan_id)
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const now = new Date()
    const expires = new Date(now)
    expires.setDate(expires.getDate() + plan.billing_period_days)
    const grace = new Date(expires)
    grace.setDate(grace.getDate() + 7)

    const sub = await createVendorSubscription({
      vendor_id: vendor.id,
      plan_id,
      status: 'trial',           // admin activates after verifying payment
      amount_dzd: plan.price_dzd,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      grace_period_ends_at: grace.toISOString(),
      payment_method: payment_method as 'manual' | 'baridi_mob' | 'ccp' | 'edahabia',
      payment_reference: payment_reference ?? null,
      payment_proof_url: payment_proof_url ?? null,
      admin_note: null,
      renewed_from_id: null,
    } as Parameters<typeof createVendorSubscription>[0])

    return NextResponse.json({ subscription: sub }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
