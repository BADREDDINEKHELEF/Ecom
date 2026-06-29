import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { getVendorContext } from '@/lib/auth/vendorAuth'
import { logger } from '@/lib/logger'

const CollectSchema = z.object({
  event:       z.enum(['product_view','add_to_cart','checkout_start','checkout_complete','search','seller_profile_view']),
  session_id:  z.string().max(100).optional(),
  product_id:  z.string().max(100).optional().nullable(),
  vendor_id:   z.string().uuid().optional().nullable(),
  device_type: z.enum(['mobile','tablet','desktop']).optional(),
  metadata:    z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'analytics_collect')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = CollectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  // Optionally resolve authenticated seller's vendor context
  let userId: string | null = null
  let vendorId: string | null = null
  try {
    const supabase = createRouteClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null

    // Resolve vendor context to get the authenticated seller's vendor ID
    const vendorCtx = await getVendorContext(req)
    if (vendorCtx) {
      // If vendor_id was provided in request body, verify ownership or reject
      if (parsed.data.vendor_id && parsed.data.vendor_id !== vendorCtx.vendor.id) {
        logger.warn('[analytics/collect] vendor_id forgery attempt', {
          requestedVendorId: parsed.data.vendor_id,
          authenticatedVendorId: vendorCtx.vendor.id,
          userId,
          ip,
        })
        vendorId = null // Ignore forged vendor_id
      } else {
        vendorId = vendorCtx.vendor.id
      }
    }
  } catch { /* unauthenticated — ok */ }

   const supabase = createAdminClient()
   await supabase.from('analytics_events').insert({
     event:       parsed.data.event,
     user_id:     userId,
     session_id:  parsed.data.session_id ?? null,
     product_id:  parsed.data.product_id ?? null,
     vendor_id:   vendorId,
     device_type: parsed.data.device_type ?? null,
     metadata:    parsed.data.metadata ?? {},
   })
  // Fire-and-forget — always return 200 to caller
  return NextResponse.json({ ok: true })
}
