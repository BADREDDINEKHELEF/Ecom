import { ShipmentInput, ShipmentResult } from './types'
import { DELIVERY_PROVIDERS } from './providers'
import { logger } from '@/lib/logger'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured, yalidineTrack, yalidineListParcels, yalidineGetRateWithCreds } from './yalidine'
import { procolisCreateShipment, procolisCreateShipmentWithToken, procolisConfigured, procolisTrack, procolisListParcels, procolisGetRateWithToken } from './procolis'
import { zrCreateShipment, zrCreateShipmentWithToken, zrConfigured, zrTrack, zrListParcels, zrGetRateWithToken } from './zrexpress'
import { colivraisonCreateShipment, colivraisonCreateShipmentWithToken, colivraisonConfigured, colivraisonTrack, colivraisonListParcels, colivraisonGetRateWithToken } from './colivraison'
import { maystroCreateShipment, maystroCreateShipmentWithToken, maystroConfigured, maystroTrack, maystroListParcels, maystroGetRateWithToken } from './maystro'
import { rexCreateShipment, rexCreateShipmentWithToken, rexConfigured, rexTrack, rexListParcels, rexGetRateWithToken } from './rex'
import { yassirCreateShipment, yassirCreateShipmentWithKey, yassirConfigured, yassirTrack, yassirListParcels, YassirSenderInfo } from './yassir'
import { ecomCreateShipment, ecomCreateShipmentWithToken, ecomConfigured, ecomTrack, ecomListParcels } from './ecom'
import { apecCreateShipment, apecCreateShipmentWithCreds, apecConfigured, apecTrack, apecListParcels, apecGetRateWithCreds } from './apec'

export interface DispatchResult extends ShipmentResult {
  provider: string
  requiresManual: boolean
}

type VendorDispatchCreds = {
  yalidine_api_id?: string
  yalidine_api_token?: string
  procolis_token?: string
  zr_token?: string
  colivraison_token?: string
  maystro_token?: string
  rex_token?: string
  yassir_api_key?: string
  yassir_sender_name?: string
  yassir_sender_phone?: string
  yassir_sender_address?: string
  ecom_api_key?: string
  ecom_api_token?: string
  apec_api_id?: string
  apec_api_token?: string
}

