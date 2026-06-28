import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminWithRateLimit, parseBody, logAndReturnError } from '@/lib/api/routeHelpers'

const PatchPromotionSchema = z.object({
  id:         z.string().min(1),
  status:     z.enum(['pending', 'active', 'paused', 'rejected', 'expired']).optional(),
  admin_note: z.string().optional(),
  placement:  z.string().max(50).optional(),
})

// GET /api/admin/promotions?status=pending&page=0
export async function GET(req: NextRequest) {
  const denied = await requireAdminWithRateLimit(req, 'promotions_read', 120, 60)
  if (denied) return denied

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
  const denied = await requireAdminWithRateLimit(req, 'promotions_write', 30, 60)
  if (denied) return denied

  try {
    const bodyResult = await parseBody(req)
    if (bodyResult instanceof NextResponse) return bodyResult
    const body = bodyResult.data

    const parsed = PatchPromotionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const updates: Record<string, unknown> = {}
    if (parsed.data.status)     updates.status     = parsed.data.status
    if (parsed.data.admin_note !== undefined) updates.admin_note = parsed.data.admin_note
    if (parsed.data.placement)  updates.placement  = parsed.data.placement
    if (parsed.data.status === 'active') {
      updates.approved_at = new Date().toISOString()
    }
    if (parsed.data.status === 'rejected') {
      updates.rejected_at = new Date().toISOString()
    }

    const { error } = await admin
      .from('sponsored_products')
      .update(updates)
      .eq('id', parsed.data.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return logAndReturnError('[PATCH /api/admin/promotions]', err)
  }
}
