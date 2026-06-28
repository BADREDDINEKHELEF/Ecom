import { NextRequest, NextResponse } from 'next/server'
import { getSellerAnalytics } from '@/lib/supabase/analytics'
import { checkUserRateLimit } from '@/lib/auth/rateLimit'
import { requireSellerWithRateLimit, rateLimitResponse, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSellerWithRateLimit(req, 'analytics', 60, 60)
    if (auth instanceof NextResponse) return auth
    const { user, vendor } = auth

    const userRl = await checkUserRateLimit(user.id, 'analytics_read', 30, 3600)
    if (!userRl.allowed) return rateLimitResponse(userRl)

    const { searchParams } = new URL(req.url)
    const rawDays = parseInt(searchParams.get('days') ?? '30')
    const daysBack = Math.min(365, Math.max(1, Number.isFinite(rawDays) ? rawDays : 30))

    const analytics = await getSellerAnalytics(vendor.id, daysBack)
    return NextResponse.json(analytics)
  } catch (err) {
    return logAndReturnError('[GET /api/seller/analytics]', err)
  }
}
