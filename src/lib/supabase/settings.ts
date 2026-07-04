import { unstable_cache } from 'next/cache'
import { createAdminClient } from './admin'

export interface StoreSettings {
  storeName:             string
  storeEmail:            string
  phone:                 string
  whatsappNumber:        string
  freeShippingThreshold: number
  zone1Cost:             number
  zone2Cost:             number
  zone3Cost:             number
  zone4Cost:             number
  cashOnDelivery:        boolean
  cardPayment:           boolean
  paymentCcp:            string
  paymentBaridimob:      string
  paymentNote:           string
  announcementText:      string
  announcementActive:    boolean
  announcementColor:     string
}

const SETTINGS_DEFAULTS: StoreSettings = {
  storeName:             'StoreDz',
  storeEmail:            'storedz321123@gmail.com',
  phone:                 '+213 555 000 000',
  whatsappNumber:        '213555000000',
  freeShippingThreshold: 5000,
  zone1Cost:             350,
  zone2Cost:             450,
  zone3Cost:             600,
  zone4Cost:             850,
  cashOnDelivery:        true,
  cardPayment:           false,
  paymentCcp:            '',
  paymentBaridimob:      '',
  paymentNote:           '',
  announcementText:      '',
  announcementActive:    false,
  announcementColor:     'amber',
}

function dbToSettings(data: Record<string, unknown>): StoreSettings {
  return {
    storeName:             String(data.store_name),
    storeEmail:            String(data.store_email),
    phone:                 String(data.phone),
    whatsappNumber:        String(data.whatsapp_number),
    freeShippingThreshold: Number(data.free_shipping_threshold),
    zone1Cost:             Number(data.zone1_cost),
    zone2Cost:             Number(data.zone2_cost),
    zone3Cost:             Number(data.zone3_cost),
    zone4Cost:             Number(data.zone4_cost),
    cashOnDelivery:        Boolean(data.cash_on_delivery),
    cardPayment:           Boolean(data.card_payment),
    paymentCcp:            String(data.payment_ccp ?? ''),
    paymentBaridimob:      String(data.payment_baridimob ?? ''),
    paymentNote:           String(data.payment_note ?? ''),
    announcementText:      String(data.announcement_text ?? ''),
    announcementActive:    Boolean(data.announcement_active),
    announcementColor:     String(data.announcement_color ?? 'amber'),
  }
}

export const getStoreSettings = unstable_cache(
  async (): Promise<StoreSettings> => {
    // Public settings; use admin client so cached reads work reliably server-side.
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()
    if (error || !data) return SETTINGS_DEFAULTS
    return dbToSettings(data)
  },
  ['store-settings'],
  { revalidate: 300, tags: ['store-settings'] }
)

