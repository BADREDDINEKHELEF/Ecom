import { ShipmentInput, ShipmentResult } from './types'
import { deliveryFetch } from './client'
import { extractRates, isValidWilaya, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { logger } from '@/lib/logger'

/**
 * Ecom Delivery API.
 * Docs provided by Ecom:
 *   POST   /Api_v1/Colis           — create one or more parcels
 *   PUT    /Api_v1/Colis/{Tracking} — update a single parcel while still "En Préparation"
 *   PUT    /Api_v1/aExpédier        — mark parcels as ready to ship
 *   PUT    /Api_v1/Supprimer        — delete parcels
 *   Headers: Key, Token
 */
const BASE_URL = 'https://ecom-dz.net/Api_v1'

// Ecom-specific static delivery fees when the live rate endpoint is unavailable.
// Populated from seller feedback / Ecom rate cards.
const ECOM_STATIC_RATES: Record<string, { homeDelivery: number; deskDelivery: number }> = {
  'Biskra': { homeDelivery: 800, deskDelivery: 500 },
}

function authHeaders(key: string, token: string): Record<string, string> {
  return { 'Key': key, 'Token': token, 'Accept': 'application/json' }
}

function buildBody(data: unknown): string {
  return JSON.stringify(data)
}

export function ecomConfigured(): boolean {
  return !!process.env.ECOM_API_KEY && !!process.env.ECOM_API_TOKEN
}

function parseError(_res: Response, data: unknown): string {
  const d = data as Record<string, unknown> | null
  return String(d?.message ?? d?.error ?? d?.Message ?? JSON.stringify(data))
}

export async function ecomCreateShipmentWithToken(
  input: ShipmentInput,
  key: string,
  token: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaNameToId(input.wilaya)
  if (wilayaId == null) throw new Error(`Ecom: unknown wilaya "${input.wilaya}"`)

  const parcel: Record<string, unknown> = {
    Echange: input.isExchange ? 1 : 0,
    Stopdesk: input.isStopDesk ? 1 : 0,
    CodeStopdesk: input.isStopDesk ? (input.stopDeskId ?? '') : '',
    NomComplet: input.fullName,
    Mobile_1: toLocalAlgerianPhone(input.phone),
    Mobile_2: input.phoneSecondary ? toLocalAlgerianPhone(input.phoneSecondary) : '',
    Adresse: input.address,
    Wilaya: String(wilayaId),
    Commune: input.city,
    Article: input.items || 'Colis',
    Ref_Article: input.externalReference ?? input.orderId ?? '',
    NoteFournisseur: input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : '',
    Total: String(input.total),
    ID_Externe: input.orderId ?? '',
    Source: 'ShopDZ',
  }

  const res = await deliveryFetch(`${BASE_URL}/Colis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(key, token),
    },
    body: buildBody({ Colis: [parcel] }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = parseError(res, await res.json())
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Ecom Delivery ${res.status}: ${detail || res.statusText}`)
  }

  const data = await res.json()
  const created = Array.isArray(data?.Colis) ? data.Colis[0] : null
  const tracking = String(
    created?.Tracking ?? created?.tracking ?? created?.tracking_code ??
    data?.tracking ?? data?.tracking_code ?? ''
  )
  const labelUrl: string | undefined = created?.label ?? data?.label ?? undefined

  return { tracking, labelUrl }
}

export async function ecomCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!ecomConfigured()) throw new Error('Ecom Delivery API key/token not configured')
  return ecomCreateShipmentWithToken(input, process.env.ECOM_API_KEY!, process.env.ECOM_API_TOKEN!)
}

/**
 * Update an Ecom parcel while it is still in "En Préparation".
 * Endpoint: PUT /Api_v1/Colis/{Tracking}
 */
export async function ecomUpdateShipmentWithToken(
  tracking: string,
  updates: Partial<Pick<ShipmentInput, 'fullName' | 'phone' | 'phoneSecondary' | 'address' | 'city' | 'items' | 'total' | 'orderId'>>,
  key: string,
  token: string
): Promise<void> {
  const body: Record<string, unknown> = {
    NomComplet: updates.fullName,
    Mobile_1: updates.phone ? toLocalAlgerianPhone(updates.phone) : undefined,
    Mobile_2: updates.phoneSecondary ? toLocalAlgerianPhone(updates.phoneSecondary) : undefined,
    Adresse: updates.address,
    Commune: updates.city,
    Article: updates.items,
    Ref_Article: updates.orderId ?? '',
    NoteFournisseur: '',
    Total: updates.total !== undefined ? String(updates.total) : undefined,
    ID_Externe: updates.orderId ?? '',
    Source: 'ShopDZ',
  }

  // Remove undefined fields to avoid overwriting existing data with nulls.
  Object.keys(body).forEach((k) => {
    if (body[k] === undefined) delete body[k]
  })

  const res = await deliveryFetch(`${BASE_URL}/Colis/${encodeURIComponent(tracking)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(key, token),
    },
    body: buildBody({ Colis: body }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = parseError(res, await res.json())
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Ecom update ${res.status}: ${detail || res.statusText}`)
  }
}

