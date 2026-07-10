import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'test_delivery', 5, 300)
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))
  const result = await requireVendorPermission(req, 'delivery:config', response)
  if (result instanceof NextResponse) return result
  const { ctx: { user, vendor } } = result

  const userRl = await checkUserRateLimit(user.id, 'test_delivery', 3, 300)
  if (!userRl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Limite atteinte. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
  ))

  const config = await getVendorDeliveryConfig(vendor.id)
  if (!config || !config.apec_api_id || !config.apec_api_token) {
    return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
  }
  const { apec_api_id: apiId, apec_api_token: apiToken } = config

  try {
    // Call a lightweight GET to verify APEC credentials
    const res = await fetch('https://api.apec.dz/v1/agencies/', {
      method: 'GET',
      headers: {
        'X-API-ID':    apiId,
        'X-API-TOKEN': apiToken,
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return copyCookies(response, NextResponse.json({ ok: false }))
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch {
    return copyCookies(response, NextResponse.json({ ok: false }))
  }
}
