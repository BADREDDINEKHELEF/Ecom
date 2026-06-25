import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, updateVendor } from '@/lib/supabase/vendors'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const Schema = z.object({
  isOnVacation:    z.boolean(),
  vacationMessage: z.string().max(200).optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'vendor_vacation', 20, 60)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createRouteClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserRateLimit(user.id, 'vendor_vacation', 10, 3600)
    if (!userRl.allowed) {
      return NextResponse.json(
        { error: 'Limite atteinte. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
      )
    }

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return NextResponse.json(
        { error: 'Invalid input', ...(details && { details }) },
        { status: 400 }
      )
    }

    const { isOnVacation, vacationMessage } = parsed.data

    await updateVendor(vendor.id, {
      is_on_vacation:   isOnVacation,
      vacation_message: vacationMessage,
    })

    logger.info('[vacation-mode] Vendor updated vacation mode', { vendorId: vendor.id, isOnVacation })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/vendor/vacation]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}