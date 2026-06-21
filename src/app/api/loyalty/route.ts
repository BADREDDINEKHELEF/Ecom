import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getPointsBalance } from '@/lib/loyalty'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'loyalty')
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )

    const supabase = createRouteClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const balance = await getPointsBalance(user.id)
    return NextResponse.json({ balance })
  } catch (err) {
    logger.error('[GET /api/loyalty]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
