import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { dispatchGetRate } from '@/lib/delivery/dispatch'
import { WILAYA_DATA, ZONE_CONFIG } from '@/lib/data/wilayas'
import { logger } from '@/lib/logger'

function staticRate(wilaya: string): { homeDelivery: number; deskDelivery: number; provider: string; live: boolean } {
  const zone = WILAYA_DATA[wilaya]?.zone ?? 3
  const home = ZONE_CONFIG[zone].cost
  const desk = Math.max(150, home - 200)
  return { homeDelivery: home, deskDelivery: desk, provider: 'static', live: false }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'delivery_rates')
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const storeSlug = searchParams.get('storeSlug')?.trim()
  const vendorId  = searchParams.get('vendorId')?.trim()
  const wilaya    = searchParams.get('wilaya')?.trim()

  if (!wilaya) return NextResponse.json({ error: 'wilaya required' }, { status: 400 })

  // No storeSlug or vendorId → return static zone pricing immediately
  if (!storeSlug && !vendorId) {
    return NextResponse.json(staticRate(wilaya))
  }

  try {
    const supabase = createAdminClient()

    let vendor = null
    if (storeSlug) {
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('store_slug', storeSlug)
        .maybeSingle()
      vendor = data
    } else if (vendorId) {
      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('id', vendorId)
        .maybeSingle()
      vendor = data
    }

    if (!vendor) return NextResponse.json(staticRate(wilaya))

    const config = await getVendorDeliveryConfig(vendor.id)
    if (!config) return NextResponse.json(staticRate(wilaya))

    const provider = config.default_provider ?? 'yalidine'
    const isLiveProvider = provider !== 'manual' && provider !== 'yassir'

    try {
      const rate = await dispatchGetRate(provider, wilaya, config, false)

      if (!rate) {
        if (isLiveProvider) {
          logger.warn(`[delivery/rates] ${provider} returned no rate, falling back to static pricing`, { wilaya, provider })
        }
        return NextResponse.json(staticRate(wilaya))
      }

      return NextResponse.json({ homeDelivery: rate.homeDelivery, deskDelivery: rate.deskDelivery, provider, live: true })
    } catch (err) {
      logger.warn(`[delivery/rates] ${provider} threw, falling back to static pricing`, { wilaya, provider, error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json(staticRate(wilaya))
    }
  } catch (err) {
    logger.error('[delivery/rates] unexpected error, falling back to static pricing', { wilaya, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json(staticRate(wilaya))
  }
}
