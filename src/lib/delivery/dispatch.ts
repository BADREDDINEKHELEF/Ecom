import { ShipmentInput, ShipmentResult } from './types'
import { DELIVERY_PROVIDERS } from './providers'
import { logger } from '@/lib/logger'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured, yalidineTrack, yalidineListParcels, yalidineGetRateWithCreds } from './yalidine'
import { procolisCreateShipment, procolisCreateShipmentWithToken, procolisConfigured, procolisTrack, procolisListParcels, procolisGetRateWithToken } from './procolis'
import { zrCreateShipment, zrCreateShipmentWithToken, zrConfigured, zrTrack, zrListParcels, zrGetRateWithToken } from './zrexpress'
import { colivraisonCreateShipment, colivraisonCreateShipmentWithToken, colivraisonConfigured, colivraisonTrack, colivraisonListParcels, colivraisonGetRateWithToken } from './colivraison'
import { maystroCreateShipment, maystroCreateShipmentWithToken, maystroConfigured, maystroTrack, maystroListParcels } from './maystro'
import { rexCreateShipment, rexCreateShipmentWithToken, rexConfigured, rexTrack, rexListParcels, rexGetRateWithToken } from './rex'
import { yassirCreateShipment, yassirCreateShipmentWithKey, yassirConfigured, yassirTrack, yassirListParcels } from './yassir'
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
  procolis_key?: string
  zr_token?: string
  zr_key?: string
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
  /** Origin wilaya of the store/vendor — forwarded to providers that require it. */
  from_wilaya?: string
}