/**
 * Mark Ecom parcels as ready to ship ("En Préparation" → "En Traitement").
 * Endpoint: PUT /Api_v1/aExpédier
 */
export async function ecomReadyToShip(trackingNumbers: string[], key: string, token: string): Promise<void> {
  const res = await deliveryFetch(`${BASE_URL}/aExpédier`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(key, token),
    },
    body: buildBody({ Colis: trackingNumbers.map((t) => ({ Tracking: t })) }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = parseError(res, await res.json())
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Ecom ready-to-ship ${res.status}: ${detail || res.statusText}`)
  }
}

/**
 * Delete Ecom parcels.
 * Endpoint: PUT /Api_v1/Supprimer
 */
export async function ecomDeleteParcels(trackingNumbers: string[], key: string, token: string): Promise<void> {
  const res = await deliveryFetch(`${BASE_URL}/Supprimer`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(key, token),
    },
    body: buildBody({ Colis: trackingNumbers.map((t) => ({ Tracking: t })) }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = parseError(res, await res.json())
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Ecom delete ${res.status}: ${detail || res.statusText}`)
  }
}

export async function ecomTestConnection(key: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/Test`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn(`[ecomTestConnection] failed: status=${res.status} body=${body}`)
      return null
    }
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomTestConnection]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function ecomListParcels(key: string, token: string, page = 1) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/Colis`, {
      headers: {
        ...authHeaders(key, token),
        'Page': String(page),
      },
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomListParcels]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function ecomTrackList(trackingNumbers: string[], key: string, token: string) {
  try {
    // Docs specify /API_v1 (uppercase) for this endpoint.
    const res = await deliveryFetch(`${BASE_URL.replace('/Api_v1', '/API_v1')}/Colis/Liste`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(key, token),
      },
      body: buildBody({ Colis: trackingNumbers.map((t) => ({ Tracking: t })) }),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomTrackList]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function ecomHistoryByDate(date: string, key: string, token: string, page = 1) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/Historique/${encodeURIComponent(date)}`, {
      headers: {
        ...authHeaders(key, token),
        'Page': String(page),
      },
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomHistoryByDate]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function ecomHistoryByTracking(trackingNumber: string, key: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/Historique/Tracking/${encodeURIComponent(trackingNumber)}`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomHistoryByTracking]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function ecomGetRateWithToken(
  wilayaName: string,
  key: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null

  const tryFetch = async (wilayaParam: string): Promise<{ homeDelivery: number; deskDelivery?: number } | null> => {
    const url = `${BASE_URL}/delivery-fees?wilaya=${encodeURIComponent(wilayaParam)}`
    const res = await deliveryFetch(url, {
      headers: authHeaders(key, token),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn(`[ecomGetRateWithToken] failed for wilaya=${wilayaParam}: status=${res.status} body=${body}`)
      return null
    }

    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  }

  try {
    // Most carriers accept the wilaya name; try the numeric ID as a fallback.
    const byName = await tryFetch(wilayaName)
    if (byName) return byName

    const wilayaId = wilayaNameToId(wilayaName)
    if (wilayaId != null) {
      const byId = await tryFetch(String(wilayaId))
      if (byId) return byId
    }

    // If the live endpoint is not implemented, fall back to the provider-specific
    // static rate table so the seller quote matches Ecom's actual pricing.
    const staticRate = ECOM_STATIC_RATES[wilayaName]
    if (staticRate != null) {
      logger.info(`[ecomGetRateWithToken] using static rate for ${wilayaName}: home=${staticRate.homeDelivery} desk=${staticRate.deskDelivery}`)
      return staticRate
    }
    return null
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[ecomGetRateWithToken] error for wilaya=${wilayaName}:`, { error: msg })
    return null
  }
}

export async function ecomTrack(trackingNumber: string, key: string, token: string) {
  try {
    // Docs specify /API_v1 (uppercase) for this endpoint.
    const res = await deliveryFetch(`${BASE_URL.replace('/Api_v1', '/API_v1')}/Colis/Tracking/${encodeURIComponent(trackingNumber)}`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomTrack]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/** Fetch all communes (or communes for a single wilaya). */
export async function ecomGetCommunes(key: string, token: string, wilayaId?: number) {
  try {
    const suffix = wilayaId != null ? `/${wilayaId}` : ''
    const res = await deliveryFetch(`${BASE_URL}/Commune${suffix}`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomGetCommunes]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/** Fetch all Ecom stop desks. */
export async function ecomGetStopdesks(key: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/Stopdesk`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomGetStopdesks]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

/** Fetch Ecom stop desks for a specific wilaya. */
export async function ecomGetStopdesksByWilaya(wilayaName: string, key: string, token: string) {
  const wilayaId = wilayaNameToId(wilayaName)
  if (wilayaId == null) {
    logger.warn(`[ecomGetStopdesksByWilaya] unknown wilaya "${wilayaName}"`)
    return null
  }
  try {
    const res = await deliveryFetch(`${BASE_URL}/Stopdesk/${wilayaId}`, {
      headers: authHeaders(key, token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[ecomGetStopdesksByWilaya]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
