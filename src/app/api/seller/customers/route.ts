import { NextRequest, NextResponse } from 'next/server'
import { getVendorCustomers } from '@/lib/supabase/customers'
import { logSellerDataAccess } from '@/lib/auth/sellerAudit'
import { getClientIp } from '@/lib/utils/ip'
import { requireSellerWithRateLimit, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSellerWithRateLimit(req, 'customers_list', 30, 60)
    if (auth instanceof NextResponse) return auth
    const { vendor } = auth

    const customers = await getVendorCustomers(vendor.id)

    // Fire-and-forget audit log
    void logSellerDataAccess({
      vendorId:     vendor.id,
      action:       'view_customer_list',
      resourceType: 'customer_list',
      ipAddress:    getClientIp(req),
      userAgent:    req.headers.get('user-agent') ?? undefined,
    })

    return NextResponse.json(customers)
  } catch (err) {
    return logAndReturnError('[GET /api/seller/customers]', err)
  }
}
