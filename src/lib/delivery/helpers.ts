import type { ShipmentResult } from './types'
import { extractRates, findWilayaRow } from './utils'
import { deliveryFetch } from './client'

/**
 * Extract tracking number from a delivery provider's JSON response.
 * Each provider uses different field names — this tries them all.
 */
export function extractTrackingInfo(data: Record<string, unknown>): ShipmentResult {
  const tracking = String(
    data.tracking ?? data.tracking_code ?? data.tracking_number ??
    data.code_suivi ?? data.parcel_id ?? data.delivery_id ??
    data.order_id ?? data.id ?? '',
  )
  const labelUrl: string | undefined =
    (data.label ?? data.label_url ?? data.bon_livraison ?? data.bon_url ?? undefined) as string | undefined

  return { tracking, labelUrl }
}

/**
 * Fetch JSON from a URL and return the parsed response, or null on any error.
 * Used by list/track/rate endpoints across all delivery providers.
 */
export async function fetchJsonOrNull<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    const res = await deliveryFetch(url, options)
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/**
 * Fetch delivery rates for a wilaya from a provider API.
 * Common pattern across providers: fetch → find wilaya row → extract rates.
 */
export async function fetchRateOrNull(
  url: string,
  headers: Record<string, string>,
  wilayaName: string,
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  try {
    const res = await deliveryFetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch {
    return null
  }
}

/**
 * POST a shipment to a delivery provider API and parse the response.
 * Throws on HTTP errors with a provider-prefixed message.
 */
export async function postShipment(
  providerName: string,
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<{ data: Record<string, unknown>; response: Response }> {
  const res = await deliveryFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${providerName} ${res.status}: ${text}`)
  }

  const data = await res.json()
  return { data, response: res }
}
