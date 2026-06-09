import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId, updateVendor } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const PatchSchema = z.object({
  store_name:      z.string().min(1).max(100).optional(),
  store_slug:      z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  phone:           z.string().max(30).nullable().optional(),
  wilaya:          z.string().max(100).nullable().optional(),
  description:     z.string().max(2000).nullable().optional(),
  logo_url:        z.string().url().nullable().optional(),
  banner_url:      z.string().url().nullable().optional(),
  accent_color:    z.string().max(20).nullable().optional(),
  seo_title:       z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    await updateVendor(vendor.id, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/vendor]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
