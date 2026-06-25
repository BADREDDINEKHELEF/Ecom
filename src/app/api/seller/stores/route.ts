import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const CreateStoreSchema = z.object({
  store_name:  z.string().min(1).max(100),
  store_slug:  z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  phone:       z.string().max(30).optional(),
  wilaya:      z.string().max(100).optional(),
})

const PatchStoreSchema = z.object({
  id:          z.string().uuid(),
  store_name:  z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  phone:       z.string().max(30).optional(),
  wilaya:      z.string().max(100).optional(),
  is_active:   z.boolean().optional(),
})

// GET /api/seller/stores — list all stores owned by the authenticated user
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'stores_read', 60, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
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
  } catch (err) {
    logger.error('[GET /api/seller/stores]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seller/stores — create a new store for the authenticated user
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'stores_write', 5, 3600)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserRateLimit(user.id, 'stores_write', 3, 3600)
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreateStoreSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'store_name and store_slug are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Enforce plan limits: count existing stores
    const { count } = await admin
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)

    // Default limit is 1 store for basic/trial; check subscription
    // Fetch vendor IDs first to avoid raw SQL subquery interpolation
    const { data: vendorRows } = await admin
      .from('vendors')
      .select('id')
      .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
    const vendorIds = (vendorRows ?? []).map((v: { id: string }) => v.id)

    const { data: subData } = await admin
      .from('vendor_subscriptions')
      .select('plan_id, status')
      .in('vendor_id', vendorIds.length > 0 ? vendorIds : ['00000000-0000-0000-0000-000000000000'])
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
      .eq('store_slug', parsed.data.store_slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'This store URL is already taken.' }, { status: 409 })
    }

    const { data: newStore, error: insertErr } = await admin
      .from('vendors')
      .insert({
        user_id: user.id,
        owner_id: user.id,
        store_name: parsed.data.store_name.trim(),
        store_slug: parsed.data.store_slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: parsed.data.description ?? null,
        phone: parsed.data.phone ?? null,
        wilaya: parsed.data.wilaya ?? null,
        commission_rate: 10,
        is_approved: false,
        is_active: true,
        subscription_status: 'trial',
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    return NextResponse.json({ store: newStore }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/stores]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/seller/stores — update a store (must be owned by user)
export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'stores_write', 20, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )

    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchStoreSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify ownership
    const { data: store } = await admin
      .from('vendors')
      .select('id, user_id, owner_id')
      .eq('id', parsed.data.id)
      .maybeSingle()

    if (!store || (store.user_id !== user.id && store.owner_id !== user.id)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.store_name  !== undefined) updates.store_name  = parsed.data.store_name
    if (parsed.data.description !== undefined) updates.description = parsed.data.description
    if (parsed.data.phone       !== undefined) updates.phone       = parsed.data.phone
    if (parsed.data.wilaya      !== undefined) updates.wilaya      = parsed.data.wilaya
    if (parsed.data.is_active   !== undefined) updates.is_active   = parsed.data.is_active

    const { error } = await admin.from('vendors').update(updates).eq('id', parsed.data.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/stores]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
