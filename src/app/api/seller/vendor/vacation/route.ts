import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, updateVendor } from '@/lib/supabase/vendors'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const Schema = z.object({
  isOnVacation:    z.boolean(),
  vacationMessage: z.string().max(200).optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return new Response('Not a vendor', { status: 403 })

    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { isOnVacation, vacationMessage } = parsed.data

    await updateVendor(vendor.id, {
      is_on_vacation:   isOnVacation,
      vacation_message: vacationMessage,
    })

    logger.info('[vacation-mode] Vendor updated vacation mode', { vendorId: vendor.id, isOnVacation })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update vacation mode'
    logger.error('[PATCH /api/seller/vendor/vacation]', { error: message })
    return new Response(message, { status: 500 })
  }
}