export async function dispatchShipment(
  provider: string,
  input: ShipmentInput,
  vendorCreds?: VendorDispatchCreds
): Promise<DispatchResult> {
  try {
    switch (provider) {
      case 'yalidine': {
        const { yalidine_api_id, yalidine_api_token, from_wilaya } = vendorCreds ?? {}
        const yalidineInput = from_wilaya ? { ...input, fromWilaya: from_wilaya } : input
        if (vendorCreds) {
          if (!yalidine_api_id || !yalidine_api_token) {
            return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          }
          const result = await yalidineCreateShipmentWithCreds(yalidineInput, yalidine_api_id, yalidine_api_token)
          return { ...result, provider, requiresManual: false }
        }
        if (!yalidineConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await yalidineCreateShipment(yalidineInput)
        return { ...result, provider, requiresManual: false }
      }

      case 'procolis': {
        const token = vendorCreds?.procolis_token
        const key = vendorCreds?.procolis_key
        if (vendorCreds) {
          if (!token || !key) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await procolisCreateShipmentWithToken(input, token, key)
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
        const key = vendorCreds?.zr_key
        if (vendorCreds) {
          if (!token) return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          const result = await zrCreateShipmentWithToken(input, token, key)
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
        const { apec_api_id, apec_api_token, from_wilaya } = vendorCreds ?? {}
        const apecInput = from_wilaya ? { ...input, fromWilaya: from_wilaya } : input
        if (vendorCreds) {
          if (!apec_api_id || !apec_api_token) {
            return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
          }
          const result = await apecCreateShipmentWithCreds(apecInput, apec_api_id, apec_api_token)
          return { ...result, provider, requiresManual: false }
        }
        if (!apecConfigured()) {
          return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
        }
        const result = await apecCreateShipment(apecInput)
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
  const s = String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[- ]/g, '_')
  const matches = (terms: string[]) => terms.some((t) => s.includes(t))

  if (matches(['delivered', 'livre', 'livraison_effectuee', 'success', 'recouvert']) || s === '4') return 'delivered'
  if (matches(['returned', 'retour', 'retourne', 'return', 'retour_fournisseur', 'annule_x3']) || s === '5' || s === '6') return 'returned'
  if (matches(['out_for_delivery', 'en_livraison', 'en_cours_de_livraison', 'dernier_km', 'sortir_en_livraison']) || s === '3') return 'out_for_delivery'
  if (matches(['in_transit', 'en_transit', 'en_route', 'transit', 'dispatched', 'shipped', 'au_bureau', 'en_traitement', 'dispatcher', 'encours']) || s === '2') return 'in_transit'
  if (matches(['picked_up', 'enleve', 'collected', 'pris_en_charge', 'ramasse', 'recuperer']) || s === '1') return 'picked_up'
  if (matches(['failed', 'echec', 'echoue', 'failed_delivery', 'ne_repond_pas', 'ne_reponde_pas', 'reponde', 'biz', 'perdu'])) return 'failed'
  if (matches(['cancelled', 'annule', 'canceled']) || s === '7') return 'cancelled'
  if (matches(['pending', 'waiting', 'wait_for_pickup', 'created', 'pret_a_expedier', 'en_preparation', 'attend_information', 'appel_tel', 'sms_envoye', 'reporte']) || s === '0') return 'pending'
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

function getParcelStatusAndDetail(data: unknown): TrackResult | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const parcel = Array.isArray(d)
    ? d[0]
    : (Array.isArray(d.data)
      ? d.data[0]
      : (Array.isArray(d.Colis) ? d.Colis[0] : d))
  if (!parcel || typeof parcel !== 'object') return null
  const p = parcel as Record<string, unknown>

  // Ecom exposes both Avancement (high-level state) and Situation (fine-grained).
  // Prefer the terminal Situation when it carries a stronger signal, otherwise Avancement.
  let raw: unknown
  let detail: unknown
  if (p.Avancement !== undefined || p.Situation !== undefined) {
    const avancement = String(p.Avancement ?? '')
    const situation = String(p.Situation ?? '')
    const normalizedSituation = situation.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const terminalKeywords = ['livre', 'annule', 'retour', 'perdu', 'repond']
    const terminalSituation = terminalKeywords.some((k) => normalizedSituation.includes(k))
    raw = terminalSituation ? situation : (avancement || situation)
    detail = [avancement, situation].filter(Boolean).join(' — ') || raw
  } else {
    raw = p.status ?? p.etat ?? p.state ?? p.Statut ?? p.Etat ?? p.StatutColis
    detail = p.status_detail ?? p.detail ?? p.notes ?? raw
  }

  return { status: normalizeProviderStatus(raw), detail: detail ? String(detail) : undefined }
}

export async function dispatchTrack(
  provider: string,
  trackingNumber: string,
  vendorCreds?: {
    yalidine_api_id?: string
    yalidine_api_token?: string
    procolis_token?: string
    procolis_key?: string
    zr_token?: string
    zr_key?: string
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
        return getParcelStatusAndDetail(data)
      }
      case 'procolis': {
        const token = vendorCreds?.procolis_token ?? process.env.PROCOLIS_TOKEN ?? ''
        const key = vendorCreds?.procolis_key ?? process.env.PROCOLIS_KEY ?? ''
        if (!token || !key) return null
        const data = await procolisTrack(trackingNumber, token, key)
        return getParcelStatusAndDetail(data)
      }
      case 'zr': {
        const token = vendorCreds?.zr_token ?? process.env.ZR_TOKEN ?? ''
        const key = vendorCreds?.zr_key ?? process.env.ZR_KEY ?? ''
        if (!token) return null
        const data = await zrTrack(trackingNumber, token, key || undefined)
        return getParcelStatusAndDetail(data)
      }
      case 'colivraison': {
        const token = vendorCreds?.colivraison_token ?? process.env.COLIVRAISON_TOKEN ?? ''
        if (!token) return null
        const data = await colivraisonTrack(trackingNumber, token)
        return getParcelStatusAndDetail(data)
      }
      case 'maystro': {
        const token = vendorCreds?.maystro_token ?? process.env.MAYSTRO_TOKEN ?? ''
        if (!token) return null
        const data = await maystroTrack(trackingNumber, token)
        return getParcelStatusAndDetail(data)
      }
      case 'rex': {
        const token = vendorCreds?.rex_token ?? process.env.REX_TOKEN ?? ''
        if (!token) return null
        const data = await rexTrack(trackingNumber, token)
        return getParcelStatusAndDetail(data)
      }
      case 'yassir': {
        const apiKey = vendorCreds?.yassir_api_key ?? process.env.YASSIR_API_KEY ?? ''
        if (!apiKey) return null
        const data = await yassirTrack(trackingNumber, apiKey)
        return getParcelStatusAndDetail(data)
      }
      case 'ecom': {
        const key = vendorCreds?.ecom_api_key ?? process.env.ECOM_API_KEY ?? ''
        const tk = vendorCreds?.ecom_api_token ?? process.env.ECOM_API_TOKEN ?? ''
        if (!key || !tk) return null
        const data = await ecomTrack(trackingNumber, key, tk)
        return getParcelStatusAndDetail(data)
      }
      case 'apec': {
        const id = vendorCreds?.apec_api_id ?? process.env.APEC_API_ID ?? ''
        const tk = vendorCreds?.apec_api_token ?? process.env.APEC_API_TOKEN ?? ''
        if (!id || !tk) return null
        const data = await apecTrack(trackingNumber, id, tk)
        return getParcelStatusAndDetail(data)
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
    procolis_token?: string; procolis_key?: string
    zr_token?: string; zr_key?: string
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
        const key = vendorCreds?.procolis_key ?? process.env.PROCOLIS_KEY ?? ''
        if (!token || !key) return null
        data = await procolisListParcels(token, key)
        break
      }
      case 'zr': {
        const token = vendorCreds?.zr_token ?? process.env.ZR_TOKEN ?? ''
        const key = vendorCreds?.zr_key ?? process.env.ZR_KEY ?? ''
        if (!token) return null
        data = await zrListParcels(token, key || undefined)
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
  procolis_token?: string | null; procolis_key?: string | null
  zr_token?: string | null; zr_key?: string | null
  colivraison_token?: string | null; maystro_token?: string | null
  rex_token?: string | null; yassir_api_key?: string | null
  ecom_api_key?: string | null; ecom_api_token?: string | null; apec_api_id?: string | null; apec_api_token?: string | null
  /** Vendor/store origin wilaya — required by Yalidine/APEC fee endpoint. */
  from_wilaya?: string | null
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
        const r = await yalidineGetRateWithCreds(wilayaName, id, tk, vendorCreds?.from_wilaya ?? undefined)
        return r ? { ...r, provider } : null
      }
      case 'procolis': {
        const token = tok(vendorCreds?.procolis_token, process.env.PROCOLIS_TOKEN)
        const key = tok(vendorCreds?.procolis_key, process.env.PROCOLIS_KEY)
        if (!token || !key) {
          console.warn(`[dispatchGetRate] procolis: missing token or key`)
          return null
        }
        const r = await procolisGetRateWithToken(wilayaName, token, key)
        return r ? { ...r, provider } : null
      }
      case 'zr': {
        const token = tok(vendorCreds?.zr_token, process.env.ZR_TOKEN)
        const key = tok(vendorCreds?.zr_key, process.env.ZR_KEY)
        if (!token) {
          console.warn(`[dispatchGetRate] zr: missing token`)
          return null
        }
        const r = await zrGetRateWithToken(wilayaName, token, key || undefined)
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
        // Maystro does not expose a public rate endpoint; rely on static pricing.
        return null
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
        const r = await apecGetRateWithCreds(wilayaName, id, tk, vendorCreds?.from_wilaya ?? undefined)
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
