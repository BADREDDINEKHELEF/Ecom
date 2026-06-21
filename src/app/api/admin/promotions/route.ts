import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// GET /api/admin/promotions?status=pending&page=0
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promotions_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const pageSize = 50

    const admin = createAdminClient()
    let q = admin
      .from('sponsored_products')
      .select('*, products(name, images, price), vendors(store_name, store_slug)')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize)

    if (status) q = q.eq('status', status)

    const { data, error } = await q
    if (error) throw error

    const rows = (data ?? []).map((r) => ({
      ...r,
      product_name: (r.products as { name: string } | null)?.name ?? '',
      product_image: ((r.products as { images: string[] } | null)?.images ?? [])[0] ?? null,
      store_name: (r.vendors as { store_name: string } | null)?.store_name ?? '',
      store_slug: (r.vendors as { store_slug: string } | null)?.store_slug ?? '',
    }))

    return NextResponse.json({ promotions: rows })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/promotions — approve / reject / update
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promotions_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const body = await req.json().catch(() => ({})) as {
      id?: string
      status?: string
      admin_note?: string
      placement?: string
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const validStatuses = ['pending', 'active', 'paused', 'rejected', 'expired']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const admin = createAdminClient()
    const updates: Record<string, unknown> = {}
    if (body.status)     updates.status     = body.status
    if (body.admin_note !== undefined) updates.admin_note = body.admin_note
    if (body.placement)  updates.placement  = body.placement
    if (body.status === 'active') {
      updates.approved_at = new Date().toISOString()
    }
    if (body.status === 'rejected') {
      updates.rejected_at = new Date().toISOString()
    }

    const { error } = await admin
      .from('sponsored_products')
      .update(updates)
      .eq('id', body.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
