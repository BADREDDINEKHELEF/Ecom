import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/seller/stores — list all stores owned by the authenticated user
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('vendors')
      .select('id,store_name,store_slug,logo_url,is_active,is_approved,subscription_status,subscription_plan_id,wilaya,created_at')
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ stores: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seller/stores — create a new store for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      store_name?: string
      store_slug?: string
      description?: string
      phone?: string
      wilaya?: string
    }

    if (!body.store_name || !body.store_slug) {
      return NextResponse.json({ error: 'store_name and store_slug are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Enforce plan limits: count existing stores
    const { count } = await admin
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)

    // Default limit is 1 store for basic/trial; check subscription
    const { data: subData } = await admin
      .from('vendor_subscriptions')
      .select('plan_id, status')
      .or(
        `vendor_id.in.(select id from vendors where user_id='${user.id}' or owner_id='${user.id}')`
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const planLimits: Record<string, number> = { basic: 1, professional: 3, enterprise: 10 }
    const maxStores = planLimits[(subData as { plan_id: string } | null)?.plan_id ?? 'basic'] ?? 1

    if ((count ?? 0) >= maxStores) {
      return NextResponse.json({
        error: `Your plan allows up to ${maxStores} store${maxStores === 1 ? '' : 's'}. Upgrade to add more.`,
        upgradeRequired: true,
      }, { status: 403 })
    }

    // Check slug uniqueness
    const { data: existing } = await admin
      .from('vendors')
      .select('id')
      .eq('store_slug', body.store_slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This store URL is already taken.' }, { status: 409 })
    }

    const { data: newStore, error: insertErr } = await admin
      .from('vendors')
      .insert({
        user_id: user.id,
        owner_id: user.id,
        store_name: body.store_name.trim(),
        store_slug: body.store_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: body.description ?? null,
        phone: body.phone ?? null,
        wilaya: body.wilaya ?? null,
        commission_rate: 10,
        is_approved: false,
        is_active: true,
        subscription_status: 'trial',
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    return NextResponse.json({ store: newStore }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/seller/stores — update a store (must be owned by user)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as {
      id?: string
      store_name?: string
      description?: string
      phone?: string
      wilaya?: string
      is_active?: boolean
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify ownership
    const { data: store } = await admin
      .from('vendors')
      .select('id, user_id, owner_id')
      .eq('id', body.id)
      .maybeSingle()

    if (!store || (store.user_id !== user.id && store.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (body.store_name  !== undefined) updates.store_name  = body.store_name
    if (body.description !== undefined) updates.description = body.description
    if (body.phone       !== undefined) updates.phone       = body.phone
    if (body.wilaya      !== undefined) updates.wilaya      = body.wilaya
    if (body.is_active   !== undefined) updates.is_active   = body.is_active

    const { error } = await admin.from('vendors').update(updates).eq('id', body.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
