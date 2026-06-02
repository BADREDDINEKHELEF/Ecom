import { DeliveryProvider, ProviderId } from './types'

export const DELIVERY_PROVIDERS: DeliveryProvider[] = [
  {
    id: 'yalidine',
    name: 'Yalidine',
    hasApi: true,
    color: '#FF6B35',
    dashboardUrl: 'https://yalidine.app/dashboard',
    trackingUrl: 'https://yalidine.app/tracking?id=',
  },
  {
    id: 'zr',
    name: 'ZR Express',
    hasApi: false,
    color: '#2563EB',
    dashboardUrl: 'https://zrexpress.dz',
    trackingUrl: 'https://zrexpress.dz/tracking?code=',
  },
  {
    id: 'colivraison',
    name: 'Colivraison',
    hasApi: false,
    color: '#7C3AED',
    dashboardUrl: 'https://app.colivraison.com',
  },
  {
    id: 'maystro',
    name: 'Maystro Delivery',
    hasApi: false,
    color: '#059669',
    dashboardUrl: 'https://maystro-delivery.com/app',
    trackingUrl: 'https://maystro-delivery.com/tracking?ref=',
  },
  {
    id: 'rex',
    name: 'Rex Livraison',
    hasApi: false,
    color: '#DC2626',
    dashboardUrl: 'https://rexlivraison.com',
  },
  {
    id: 'procolis',
    name: 'Procolis',
    hasApi: false,
    color: '#D97706',
    dashboardUrl: 'https://procolis.com',
    trackingUrl: 'https://procolis.com/tracking/',
  },
  {
    id: 'yassir',
    name: 'Yassir Express',
    hasApi: false,
    color: '#0EA5E9',
    dashboardUrl: 'https://yassir.com',
  },
]

export function getProvider(id: ProviderId | string): DeliveryProvider | undefined {
  return DELIVERY_PROVIDERS.find((p) => p.id === id)
}
