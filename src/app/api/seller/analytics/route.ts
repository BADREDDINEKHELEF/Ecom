import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getSellerAnalytics } from '@/lib/supabase/analytics'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor account not found' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const rawDays = parseInt(searchParams.get('days') ?? '30')
    const daysBack = Math.min(365, Math.max(1, Number.isFinite(rawDays) ? rawDays : 30))

    const analytics = await getSellerAnalytics(vendor.id, daysBack)
    return NextResponse.json(analytics)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
