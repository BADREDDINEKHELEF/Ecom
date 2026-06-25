import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validatePromoCode } from '@/lib/supabase/queries'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { createRouteClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const PromoValidateSchema = z.object({
  code:       z.string().min(1).max(100),
  orderTotal: z.number().min(0),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'promo_validate')
  if (!rl.allowed) {
    return NextResponse.json({ valid: false, message: 'too_many_requests' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ valid: false, message: 'invalid' }, { status: 400 })
  }

  const parsed = PromoValidateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ valid: false, message: 'invalid' }, { status: 400 })

  try {
    const routeClient = createRouteClient(req)
    const { data: { user } } = await routeClient.auth.getUser()
    const result = await validatePromoCode(parsed.data.code, parsed.data.orderTotal, user?.id)
    return NextResponse.json(result)
  } catch (err) {
    logger.error('[POST /api/promo/validate]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ valid: false, message: 'invalid' }, { status: 500 })
  }
}
