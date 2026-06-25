import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import {
  getSellerNotifications,
  markNotificationRead,
  markAllRead,
} from '@/lib/notifications/seller'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const PatchNotificationSchema = z.object({
  id:      z.string().optional(),
  markAll: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'notifications_read', 60, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const notifications = await getSellerNotifications(vendor.id)
    return NextResponse.json({ notifications })
  } catch (err) {
    logger.error('[GET /api/seller/notifications]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'notifications_write', 20, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let patchBody: unknown
    try { patchBody = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchNotificationSchema.safeParse(patchBody)
    if (!parsed.success) return NextResponse.json({ error: 'Provide id or markAll' }, { status: 400 })

    if (parsed.data.markAll) {
      await markAllRead(vendor.id)
    } else if (parsed.data.id) {
      await markNotificationRead(parsed.data.id, vendor.id)
    } else {
      return NextResponse.json({ error: 'Provide id or markAll' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/notifications]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
