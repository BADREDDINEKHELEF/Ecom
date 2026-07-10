import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
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
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'notifications_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'settings:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { vendor } } = result

    const notifications = await getSellerNotifications(vendor.id)
    return copyCookies(response, NextResponse.json({ notifications }))
  } catch (err) {
    logger.error('[GET /api/seller/notifications]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'notifications_write', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'settings:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { vendor } } = result

    let patchBody: unknown
    try { patchBody = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchNotificationSchema.safeParse(patchBody)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Provide id or markAll' }, { status: 400 }))

    if (parsed.data.markAll) {
      await markAllRead(vendor.id)
    } else if (parsed.data.id) {
      await markNotificationRead(parsed.data.id, vendor.id)
    } else {
      return copyCookies(response, NextResponse.json({ error: 'Provide id or markAll' }, { status: 400 }))
    }

    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/notifications]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