export async function dispatchShipment(
  provider: string,
  input: ShipmentInput,
  vendorCreds?: VendorDispatchCreds
): Promise<DispatchResult> {
  try {
    switch (provider) {
      case 'yalidine': {
        const { yalidine_api_id, yalidine_api_token } = vendorCreds ?? {}
        if (vendorCreds) {
          if (!yalidine_api_id || !yalidine_api_token) {
            return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          }
          const result = await yalidineCreateShipmentWithCreds(input, yalidine_api_id, yalidine_api_token)
          return { ...result, provider, requiresManual: false }
        }
        if (!yalidineConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await yalidineCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'procolis': {
        const token = vendorCreds?.procolis_token
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await procolisCreateShipmentWithToken(input, token)
          return { ...result, provider, requiresManual: false }
        }
        if (!procolisConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await procolisCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'zr': {
        const token = vendorCreds?.zr_token
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await zrCreateShipmentWithToken(input, token)
          return { ...result, provider, requiresManual: false }
        }
        if (!zrConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await zrCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'colivraison': {
        const token = vendorCreds?.colivraison_token
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await colivraisonCreateShipmentWithToken(input, token)
          return { ...result, provider, requiresManual: false }
        }
        if (!colivraisonConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await colivraisonCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'maystro': {
        const token = vendorCreds?.maystro_token
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await maystroCreateShipmentWithToken(input, token)
          return { ...result, provider, requiresManual: false }
        }
        if (!maystroConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await maystroCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'rex': {
        const token = vendorCreds?.rex_token
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await rexCreateShipmentWithToken(input, token)
          return { ...result, provider, requiresManual: false }
        }
        if (!rexConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await rexCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'yassir': {
        const apiKey = vendorCreds?.yassir_api_key
        if (vendorCreds) {
          if (!apiKey) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await yassirCreateShipmentWithKey(input, apiKey)
          return { ...result, provider, requiresManual: false }
        }
        if (!yassirConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await yassirCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'ecom': {
        const key = vendorCreds?.ecom_api_key
        const tk = vendorCreds?.ecom_api_token
        if (vendorCreds) {
          if (!key || !tk) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await ecomCreateShipmentWithToken(input, key, tk)
          return { ...result, provider, requiresManual: false }
        }
        if (!ecomConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await ecomCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      case 'apec': {
        const { apec_api_id, apec_api_token } = vendorCreds ?? {}
        if (vendorCreds) {
          if (!apec_api_id || !apec_api_token) {
            return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          }
          const result = await apecCreateShipmentWithCreds(input, apec_api_id, apec_api_token)
          return { ...result, provider, requiresManual: false }
        }
        if (!apecConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await apecCreateShipment(input)
        return { ...result, provider, requiresManual: false }
      }

      default:
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
    }
  } catch (err) {
    logger.error(`[dispatchShipment] provider="${provider}" threw — marking as requiresManual`, {
      orderId: input.orderId,
      error: err instanceof Error ? err.message : String(err),
    })
    return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
  }
}

// Maps raw provider status strings/codes → our internal status enum
export function normalizeProviderStatus(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().replace(/[- ]/g, '_')
  if (['delivered', 'livré', 'livre', 'livraison_effectuee', 'success', '4'].includes(s)) return 'delivered'
  if (['returned', 'retour', 'retourné', 'retourne', 'return', '5', '6'].includes(s)) return 'returned'
  if (['out_for_delivery', 'en_livraison', 'en_cours_de_livraison', 'dernier_km', '3'].includes(s)) return 'out_for_delivery'
  if (['in_transit', 'en_transit', 'en_route', 'transit', 'dispatched', 'shipped', '2'].includes(s)) return 'in_transit'
  if (['picked_up', 'enlevé', 'enleve', 'collected', 'pris_en_charge', 'ramassé', 'ramasse', '1'].includes(s)) return 'picked_up'
  if (['failed', 'echec', 'échoué', 'failed_delivery'].includes(s)) return 'failed'
  if (['cancelled', 'annulé', 'annule', 'canceled', '7'].includes(s)) return 'cancelled'
  if (['pending', 'waiting', 'wait_for_pickup', 'created', '0'].includes(s)) return 'pending'
  // Unknown status — log so new provider status codes can be added above.
  // Return 'unknown' rather than 'in_transit' so the cron does not poll indefinitely
  // for shipments whose terminal state it cannot classify.
  logger.warn(`[normalizeProviderStatus] unrecognized status: "${raw}" — returning 'unknown'`)
  return 'unknown'
}

export interface TrackResult {
  status: string
  detail?: string
}

export async function dispatchTrack(
  provider: string,
  trackingNumber: string,
  vendorCreds?: {
    yalidine_api_id?: string
    yalidine_api_token?: string
    procolis_token?: string
    zr_token?: string
    colivraison_token?: string
    maystro_token?: string
    rex_token?: string
    yassir_api_key?: string
    ecom_api_key?: string
    ecom_api_token?: string
    apec_api_id?: string
    apec_api_token?: string
  }
): Promise<TrackResult | null> {
  try {
    switch (provider) {
      case 'yalidine': {
        const id = vendorCreds?.yalidine_api_id ?? process.env.YALIDINE_API_ID ?? ''
        const tk = vendorCreds?.yalidine_api_token ?? process.env.YALIDINE_API_TOKEN ?? ''
        if (!id || !tk) return null
        const data = await yalidineTrack(trackingNumber, id, tk)
        if (!data) return null
        const raw = data.status ?? data.etat ?? data.state
        return { status: normalizeProviderStatus(raw), detail: data.status_detail ?? undefined }
      }
      case 'procolis': {
        const token = vendorCreds?.procolis_token ?? process.env.PROCOLIS_TOKEN ?? ''
        if (!token) return null
        const data = await procolisTrack(trackingNumber, token)
        if (!data) return null
        const parcel = Array.isArray(data?.Colis) ? data.Colis[0] : data
        const raw = parcel?.Statut ?? parcel?.status ?? parcel?.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'zr': {
        const token = vendorCreds?.zr_token ?? process.env.ZR_TOKEN ?? ''
        if (!token) return null
        const data = await zrTrack(trackingNumber, token)
        if (!data) return null
        const raw = data.Etat ?? data.status ?? data.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'colivraison': {
        const token = vendorCreds?.colivraison_token ?? process.env.COLIVRAISON_TOKEN ?? ''
        if (!token) return null
        const data = await colivraisonTrack(trackingNumber, token)
        if (!data) return null
        const raw = data.status ?? data.etat ?? data.state
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'maystro': {
        const token = vendorCreds?.maystro_token ?? process.env.MAYSTRO_TOKEN ?? ''
        if (!token) return null
        const data = await maystroTrack(trackingNumber, token)
        if (!data) return null
        const raw = data.status ?? data.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'rex': {
        const token = vendorCreds?.rex_token ?? process.env.REX_TOKEN ?? ''
        if (!token) return null
        const data = await rexTrack(trackingNumber, token)
        if (!data) return null
        const raw = data.status ?? data.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'yassir': {
        const apiKey = vendorCreds?.yassir_api_key ?? process.env.YASSIR_API_KEY ?? ''
        if (!apiKey) return null
        const data = await yassirTrack(trackingNumber, apiKey)
        if (!data) return null
        const raw = data.status ?? data.state
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'ecom': {
        const key = vendorCreds?.ecom_api_key ?? process.env.ECOM_API_KEY ?? ''
        const tk = vendorCreds?.ecom_api_token ?? process.env.ECOM_API_TOKEN ?? ''
        if (!key || !tk) return null
        const data = await ecomTrack(trackingNumber, key, tk)
        if (!data) return null
        const raw = data.status ?? data.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      case 'apec': {
        const id = vendorCreds?.apec_api_id ?? process.env.APEC_API_ID ?? ''
        const tk = vendorCreds?.apec_api_token ?? process.env.APEC_API_TOKEN ?? ''
        if (!id || !tk) return null
        const data = await apecTrack(trackingNumber, id, tk)
        if (!data) return null
        const raw = data.status ?? data.etat
        return { status: normalizeProviderStatus(raw), detail: String(raw ?? '') }
      }
      default:
        return null
    }
  } catch (err) {
    logger.warn('[dispatchTrack]', { provider, tracking: trackingNumber, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export interface ProviderStats {
  total: number
  delivered: number
  returned: number
  inTransit: number
  pending: number
  deliveryRate: number
  returnRate: number
}

function countStatuses(parcels: unknown[]): ProviderStats {
  const counts = { total: 0, delivered: 0, returned: 0, inTransit: 0, pending: 0 }
  for (const p of parcels) {
    const raw = (p as Record<string, unknown>)?.status
      ?? (p as Record<string, unknown>)?.etat
      ?? (p as Record<string, unknown>)?.Statut
      ?? (p as Record<string, unknown>)?.Etat
      ?? (p as Record<string, unknown>)?.state
    const normalized = normalizeProviderStatus(raw)
    counts.total++
    if (normalized === 'delivered') counts.delivered++
    else if (normalized === 'returned') counts.returned++
    else if (['in_transit', 'picked_up', 'out_for_delivery'].includes(normalized)) counts.inTransit++
    else counts.pending++
  }
  const finished = counts.delivered + counts.returned
  return {
    ...counts,
    deliveryRate: finished > 0 ? Math.round((counts.delivered / finished) * 100) : 0,
    returnRate:   finished > 0 ? Math.round((counts.returned  / finished) * 100) : 0,
  }
}

function extractParcelArray(data: unknown): unknown[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  const d = data as Record<string, unknown>
  for (const key of ['data', 'results', 'parcels', 'orders', 'Colis', 'deliveries', 'items', 'colis']) {
    if (Array.isArray(d[key])) return d[key] as unknown[]
  }
  return []
}

export async function dispatchGetStats(
  provider: string,
  vendorCreds?: {
    yalidine_api_id?: string; yalidine_api_token?: string
    procolis_token?: string; zr_token?: string
    colivraison_token?: string; maystro_token?: string
    rex_token?: string; yassir_api_key?: string
    ecom_api_key?: string; ecom_api_token?: string; apec_api_id?: string; apec_api_token?: string
  }
): Promise<ProviderStats | null> {
  try {
    let data: unknown = null
    switch (provider) {
      case 'yalidine': {
        const id = vendorCreds?.yalidine_api_id ?? process.env.YALIDINE_API_ID ?? ''
        const tk = vendorCreds?.yalidine_api_token ?? process.env.YALIDINE_API_TOKEN ?? ''
        if (!id || !tk) return null
        data = await yalidineListParcels(id, tk)
        break
      }
      case 'procolis': {
        const token = vendorCreds?.procolis_token ?? process.env.PROCOLIS_TOKEN ?? ''
        if (!token) return null
        data = await procolisListParcels(token)
        break
      }
      case 'zr': {
        const token = vendorCreds?.zr_token ?? process.env.ZR_TOKEN ?? ''
        if (!token) return null
        data = await zrListParcels(token)
        break
      }
      case 'colivraison': {
        const token = vendorCreds?.colivraison_token ?? process.env.COLIVRAISON_TOKEN ?? ''
        if (!token) return null
        data = await colivraisonListParcels(token)
        break
      }
      case 'maystro': {
        const token = vendorCreds?.maystro_token ?? process.env.MAYSTRO_TOKEN ?? ''
        if (!token) return null
        data = await maystroListParcels(token)
        break
      }
      case 'rex': {
        const token = vendorCreds?.rex_token ?? process.env.REX_TOKEN ?? ''
        if (!token) return null
        data = await rexListParcels(token)
        break
      }
      case 'yassir': {
        const apiKey = vendorCreds?.yassir_api_key ?? process.env.YASSIR_API_KEY ?? ''
        if (!apiKey) return null
        data = await yassirListParcels(apiKey)
        break
      }
      case 'ecom': {
        const key = vendorCreds?.ecom_api_key ?? process.env.ECOM_API_KEY ?? ''
        const tk = vendorCreds?.ecom_api_token ?? process.env.ECOM_API_TOKEN ?? ''
        if (!key || !tk) return null
        data = await ecomListParcels(key, tk)
        break
      }
      case 'apec': {
        const id = vendorCreds?.apec_api_id ?? process.env.APEC_API_ID ?? ''
        const tk = vendorCreds?.apec_api_token ?? process.env.APEC_API_TOKEN ?? ''
        if (!id || !tk) return null
        data = await apecListParcels(id, tk)
        break
      }
      default:
        return null
    }
    const parcels = extractParcelArray(data)
    if (parcels.length === 0) return null
    return countStatuses(parcels)
  } catch (err) {
    logger.warn('[dispatchGetStats]', { provider, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export interface RateResult {
  homeDelivery: number
  deskDelivery?: number
  provider: string
}

type VendorCreds = {
  yalidine_api_id?: string | null; yalidine_api_token?: string | null
  procolis_token?: string | null; zr_token?: string | null
  colivraison_token?: string | null; maystro_token?: string | null
  rex_token?: string | null; yassir_api_key?: string | null
  ecom_api_key?: string | null; ecom_api_token?: string | null; apec_api_id?: string | null; apec_api_token?: string | null
}

// vendorOnly=true prevents null vendor tokens from falling through to platform env vars.
// Always pass vendorOnly=true when called from a vendor-scoped public endpoint.
export async function dispatchGetRate(
  provider: string,
  wilayaName: string,
  vendorCreds?: VendorCreds,
  vendorOnly = false
): Promise<RateResult | null> {
  // Helper: resolve a token using vendor creds. When vendorOnly=true, a null vendor
  // credential returns '' (no token) rather than falling back to the platform env var,
  // so vendor stores can't accidentally bill the platform's delivery account.
  const tok = (vendorVal: string | null | undefined, envVal: string | undefined) =>
    vendorOnly
      ? (vendorVal != null ? vendorVal : '')
      : (vendorVal ?? envVal ?? '')

  try {
    switch (provider) {
      case 'yalidine': {
        const id = tok(vendorCreds?.yalidine_api_id, process.env.YALIDINE_API_ID)
        const tk = tok(vendorCreds?.yalidine_api_token, process.env.YALIDINE_API_TOKEN)
        if (!id || !tk) {
          console.warn(`[dispatchGetRate] yalidine: missing credentials (id=${!!id}, tk=${!!tk})`)
          return null
        }
        const r = await yalidineGetRateWithCreds(wilayaName, id, tk)
        return r ? { ...r, provider } : null
      }
      case 'procolis': {
        const token = tok(vendorCreds?.procolis_token, process.env.PROCOLIS_TOKEN)
        if (!token) {
          console.warn(`[dispatchGetRate] procolis: missing token`)
          return null
        }
        const r = await procolisGetRateWithToken(wilayaName, token)
        return r ? { ...r, provider } : null
      }
      case 'zr': {
        const token = tok(vendorCreds?.zr_token, process.env.ZR_TOKEN)
        if (!token) {
          console.warn(`[dispatchGetRate] zr: missing token`)
          return null
        }
        const r = await zrGetRateWithToken(wilayaName, token)
        return r ? { ...r, provider } : null
      }
      case 'colivraison': {
        const token = tok(vendorCreds?.colivraison_token, process.env.COLIVRAISON_TOKEN)
        if (!token) {
          console.warn(`[dispatchGetRate] colivraison: missing token`)
          return null
        }
        const r = await colivraisonGetRateWithToken(wilayaName, token)
        return r ? { ...r, provider } : null
      }
      case 'maystro': {
        const token = tok(vendorCreds?.maystro_token, process.env.MAYSTRO_TOKEN)
        if (!token) {
          console.warn(`[dispatchGetRate] maystro: missing token`)
          return null
        }
        const r = await maystroGetRateWithToken(wilayaName, token)
        return r ? { ...r, provider } : null
      }
      case 'rex': {
        const token = tok(vendorCreds?.rex_token, process.env.REX_TOKEN)
        if (!token) {
          console.warn(`[dispatchGetRate] rex: missing token`)
          return null
        }
        const r = await rexGetRateWithToken(wilayaName, token)
        return r ? { ...r, provider } : null
      }
      case 'apec': {
        const id = tok(vendorCreds?.apec_api_id, process.env.APEC_API_ID)
        const tk = tok(vendorCreds?.apec_api_token, process.env.APEC_API_TOKEN)
        if (!id || !tk) {
          console.warn(`[dispatchGetRate] apec: missing credentials (id=${!!id}, tk=${!!tk})`)
          return null
        }
        const r = await apecGetRateWithCreds(wilayaName, id, tk)
        return r ? { ...r, provider } : null
      }
      case 'ecom': {
        // Ecom-DZ does not expose a live rate endpoint — uses static pricing
        return null
      }
      // yassir: no rate endpoint — fall back to static
      default:
        return null
    }
  } catch (err) {
    logger.warn('[dispatchGetRate]', { provider, wilaya: wilayaName, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export function getTrackingUrl(provider: string, trackingNumber: string): string {
  const p = DELIVERY_PROVIDERS.find((d) => d.id === provider)
  if (!p?.trackingUrl) return '#'
  return `${p.trackingUrl}${trackingNumber}`
}
