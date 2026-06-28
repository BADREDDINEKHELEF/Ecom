import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getOrdersByPhone } from '@/lib/supabase/orders'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const Schema = z.object({
  phone: z.string().min(5).max(30),
})

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'order-track')
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const phone = new URL(req.url).searchParams.get('phone') ?? ''
  const parsed = Schema.safeParse({ phone })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })

  try {
    const orders = await getOrdersByPhone(parsed.data.phone)
    return NextResponse.json({ orders })
  } catch (err) {
    logger.error('[GET /api/orders/track]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
