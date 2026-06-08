import { NextRequest, NextResponse } from 'next/server'
import { getOrdersForTracking } from '@/lib/supabase/orders'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const ALGERIAN_PHONE_RE = /^(213[5-7]|0[5-7])\d{8}$/

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'order_track')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json({ error: 'phone parameter required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  if (!ALGERIAN_PHONE_RE.test(normalized)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
  }

  try {
    const orders = await getOrdersForTracking(normalized)
    return NextResponse.json({ orders })
  } catch (err) {
    logger.error('[GET /api/track]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
