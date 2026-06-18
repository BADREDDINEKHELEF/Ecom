import { ShipmentInput, ShipmentResult } from './types'
import { DELIVERY_PROVIDERS } from './providers'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured, yalidineTrack, yalidineListParcels } from './yalidine'
import { procolisCreateShipment, procolisCreateShipmentWithToken, procolisConfigured, procolisTrack, procolisListParcels } from './procolis'
import { zrCreateShipment, zrCreateShipmentWithToken, zrConfigured, zrTrack, zrListParcels } from './zrexpress'
import { colivraisonCreateShipment, colivraisonCreateShipmentWithToken, colivraisonConfigured, colivraisonTrack, colivraisonListParcels } from './colivraison'
import { maystroCreateShipment, maystroCreateShipmentWithToken, maystroConfigured, maystroTrack, maystroListParcels } from './maystro'
import { rexCreateShipment, rexCreateShipmentWithToken, rexConfigured, rexTrack, rexListParcels } from './rex'
import { yassirCreateShipment, yassirCreateShipmentWithKey, yassirConfigured, yassirTrack, yassirListParcels } from './yassir'
import { ecomCreateShipment, ecomCreateShipmentWithToken, ecomConfigured, ecomTrack, ecomListParcels } from './ecom'
import { apecCreateShipment, apecCreateShipmentWithCreds, apecConfigured, apecTrack, apecListParcels } from './apec'

export interface DispatchResult extends ShipmentResult {
  provider: string
  requiresManual: boolean
}

export async function dispatchShipment(
  provider: string,
  input: ShipmentInput,
  vendorCreds?: {
    yalidine_api_id?: string
    yalidine_api_token?: string
    procolis_token?: string
    zr_token?: string
    colivraison_token?: string
    maystro_token?: string
    rex_token?: string
    yassir_api_key?: string
    ecom_token?: string
    apec_api_id?: string
    apec_api_token?: string
  }
): Promise<DispatchResult> {
  switch (provider) {
    case 'yalidine': {
      const { yalidine_api_id, yalidine_api_token } = vendorCreds ?? {}
      if (!yalidineConfigured() && (!yalidine_api_id || !yalidine_api_token)) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = yalidine_api_id && yalidine_api_token
        ? await yalidineCreateShipmentWithCreds(input, yalidine_api_id, yalidine_api_token)
        : await yalidineCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'procolis': {
      const token = vendorCreds?.procolis_token
      if (!procolisConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await procolisCreateShipmentWithToken(input, token)
        : await procolisCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'zr': {
      const token = vendorCreds?.zr_token
      if (!zrConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await zrCreateShipmentWithToken(input, token)
        : await zrCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'colivraison': {
      const token = vendorCreds?.colivraison_token
      if (!colivraisonConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await colivraisonCreateShipmentWithToken(input, token)
        : await colivraisonCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'maystro': {
      const token = vendorCreds?.maystro_token
      if (!maystroConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await maystroCreateShipmentWithToken(input, token)
        : await maystroCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'rex': {
      const token = vendorCreds?.rex_token
      if (!rexConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await rexCreateShipmentWithToken(input, token)
        : await rexCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'yassir': {
      const apiKey = vendorCreds?.yassir_api_key
      if (!yassirConfigured() && !apiKey) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = apiKey
        ? await yassirCreateShipmentWithKey(input, apiKey)
        : await yassirCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'ecom': {
      const token = vendorCreds?.ecom_token
      if (!ecomConfigured() && !token) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = token
        ? await ecomCreateShipmentWithToken(input, token)
        : await ecomCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    case 'apec': {
      const { apec_api_id, apec_api_token } = vendorCreds ?? {}
      if (!apecConfigured() && (!apec_api_id || !apec_api_token)) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      const result = apec_api_id && apec_api_token
        ? await apecCreateShipmentWithCreds(input, apec_api_id, apec_api_token)
        : await apecCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    default:
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
  if (['cancelled', 'annulé', 'annule', 'canceled'].includes(s)) return 'cancelled'
  if (['pending', 'waiting', 'wait_for_pickup', 'created', '0'].includes(s)) return 'pending'
  // Unknown status — log so new provider status codes can be added above
  console.warn(`[normalizeProviderStatus] unrecognized status: "${raw}" — treating as in_transit`)
  return 'in_transit'
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
    ecom_token?: string
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
        const token = vendorCreds?.ecom_token ?? process.env.ECOM_TOKEN ?? ''
        if (!token) return null
        const data = await ecomTrack(trackingNumber, token)
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
  } catch {
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
    ecom_token?: string; apec_api_id?: string; apec_api_token?: string
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
        const token = vendorCreds?.ecom_token ?? process.env.ECOM_TOKEN ?? ''
        if (!token) return null
        data = await ecomListParcels(token)
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
  } catch {
    return null
  }
}

export function getTrackingUrl(provider: string, trackingNumber: string): string {
  const p = DELIVERY_PROVIDERS.find((d) => d.id === provider)
  if (!p?.trackingUrl) return '#'
  return `${p.trackingUrl}${trackingNumber}`
}
