import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { sendAbandonedCartEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'abandoned')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const body = await req.json().catch(() => null)
    if (!body?.sessionId) return NextResponse.json({ ok: false }, { status: 400 })

    const { sessionId, name, email, phone, wilaya, address, cartSnapshot, cartTotal } = body

    if (typeof sessionId !== 'string' || sessionId.length > 64) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = createAdminClient()
    await supabase.from('abandoned_checkouts').upsert(
      {
        session_id: sessionId,
        name: typeof name === 'string' ? name.slice(0, 200) : null,
        email: typeof email === 'string' && email.includes('@') ? email.slice(0, 320) : null,
        phone: typeof phone === 'string' ? phone.slice(0, 20) : null,
        wilaya: typeof wilaya === 'string' ? wilaya.slice(0, 100) : null,
        address: typeof address === 'string' ? address.slice(0, 500) : null,
        cart_snapshot: cartSnapshot ?? null,
        cart_total: typeof cartTotal === 'number' ? cartTotal : 0,
        status: 'abandoned',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )

    // Send abandoned cart email immediately if email provided (degrade gracefully)
    if (typeof email === 'string' && email.includes('@') && typeof cartTotal === 'number' && cartTotal > 0) {
      sendAbandonedCartEmail({
        to:        email,
        name:      typeof name === 'string' ? name : '',
        cartTotal,
      }).catch((err) => logger.error('[email] abandoned cart failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'abandoned')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const { sessionId, orderId } = await req.json().catch(() => ({}))
    if (!sessionId) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = createAdminClient()
    await supabase.from('abandoned_checkouts').update({
      status: 'recovered',
      recovered_at: new Date().toISOString(),
      order_id: orderId ?? null,
    }).eq('session_id', sessionId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
