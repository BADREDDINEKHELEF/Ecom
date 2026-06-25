import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { sendAbandonedCartEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'

const AbandonedPostSchema = z.object({
  sessionId:    z.string().min(1).max(64),
  name:         z.string().max(200).optional().nullable(),
  email:        z.string().email().max(320).optional().nullable(),
  phone:        z.string().max(20).optional().nullable(),
  wilaya:       z.string().max(100).optional().nullable(),
  address:      z.string().max(500).optional().nullable(),
  cartSnapshot: z.union([z.array(z.unknown()).max(50), z.record(z.string(), z.unknown())]).optional().nullable(),
  cartTotal:    z.number().optional().default(0),
  storeSlug:    z.string().max(100).optional().nullable(),
})

const AbandonedPatchSchema = z.object({
  sessionId: z.string().min(1).max(64),
  orderId:   z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'abandoned')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = AbandonedPostSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  const { sessionId, name, email, phone, wilaya, address, cartSnapshot, cartTotal, storeSlug } = parsed.data

  try {
    const supabase = createAdminClient()
    const payload: Record<string, unknown> = {
      session_id:   sessionId,
      name:         name ?? null,
      email:        email ?? null,
      phone:        phone ?? null,
      wilaya:       wilaya ?? null,
      address:      address ?? null,
      cart_snapshot: cartSnapshot ?? null,
      cart_total:   cartTotal,
      status:       'abandoned',
      updated_at:   new Date().toISOString(),
    }

    const payloadWithSlug = storeSlug
      ? { ...payload, store_slug: storeSlug }
      : payload

    // Try with store_slug first; fall back without if column not yet migrated
    const { error } = await supabase.from('abandoned_checkouts').upsert(payloadWithSlug, { onConflict: 'session_id' })
    if (error && storeSlug) {
      await supabase.from('abandoned_checkouts').upsert(payload, { onConflict: 'session_id' })
    }

    // Send abandoned cart email immediately if email provided (degrade gracefully)
    if (email && cartTotal > 0) {
      sendAbandonedCartEmail({
        to:        email,
        name:      name ?? '',
        cartTotal,
      }).catch((err) => logger.error('[email] abandoned cart failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[POST /api/abandoned]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'abandoned')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = AbandonedPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    const supabase = createAdminClient()
    await supabase.from('abandoned_checkouts').update({
      status: 'recovered',
      recovered_at: new Date().toISOString(),
      order_id: parsed.data.orderId ?? null,
    }).eq('session_id', parsed.data.sessionId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/abandoned]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
