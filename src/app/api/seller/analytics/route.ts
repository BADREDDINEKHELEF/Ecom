import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { getSellerAnalytics } from '@/lib/supabase/analytics'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'analytics', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'analytics:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserRateLimit(user.id, 'analytics_read', 30, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const { searchParams } = new URL(req.url)
    const rawDays = parseInt(searchParams.get('days') ?? '30')
    const daysBack = Math.min(365, Math.max(1, Number.isFinite(rawDays) ? rawDays : 30))

    const analytics = await getSellerAnalytics(vendor.id, daysBack)
    return copyCookies(response, NextResponse.json(analytics))
  } catch {
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
