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
}

export interface ShipmentResult {
  tracking: string
  labelUrl?: string
}
