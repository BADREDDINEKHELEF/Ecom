import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// GET /api/sponsored?placement=homepage&limit=8 — public endpoint for active sponsored products
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'sponsored')
    if (!rl.allowed) return NextResponse.json(
      { products: [] },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const { searchParams } = new URL(req.url)
    // Allowlist placement to prevent PostgREST filter injection via .or() string interpolation
    const VALID_PLACEMENTS = new Set(['homepage', 'sidebar', 'category', 'product', 'checkout', 'search'])
    const rawPlacement = searchParams.get('placement') ?? 'homepage'
    const placement = VALID_PLACEMENTS.has(rawPlacement) ? rawPlacement : 'homepage'
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '8')))

    const admin = createAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await admin
      .from('sponsored_products')
      .select('product_id, placement, impressions, clicks, products(id, name, price, images, niche_id, vendor_id), vendors(store_name, store_slug)')
      .eq('status', 'active')
      .or(`placement.eq.${placement},placement.eq.all`)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('impressions', { ascending: true })   // show least-seen first (fair rotation)
      .limit(limit)

    if (error) throw error

    type ProductRow = { id: string; name: string; price: number; images: string[]; niche_id: string; vendor_id: string }
    type VendorRow = { store_name: string; store_slug: string }

    const products = (data ?? []).map((row) => {
      const p = (row.products as unknown as ProductRow | null)
      const v = (row.vendors as unknown as VendorRow | null)
      return {
        id: p?.id ?? '',
        name: p?.name ?? '',
        price: p?.price ?? 0,
        image: p?.images?.[0] ?? null,
        niche_id: p?.niche_id ?? '',
        store_name: v?.store_name ?? '',
        store_slug: v?.store_slug ?? '',
        sponsored_id: row.product_id,
      }
    }).filter((p) => p.id)

    // Increment impression counters in background (fire-and-forget)
    const sponsoredIds = (data ?? []).map((r) => r.product_id)
    if (sponsoredIds.length > 0) {
      void admin.rpc('increment_sponsored_impressions', { product_ids: sponsoredIds })
    }

    return NextResponse.json({ products }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
