import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'test_delivery', 5, 300)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRl = await checkUserRateLimit(user.id, 'test_delivery', 3, 300)
  if (!userRl.allowed) return NextResponse.json(
    { error: 'Limite atteinte. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
  )

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  const config = await getVendorDeliveryConfig(vendor.id)
  if (!config || !config.yalidine_api_id || !config.yalidine_api_token) {
    return NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 })
  }
  const { yalidine_api_id: apiId, yalidine_api_token: apiToken } = config

  try {
    // Hit the agencies list endpoint — lightweight GET that validates credentials without side effects
    const res = await fetch('https://api.yalidine.app/v1/agencies/', {
      method: 'GET',
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return NextResponse.json({ ok: false })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
