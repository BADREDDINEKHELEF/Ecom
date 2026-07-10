import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'inventory_read', 60, 60)
    if (!rl.allowed) {
      return copyCookies(response, NextResponse.json(
        { error: 'Trop de requêtes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      ))
    }

    const result = await requireVendorPermission(req, 'products:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { vendor } } = result

    const supabase = createRouteClient(req, response)
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, images, stock')
      .eq('vendor_id', vendor.id)
      .order('name', { ascending: true })

    if (error) throw error

    const threshold = vendor.low_stock_threshold ?? 5
    const inventory = (products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      images: p.images,
      sku: null,
      stock: p.stock,
      reserved: 0,
      available: p.stock,
      threshold,
    }))

    return copyCookies(response, NextResponse.json(inventory))
  } catch (err) {
    logger.error('[GET /api/seller/inventory]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
