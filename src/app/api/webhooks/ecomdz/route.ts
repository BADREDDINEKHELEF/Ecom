import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeProviderStatus } from '@/lib/delivery/dispatch'
import { getShipmentByTracking, updateShipmentStatus } from '@/lib/supabase/shipments'
import { logger } from '@/lib/logger'

const WebhookSchema = z.object({
  Source: z.string().optional(),
  Nom: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  occurred_at: z.string().optional(),
  data: z.object({
    Tracking: z.string(),
    Situation: z.string().optional(),
    IDSituation: z.union([z.string(), z.number()]).optional(),
    Avancement: z.string().optional(),
    IDAvancement: z.union([z.string(), z.number()]).optional(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const secret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const expected = process.env.ECOM_WEBHOOK_SECRET

    if (!expected) {
      logger.error('[POST /api/webhooks/ecomdz] ECOM_WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    if (!secret || secret !== expected) {
      logger.warn('[POST /api/webhooks/ecomdz] invalid webhook secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = WebhookSchema.safeParse(body)
    if (!parsed.success) {
      logger.warn('[POST /api/webhooks/ecomdz] payload validation failed', { issues: parsed.error.issues })
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { data: eventData, id: webhookId, occurred_at: occurredAt } = parsed.data
    const { Tracking: tracking, Situation: situation, Avancement: avancement } = eventData

    const shipment = await getShipmentByTracking(tracking, 'ecom')
    if (!shipment) {
      logger.warn('[POST /api/webhooks/ecomdz] shipment not found', { tracking })
      // Return 200 so Ecom does not retry for an unknown tracking number.
      return NextResponse.json({ ok: true, ignored: true })
    }

    // Prefer Situation for terminal states, otherwise fall back to Avancement.
    const rawStatus = situation || avancement || ''
    const status = normalizeProviderStatus(rawStatus)
    const detail = [avancement, situation].filter(Boolean).join(' — ') || undefined

    await updateShipmentStatus(shipment.id, status, detail)

    logger.info('[POST /api/webhooks/ecomdz] shipment status updated', {
      tracking,
      shipmentId: shipment.id,
      status,
      detail,
      webhookId,
      occurredAt,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('[POST /api/webhooks/ecomdz] unhandled error', { error: msg })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
