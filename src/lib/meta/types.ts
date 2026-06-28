// ── Standard Meta events (8 events) ────────────────────────────────────
export type MetaEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'

// ── Store Meta configuration (loaded dynamically per store) ────────────
export interface StoreMetaConfig {
  storeId:       string
  storeSlug:     string
  pixelId:       string | null
  accessToken:   string | null   // server-only — never sent to client
  testEventCode: string | null   // optional Meta test event code
  datasetId:     string | null   // Meta dataset ID (usually same as pixelId)
  enabled:       boolean
}

// ── User data for CAPI (server-side only) ──────────────────────────────
export interface MetaUserData {
  email?:             string   // SHA-256 hashed
  phone?:             string   // SHA-256 hashed
  first_name?:        string   // SHA-256 hashed
  last_name?:         string   // SHA-256 hashed
  city?:              string   // SHA-256 hashed
  state?:             string   // SHA-256 hashed
  postal_code?:       string   // SHA-256 hashed
  country?:           string   // SHA-256 hashed
  external_id?:       string   // SHA-256 hashed
  client_ip_address?: string   // Anonymized
  client_user_agent?: string
  fbp?:               string   // _fbp cookie value
  fbc?:               string   // _fbc cookie value
}

// ── CAPI event payload ─────────────────────────────────────────────────
export interface MetaCAPIPurchaseEvent {
  event_name:      'Purchase'
  event_time:      number
  event_id:        string
  action_source:   'website'
  user_data:       MetaUserData
  custom_data:     {
    value:        number
    currency:     'DZD'
    order_id:     string
    content_ids?: string[]
    content_type?: 'product'
    num_items?:   number
  }
  event_source_url?: string
}

export interface MetaCAPIRequestBody {
  data: MetaCAPIPurchaseEvent[]
  test_event_code?: string
}

export interface MetaCAPIResponse {
  events_received: number
  messages?:       Array<{ message: string }>
  fbtrace_id?:     string
  error?:          { message: string; type?: string; code?: number; fbtrace_id?: string }
}

// ── Client-side event params (all 8 events) ────────────────────────────
export interface PageViewParams {
  event_source_url?: string
}

export interface ViewContentParams {
  content_ids:       string[]
  content_name:      string
  content_type:      'product' | 'product_group' | 'store'
  value:             number
  currency:          'DZD'
  contents:          Array<{ id: string; quantity: number; price: number }>
  content_category?: string
  event_source_url?: string
}

export interface SearchParams {
  search_string:     string
  content_ids?:      string[]
  content_type?:     'product'
  event_source_url?: string
}

export interface AddToWishlistParams {
  content_ids:       string[]
  content_name:      string
  content_type:      'product'
  value:             number
  currency:          'DZD'
  contents:          Array<{ id: string; quantity: number; price: number }>
  event_source_url?: string
}

export interface AddToCartParams {
  content_ids:       string[]
  content_name:      string
  content_type:      'product'
  value:             number
  currency:          'DZD'
  contents:          Array<{ id: string; quantity: number; price: number }>
  event_source_url?: string
}

export interface InitiateCheckoutParams {
  value:             number
  currency:          'DZD'
  num_items:         number
  content_ids?:      string[]
  content_type?:     'product'
  contents?:         Array<{ id: string; quantity: number; price: number }>
  event_source_url?: string
}

export interface AddPaymentInfoParams {
  value:             number
  currency:          'DZD'
  num_items?:        number
  content_ids?:      string[]
  content_type?:     'product'
  payment_method?:   string
  event_source_url?: string
}

export interface PurchaseParams {
  value:             number
  currency:          'DZD'
  content_ids:       string[]
  content_type:      'product'
  num_items:         number
  contents:          Array<{ id: string; quantity: number; price: number }>
  transactionId:     string
  event_source_url?: string
}

// ── Results ────────────────────────────────────────────────────────────
export interface CAPIResult {
  ok:      boolean
  status:  number
  message: string
  raw?:    unknown
}

export type CAPIVendorResult = {
  vendorId: string
  storeSlug: string
  result: CAPIResult
}
