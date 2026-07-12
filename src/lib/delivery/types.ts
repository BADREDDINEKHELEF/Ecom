export type ProviderId =
  | 'yalidine'
  | 'zr'
  | 'colivraison'
  | 'maystro'
  | 'rex'
  | 'procolis'
  | 'yassir'
  | 'ecom'
  | 'apec'

export interface DeliveryProvider {
  id: ProviderId
  name: string
  hasApi: boolean
  color: string
  dashboardUrl: string
  trackingUrl?: string // append tracking number
}

export interface ShipmentInput {
  orderId: string
  fullName: string
  phone: string
  address: string
  city: string
  wilaya: string
  total: number
  items?: string
  isStopDesk?: boolean
  stopDeskCause?: string | null
  /** Origin wilaya (store/vendor wilaya). Required by Yalidine/APEC. */
  fromWilaya?: string
  /** Stop-desk/agency identifier when desk delivery is selected. */
  stopDeskId?: string | null
  /** Optional secondary phone number (Procolis/ZR MobileB). */
  phoneSecondary?: string
  /** Optional reference / external tracking id (Procolis/ZR Tracking, EcoTrack reference). */
  externalReference?: string
  /** Exchange / replacement shipment flag. */
  isExchange?: boolean
  /** Product-to-collect description for exchange shipments (Yalidine product_to_collect). */
  productToCollect?: string | null
}

export interface ShipmentResult {
  tracking: string
  labelUrl?: string
}

/** Unified provider credentials passed to dispatch helpers. */
export interface VendorDeliveryCreds {
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
