import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateStoreSlug } from '@/lib/validation/slug'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export const dynamic = 'force-dynamic'

// GET /api/seller/check-slug?slug=my-shop
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'check_slug')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')?.trim().toLowerCase() || ''

    const formatCheck = validateStoreSlug(slug)
    if (!formatCheck.ok) {
      return NextResponse.json({ available: false, reason: formatCheck.error })
    }

    const admin = createAdminClient()
    const { data } = await admin
      .from('vendors')
      .select('id')
      .ilike('store_slug', slug)
      .maybeSingle()

    return NextResponse.json({ available: !data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
