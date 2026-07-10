import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const UpdateSchema = z.object({
  productId: z.string().uuid(),
  newStock: z.number().int().min(0),
})

export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'inventory_stock', 30, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requÃªtes. RÃ©essayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))

    const result = await requireVendorPermission(req, 'products:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserRateLimit(user.id, 'inventory_stock', 60, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = UpdateSchema.safeParse(body)
    if (!parsed.success) {
      return copyCookies(response, NextResponse.json({ error: 'Invalid input' }, { status: 400 }))
    }

    const { productId, newStock } = parsed.data

    // Verify ownership and update in one go
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('vendor_id', vendor.id)

    if (error) throw error

    revalidateTag(`inventory-${vendor.id}`)
    revalidateTag(`products`)

    return copyCookies(response, NextResponse.json({ success: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/inventory/stock]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Erreur serveur. RÃ©essayez.' }, { status: 500 }))
  }
}
