import { ShipmentInput, ShipmentResult } from './types'
import { yalidineCreateShipment, yalidineCreateShipmentWithCreds, yalidineConfigured } from './yalidine'
import { procolisCreateShipment, procolisCreateShipmentWithToken, procolisConfigured } from './procolis'
import { zrCreateShipment, zrCreateShipmentWithToken, zrConfigured } from './zrexpress'
import { colivraisonCreateShipment, colivraisonCreateShipmentWithToken, colivraisonConfigured } from './colivraison'
import { maystroCreateShipment, maystroCreateShipmentWithToken, maystroConfigured } from './maystro'
import { rexCreateShipment, rexCreateShipmentWithToken, rexConfigured } from './rex'
import { yassirCreateShipment, yassirCreateShipmentWithKey, yassirConfigured } from './yassir'
import { ecomCreateShipment, ecomCreateShipmentWithToken, ecomConfigured } from './ecom'
import { apecCreateShipment, apecCreateShipmentWithCreds, apecConfigured } from './apec'

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

export function getTrackingUrl(provider: string, trackingNumber: string): string {
  const urls: Record<string, string> = {
    yalidine:    `https://yalidine.app/tracking?id=${trackingNumber}`,
    zr:          `https://zrexpress.dz/tracking?code=${trackingNumber}`,
    maystro:     `https://maystro-delivery.com/tracking?ref=${trackingNumber}`,
    procolis:    `https://procolis.com/tracking/${trackingNumber}`,
    colivraison: `https://app.colivraison.com/tracking/${trackingNumber}`,
    rex:         `https://rexlivraison.com/tracking/${trackingNumber}`,
    yassir:      `https://yassir.com/tracking/${trackingNumber}`,
    ecom:        `https://ecomdelivery.dz/tracking?id=${trackingNumber}`,
    apec:        `https://apec.dz/tracking?id=${trackingNumber}`,
  }
  return urls[provider] ?? `#`
}
