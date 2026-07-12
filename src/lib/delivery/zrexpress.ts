import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

const BASE_URL = 'https://www.zrexpress.dz/api'

function wilayaToZrId(name: string): number {
  const id = wilayaNameToId(name)
  if (id == null) throw new Error(`ZR Express: unknown wilaya "${name}"`)
  return id
}

function wilayaToZrIdOrNull(name: string): number | null {
  return wilayaNameToId(name)
}

function authHeaders(token: string, key?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) {
    // ZR classic / Procolis-v1-compatible auth
    headers.token = token
    headers.key = key
  } else {
    // Legacy ZR auth (kept for backward compatibility)
    headers.Authorization = `Token ${token}`
  }
  return headers
}

export function zrConfigured(): boolean {
  // ZR classic requires token+key per DZBuild docs; legacy token-only is accepted as fallback.
  return !!process.env.ZR_TOKEN
}

export async function zrCreateShipmentWithToken(
  input: ShipmentInput,
  token: string,
  key?: string
): Promise<ShipmentResult> {
  const parcel = {
    Tracking: input.externalReference ?? '',
    TypeLivraison: input.isStopDesk ? 1 : 0,
    TypeColis: input.isExchange ? 1 : 0,
    Confrimee: 1,
    Client: input.fullName,
    MobileA: toLocalAlgerianPhone(input.phone),
    MobileB: input.phoneSecondary ? toLocalAlgerianPhone(input.phoneSecondary) : '',
    Adresse: input.address,
    IDWilaya: wilayaToZrId(input.wilaya),
    Commune: input.city,
    Total: input.total,
    Note: input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : (input.items || ''),
    TProduit: input.items || 'Colis',
    id_Externe: input.orderId ?? '',
    Source: 'ShopDZ',
  }

  // Procolis-v1-compatible ZR expects { Colis: [parcel] }; legacy ZR accepts the flat object.
  const body = key ? { Colis: [parcel] } : parcel

  const res = await deliveryFetch(`${BASE_URL}/add_colis`, {
    method: 'POST',
    headers: authHeaders(token, key),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ZR Express ${res.status}: ${text}`)
  }

  const data = await res.json()
  const parcelRes = key && Array.isArray(data?.Colis) ? data.Colis[0] : data
  const tracking = String(parcelRes?.code_suivi ?? parcelRes?.codsv ?? parcelRes?.tracking ?? parcelRes?.id ?? '')
  const labelUrl = String(parcelRes?.label ?? parcelRes?.label_url ?? parcelRes?.bon_url ?? '') || undefined

  return { tracking, labelUrl }
}

export async function zrCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!zrConfigured()) throw new Error('ZR Express token not configured')
  return zrCreateShipmentWithToken(input, process.env.ZR_TOKEN!, process.env.ZR_KEY)
}

export async function zrListParcels(token: string, key?: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
      headers: authHeaders(token, key),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[zrListParcels]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function zrGetRateWithToken(
  wilayaName: string,
  token: string,
  key?: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const id = wilayaToZrIdOrNull(wilayaName)
  if (id === null) return null
  try {
    const url = key
      ? `${BASE_URL}/tarification`
      : `${BASE_URL}/tarif?IDWilaya=${id}`
    const init: RequestInit = { headers: authHeaders(token, key) }
    if (key) init.method = 'POST'
    const res = await deliveryFetch(url, init)
    if (!res.ok) return null
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err: unknown) {
    logger.error('[zrGetRateWithToken]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function zrTrack(trackingNumber: string, token: string, key?: string) {
  try {
    if (key) {
      const body = { Colis: [{ Tracking: trackingNumber }] }
      const res = await deliveryFetch(`${BASE_URL}/lire`, {
        method: 'POST',
        headers: authHeaders(token, key),
        body: JSON.stringify(body),
      })
      if (!res.ok) return null
      return res.json()
    }
    const res = await deliveryFetch(`${BASE_URL}/parcel/${encodeURIComponent(trackingNumber)}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[zrTrack]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
