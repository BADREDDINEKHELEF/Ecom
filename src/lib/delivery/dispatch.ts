import { ShipmentInput, ShipmentResult } from './types'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured } from './yalidine'
import { procolisCreateShipment, procolisCreateShipmentWithToken, procolisConfigured } from './procolis'
import { zrCreateShipment, zrCreateShipmentWithToken, zrConfigured } from './zrexpress'

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

    case 'colivraison':
    case 'maystro':
    case 'rex':
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
