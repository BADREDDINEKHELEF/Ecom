import { NextRequest, NextResponse } from 'next/server'
import { validatePromoCode } from '@/lib/supabase/queries'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'promo_validate')
  if (!rl.allowed) {
    return NextResponse.json({ valid: false, message: 'too_many_requests' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ valid: false, message: 'invalid' }, { status: 400 })
    const { code, orderTotal } = body
    if (!code || typeof code !== 'string' || typeof orderTotal !== 'number' || orderTotal < 0) {
      return NextResponse.json({ valid: false, message: 'invalid' }, { status: 400 })
    }
    const result = await validatePromoCode(code, orderTotal)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ valid: false, message: 'invalid' }, { status: 500 })
  }
}
