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
    id: 'procolis',
    name: 'Procolis',
    hasApi: true,
    color: '#D97706',
    dashboardUrl: 'https://procolis.com',
    trackingUrl: 'https://procolis.com/tracking/',
  },
  {
    id: 'zr',
    name: 'ZR Express',
    hasApi: true,
    color: '#2563EB',
    dashboardUrl: 'https://zrexpress.dz',
    trackingUrl: 'https://zrexpress.dz/tracking?code=',
  },
  {
    id: 'maystro',
    name: 'Maystro Delivery',
    hasApi: true,
    color: '#059669',
    dashboardUrl: 'https://maystro-delivery.com/app',
    trackingUrl: 'https://maystro-delivery.com/tracking?ref=',
  },
  {
    id: 'colivraison',
    name: 'Colivraison',
    hasApi: true,
    color: '#7C3AED',
    dashboardUrl: 'https://app.colivraison.com',
    trackingUrl: 'https://app.colivraison.com/tracking/',
  },
  {
    id: 'rex',
    name: 'Rex Livraison',
    hasApi: true,
    color: '#DC2626',
    dashboardUrl: 'https://rexlivraison.com',
    trackingUrl: 'https://rexlivraison.com/tracking/',
  },
  {
    id: 'yassir',
    name: 'Yassir Express',
    hasApi: true,
    color: '#0EA5E9',
    dashboardUrl: 'https://yassir.com',
    trackingUrl: 'https://yassir.com/tracking?id=',
  },
  {
    id: 'ecom',
    name: 'Ecom Delivery',
    hasApi: true,
    color: '#10B981',
    dashboardUrl: 'https://ecomdelivery.dz',
    trackingUrl: 'https://ecomdelivery.dz/tracking?id=',
  },
  {
    id: 'apec',
    name: 'APEC Delivery',
    hasApi: true,
    color: '#6366F1',
    dashboardUrl: 'https://apec.dz',
    trackingUrl: 'https://apec.dz/tracking?id=',
  },
]

export function getProvider(id: ProviderId | string): DeliveryProvider | undefined {
  return DELIVERY_PROVIDERS.find((p) => p.id === id)
}
