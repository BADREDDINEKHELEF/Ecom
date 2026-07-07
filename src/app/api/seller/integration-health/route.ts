import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { getIntegrationHealth } from '@/lib/supabase/health'
import { getClientIp } from '@/lib/utils/ip'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'health_stats', 60, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Too many requests' }, { status: 429 }))

  const supabase = createRouteClient(req, response)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

  try {
    const health = await getIntegrationHealth(vendor.id)
    return copyCookies(response, NextResponse.json({ health }))
  } catch (err: unknown) {
    return copyCookies(response, NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }))
  }
}
