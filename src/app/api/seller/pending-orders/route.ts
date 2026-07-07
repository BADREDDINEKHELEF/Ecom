import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { getVendorPendingOrders } from '@/lib/supabase/orders'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'pending_orders', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) {
      return copyCookies(response, NextResponse.json({ error: 'Vendor account not found' }, { status: 403 }))
    }

    const { searchParams } = new URL(req.url)
    const requestedVendorId = searchParams.get('vendorId')

    // Only allow fetching own vendor data
    if (requestedVendorId && requestedVendorId !== vendor.id) {
      return copyCookies(response, NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const orders = await getVendorPendingOrders(vendor.id)
    return copyCookies(response, NextResponse.json({ orders }))
  } catch (err) {
    logger.error('[GET /api/seller/pending-orders]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
