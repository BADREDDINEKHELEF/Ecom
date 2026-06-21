import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getSellerAnalytics } from '@/lib/supabase/analytics'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'analytics', 60, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRl = await checkUserRateLimit(user.id, 'analytics_read', 30, 3600)
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

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
