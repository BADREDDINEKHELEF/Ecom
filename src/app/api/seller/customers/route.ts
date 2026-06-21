import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { getVendorCustomers } from '@/lib/supabase/customers'
import { logSellerDataAccess } from '@/lib/auth/sellerAudit'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'customers_list', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const customers = await getVendorCustomers(vendor.id)

    // Fire-and-forget audit log
    void logSellerDataAccess({
      vendorId:     vendor.id,
      action:       'view_customer_list',
      resourceType: 'customer_list',
      ipAddress:    ip,
      userAgent:    req.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json(customers)
  } catch (err) {
    logger.error('[GET /api/seller/customers]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
