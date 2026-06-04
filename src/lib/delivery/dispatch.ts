/**
 * Generic delivery dispatch — routes to the right API client per provider.
 * Non-Yalidine providers don't have public APIs yet; they fall through to
 * the "manual" path where sellers enter tracking numbers themselves.
 */
import { ShipmentInput, ShipmentResult } from './types'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured } from './yalidine'

export interface DispatchResult extends ShipmentResult {
  provider: string
  requiresManual: boolean
}

export async function dispatchShipment(
  provider: string,
  input: ShipmentInput,
  vendorApiId?: string,
  vendorApiToken?: string
): Promise<DispatchResult> {
  switch (provider) {
    case 'yalidine': {
      if (!yalidineConfigured() && (!vendorApiId || !vendorApiToken)) {
        return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
      }
      // Pass vendor credentials directly — never mutate process.env (not thread-safe)
      const result = vendorApiId && vendorApiToken
        ? await yalidineCreateShipmentWithCreds(input, vendorApiId, vendorApiToken)
        : await yalidineCreateShipment(input)
      return { ...result, provider, requiresManual: false }
    }

    // ZR Express, Maystro, etc — no public API integration yet
    // Sellers must enter tracking numbers manually in the dashboard
    case 'zr':
    case 'colivraison':
    case 'maystro':
    case 'rex':
    case 'procolis':
    case 'yassir':
    default:
      return { provider, tracking: '', labelUrl: undefined, requiresManual: true }
  }
}

export function getTrackingUrl(provider: string, trackingNumber: string): string {
  const urls: Record<string, string> = {
    yalidine:    `https://yalidine.app/tracking?id=${trackingNumber}`,
    zr:          `https://zrexpress.dz/tracking?code=${trackingNumber}`,
    maystro:     `https://maystro-delivery.com/tracking?ref=${trackingNumber}`,
    procolis:    `https://procolis.com/tracking/${trackingNumber}`,
    colivraison: `https://app.colivraison.com/tracking/${trackingNumber}`,
    rex:         `https://rexlivraison.com/tracking/${trackingNumber}`,
    yassir:      `https://yassir.com/tracking/${trackingNumber}`,
  }
  return urls[provider] ?? `#`
}
