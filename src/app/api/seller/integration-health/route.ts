import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { getIntegrationHealth } from '@/lib/supabase/health'
import { getClientIp } from '@/lib/utils/ip'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'health_stats', 60, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Too many requests' }, { status: 429 }))

  const result = await requireVendorPermission(req, 'delivery:read', response)
  if (result instanceof NextResponse) return result
  const { ctx: { vendor } } = result

  try {
    const health = await getIntegrationHealth(vendor.id)
    return copyCookies(response, NextResponse.json({ health }))
  } catch (err: unknown) {
    return copyCookies(response, NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 }))
  }
}
