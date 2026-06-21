import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const Schema = z.object({
  is_on_vacation:   z.boolean(),
  vacation_message: z.string().max(200).optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'vacation', 20, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserRateLimit(user.id, 'vacation', 5, 3600)
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('vendors')
      .update({
        is_on_vacation:   parsed.data.is_on_vacation,
        vacation_message: parsed.data.vacation_message ?? null,
      })
      .eq('id', vendor.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/vendor/vacation]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
