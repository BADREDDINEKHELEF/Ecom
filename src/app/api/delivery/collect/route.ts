import { NextRequest, NextResponse } from 'next/server'
import { dispatchGetRate, dispatchTrack } from '@/lib/delivery/dispatch'
import { WILAYA_DATA, ZONE_CONFIG } from '@/lib/data/wilayas'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'

const TRACKING_REGEX = /^[A-Za-z0-9]{6,20}$/

function staticRate(wilaya: string) {
  const zone = WILAYA_DATA[wilaya]?.zone ?? 3
  return { homeDelivery: ZONE_CONFIG[zone].cost, provider: 'static', live: false }
}

async function trackWithTimeout(
  provider: string,
  tracking: string,
  vendorCreds: Record<string, string | undefined> | undefined,
  timeoutMs = 3000
): Promise<{ status: string; detail?: string; provider: string } | null> {
  try {
    const result = await Promise.race([
      dispatchTrack(provider, tracking, vendorCreds),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ])
    return result ? { status: result.status, detail: result.detail, provider } : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'delivery_collect')
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const wilaya    = searchParams.get('wilaya')?.trim()
  const tracking  = searchParams.get('tracking')?.trim()
  const storeSlug = searchParams.get('storeSlug')?.trim()

  if (!wilaya) return NextResponse.json({ error: 'wilaya required' }, { status: 400 })
  if (tracking && !TRACKING_REGEX.test(tracking)) {
    return NextResponse.json({ error: 'Invalid tracking number format' }, { status: 400 })
  }

  let vendorCreds: Record<string, string | undefined> | undefined
  let defaultProvider
  let vendorOnly = false

  if (storeSlug) {
    try {
      const supabase = createAdminClient()
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('store_slug', storeSlug)
        .maybeSingle()

      if (vendor) {
        const config = await getVendorDeliveryConfig(vendor.id)
        if (config) {
          vendorCreds = {
            yalidine_api_id:    config.yalidine_api_id    ?? undefined,
            yalidine_api_token: config.yalidine_api_token ?? undefined,
            procolis_token:     config.procolis_token     ?? undefined,
            zr_token:           config.zr_token           ?? undefined,
            colivraison_token:  config.colivraison_token  ?? undefined,
            maystro_token:      config.maystro_token      ?? undefined,
            rex_token:          config.rex_token          ?? undefined,
            yassir_api_key:     config.yassir_api_key     ?? undefined,
            ecom_api_key:       config.ecom_api_key       ?? undefined,
            ecom_api_token:      config.ecom_api_token      ?? undefined,
            apec_api_id:        config.apec_api_id        ?? undefined,
            apec_api_token:     config.apec_api_token     ?? undefined,
          }
          defaultProvider = config.default_provider ?? undefined
          vendorOnly = true
        }
      }
    } catch {
      // proceed without vendor creds
    }
  }

  const rates: { provider: string; homeDelivery: number; deskDelivery?: number }[] = []

  const promises = DELIVERY_PROVIDERS.map(async (p) => {
    try {
      const rate = await dispatchGetRate(p.id, wilaya, vendorCreds, vendorOnly)
      if (!rate) return null
      const entry: { provider: string; homeDelivery: number; deskDelivery?: number } = {
        provider: rate.provider,
        homeDelivery: rate.homeDelivery,
      }
      if (rate.deskDelivery !== undefined) entry.deskDelivery = rate.deskDelivery
      return entry
    } catch {
      return null
    }
  })

  const results = await Promise.all(promises)
  for (const r of results) {
    if (r) rates.push(r)
  }

  let trackingStatus: { status: string; detail?: string; provider: string } | null = null
  if (tracking) {
    if (defaultProvider) {
      trackingStatus = await trackWithTimeout(defaultProvider, tracking, vendorCreds)
    } else {
      for (const p of DELIVERY_PROVIDERS) {
        const result = await trackWithTimeout(p.id, tracking, vendorCreds)
        if (result) {
          trackingStatus = result
          break
        }
      }
    }
  }

  return NextResponse.json({
    rates,
    staticRate: staticRate(wilaya),
    trackingStatus,
  })
}
