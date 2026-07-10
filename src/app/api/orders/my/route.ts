import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { getOrdersByUserId } from '@/lib/supabase/orders'
import { checkUserRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

/**
 * GET /api/orders/my
 *
 * Returns the authenticated buyer's order history. This route relies on
 * orders.user_id being populated at checkout (fixed in createOrder) and
 * fails closed when the user is not authenticated.
 */
export async function GET(req: NextRequest) {
  const response = NextResponse.next()

  const supabase = createRouteClient(req, response)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return copyCookies(
      response,
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  // Per-user rate limit — protects against enumeration / scraping.
  const rl = await checkUserRateLimit(user.id, 'orders-my', 30, 60)
  if (!rl.allowed) {
    return copyCookies(
      response,
      NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    )
  }

  try {
    const orders = await getOrdersByUserId(user.id)
    return copyCookies(response, NextResponse.json({ orders }))
  } catch (err) {
    logger.error('[GET /api/orders/my]', { userId: user.id, error: err instanceof Error ? err.message : String(err) })
    return copyCookies(
      response,
      NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    )
  }
}
