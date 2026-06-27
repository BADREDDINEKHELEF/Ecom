import { createClient } from './client'
import { createAdminClient } from './admin'
import { encryptField, decryptField, isEncrypted } from '@/lib/utils/crypto'

export interface Vendor {
  id:                       string
  user_id:                  string
  owner_id?:                string | null
  store_name:               string
  store_slug:               string
  logo_url:                 string | null
  banner_url?:              string | null
  cover_url?:               string | null
  accent_color?:            string | null
  seo_title?:               string | null
  seo_description?:         string | null
  description:              string | null
  phone:                    string | null
  wilaya:                   string | null
  commission_rate:          number
  is_approved:              boolean
  is_active:                boolean
  // Branding
  social_instagram?:        string | null
  social_facebook?:         string | null
  social_whatsapp?:         string | null
  social_tiktok?:           string | null
  theme_preset?:            string | null
  business_type?:           string | null
  // Vacation mode
  is_on_vacation?:          boolean | null
  vacation_message?:        string | null
  // Bank / payout details
  bank_rib?:                string | null
  bank_ccp?:                string | null
  bank_baridimob?:          string | null
  bank_account_name?:       string | null
  // Inventory settings
  low_stock_threshold?:     number | null
  // Verification
  verified_at?:             string | null
  // Store policies
  return_policy?:           string | null
  shipping_policy?:         string | null
  // Referral
  referral_code?:           string | null
  // Vendor pixels (client-side)
  meta_pixel_id?:           string | null
  gtag_id?:                 string | null
  tiktok_pixel_id?:         string | null
  pixel_id?:                string | null
  // Vendor CAPI tokens (server-side — never exposed to client)
  meta_capi_token?:         string | null
  tiktok_capi_token?:       string | null
  gtag_api_secret?:         string | null
  // Subscription (denormalized cache)
  subscription_status?:     'trial' | 'active' | 'grace_period' | 'expired' | 'none' | null
  subscription_plan_id?:    string | null
  subscription_expires_at?: string | null
  admin_note?:              string | null
  created_at:               string
}

export interface SubscriptionPlan {
  id:                         string
  name_en:                    string
  name_ar:                    string
  name_fr:                    string
  price_dzd:                  number
  billing_period_days:        number
  max_products:               number
  max_stores:                 number
  sponsored_products_allowed: number
  features_en:                string[]
  features_ar:                string[]
  features_fr:                string[]
  is_active:                  boolean
  display_order:              number
}

export interface VendorSubscription {
  id:                   string
  vendor_id:            string
  plan_id:              string
  status:               'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled'
  amount_dzd:           number
  started_at:           string
  expires_at:           string
  grace_period_ends_at: string | null
  payment_reference:    string | null
  payment_method:       'manual' | 'baridi_mob' | 'ccp' | 'edahabia' | null
  payment_proof_url:    string | null
  admin_note:           string | null
  created_at:           string
  updated_at:           string
}

export interface VendorDeliveryConfig {
  id:                   string
  vendor_id:            string
  default_provider:     string
  yalidine_api_id:      string | null
  yalidine_api_token:   string | null
  procolis_token?:      string | null
  zr_token?:            string | null
  colivraison_token?:   string | null
  maystro_token?:       string | null
  rex_token?:           string | null
  yassir_api_key?:      string | null
  ecom_token?:          string | null
  ecom_api_key?:        string | null
  ecom_api_token?:       string | null
  apec_api_id?:         string | null
  apec_api_token?:      string | null
  auto_create_shipment: boolean
  notify_whatsapp:      boolean
  notify_sms:           boolean
}

// ── Vendor CRUD ────────────────────────────────────────────────

const VENDOR_COLS = 'id,user_id,owner_id,store_name,store_slug,logo_url,banner_url,cover_url,accent_color,seo_title,seo_description,description,phone,wilaya,commission_rate,is_approved,is_active,social_instagram,social_facebook,social_whatsapp,social_tiktok,theme_preset,business_type,is_on_vacation,vacation_message,bank_rib,bank_ccp,bank_baridimob,bank_account_name,low_stock_threshold,verified_at,return_policy,shipping_policy,referral_code,subscription_status,subscription_plan_id,subscription_expires_at,admin_note,meta_pixel_id,gtag_id,tiktok_pixel_id,pixel_id,created_at'

// Base columns that exist before migration_013; used as fallback if new columns aren't deployed yet
const VENDOR_BASE_COLS = 'id,user_id,store_name,store_slug,logo_url,banner_url,accent_color,seo_title,seo_description,description,phone,wilaya,commission_rate,is_approved,is_active,created_at'

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', userId)
    .single()
  if (!error) return (data as Vendor) ?? null
  // Migration not applied yet — fall back to base columns so auth still works
  const { data: fallback } = await supabase
    .from('vendors')
    .select(VENDOR_BASE_COLS)
    .eq('user_id', userId)
    .single()
  return (fallback as Vendor) ?? null
}

/** Server-side variant — uses admin client to bypass RLS. Use in API route handlers. */
export async function getVendorByUserIdServer(userId: string): Promise<Vendor | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Vendor) ?? null
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('store_slug', slug)
    .eq('is_active', true)
    .single()
  if (!error) return (data as Vendor) ?? null
  const { data: fallback } = await supabase
    .from('vendors')
    .select(VENDOR_BASE_COLS)
    .eq('store_slug', slug)
    .eq('is_active', true)
    .single()
  return (fallback as Vendor) ?? null
}

export async function createVendor(
  vendor: Omit<Vendor, 'id' | 'commission_rate' | 'is_approved' | 'is_active' | 'created_at'>
): Promise<Vendor> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert(vendor)
    .select(VENDOR_COLS)
    .single()
  if (error) throw error
  return data as Vendor
}

export async function updateVendor(
  id: string,
  updates: Partial<Omit<Vendor, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vendors').update(updates).eq('id', id)
  if (error) throw error
}

export async function getAllVendors(page = 0, pageSize = 100): Promise<{ vendors: Vendor[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const from = page * pageSize
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize)
  if (error) throw error
  const all = (data ?? []) as Vendor[]
  return { vendors: all.slice(0, pageSize), hasMore: all.length > pageSize }
}

// ── Vendor Delivery Config (with encrypted credentials) ────────

function encryptConfigCredentials(
  config: Partial<Omit<VendorDeliveryConfig, 'id' | 'vendor_id'>>
): typeof config {
  const e = { ...config }
  const enc = (v?: string | null) => (v && !isEncrypted(v) ? encryptField(v) : v)
  if (e.yalidine_api_id)    e.yalidine_api_id    = enc(e.yalidine_api_id)
  if (e.yalidine_api_token) e.yalidine_api_token = enc(e.yalidine_api_token)
  if (e.procolis_token)     e.procolis_token     = enc(e.procolis_token)
  if (e.zr_token)           e.zr_token           = enc(e.zr_token)
  if (e.colivraison_token)  e.colivraison_token  = enc(e.colivraison_token)
  if (e.maystro_token)      e.maystro_token      = enc(e.maystro_token)
  if (e.rex_token)          e.rex_token          = enc(e.rex_token)
  if (e.yassir_api_key)     e.yassir_api_key     = enc(e.yassir_api_key)
  if (e.ecom_token)         e.ecom_token         = enc(e.ecom_token)
  if (e.apec_api_id)        e.apec_api_id        = enc(e.apec_api_id)
  if (e.apec_api_token)     e.apec_api_token     = enc(e.apec_api_token)
  return e
}

function decryptConfigCredentials(config: VendorDeliveryConfig): VendorDeliveryConfig {
  const dec = (v: string | null | undefined): string | null =>
    v ? (isEncrypted(v) ? decryptField(v) : v) : null
  const ecomDecrypted = dec(config.ecom_token)
  let ecomKey = ''
  let ecomToken = ''
  if (ecomDecrypted) {
    try {
      const p = JSON.parse(ecomDecrypted)
      ecomKey = p?.key ?? ecomDecrypted
      ecomToken = p?.token ?? ''
    } catch { ecomKey = ecomDecrypted }
  }
  return {
    ...config,
    yalidine_api_id:    dec(config.yalidine_api_id),
    yalidine_api_token: dec(config.yalidine_api_token),
    procolis_token:     dec(config.procolis_token),
    zr_token:           dec(config.zr_token),
    colivraison_token:  dec(config.colivraison_token),
    maystro_token:      dec(config.maystro_token),
    rex_token:          dec(config.rex_token),
    yassir_api_key:     dec(config.yassir_api_key),
    ecom_token:         ecomDecrypted,
    ecom_api_key:       ecomKey || null,
    ecom_api_token:      ecomToken || null,
    apec_api_id:        dec(config.apec_api_id),
    apec_api_token:     dec(config.apec_api_token),
  }
}

export async function getVendorDeliveryConfig(
  vendorId: string
): Promise<VendorDeliveryConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_delivery_config')
    .select('id, vendor_id, default_provider, yalidine_api_id, yalidine_api_token, procolis_token, zr_token, colivraison_token, maystro_token, rex_token, yassir_api_key, ecom_token, apec_api_id, apec_api_token, auto_create_shipment, notify_whatsapp, notify_sms')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  if (!data) return null
  return decryptConfigCredentials(data as VendorDeliveryConfig)
}

export async function saveVendorDeliveryConfig(
  vendorId: string,
  config: Partial<Omit<VendorDeliveryConfig, 'id' | 'vendor_id'>>
): Promise<void> {
  const supabase = createAdminClient()
  const encrypted = encryptConfigCredentials(config)

  const { data: existing } = await supabase
    .from('vendor_delivery_config')
    .select('id')
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('vendor_delivery_config')
      .update(encrypted)
      .eq('vendor_id', vendorId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('vendor_delivery_config')
      .insert({ vendor_id: vendorId, ...encrypted })
    if (error) throw error
  }
}

// ── Subscription helpers ────────────────────────────────────────

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw error
  return (data ?? []) as SubscriptionPlan[]
}

export async function getVendorSubscription(
  vendorId: string
): Promise<VendorSubscription | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_subscriptions')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as VendorSubscription) ?? null
}

export async function getSubscriptionById(
  id: string
): Promise<VendorSubscription | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return (data as VendorSubscription) ?? null
}

export async function createVendorSubscription(
  sub: Omit<VendorSubscription, 'id' | 'created_at' | 'updated_at'>
): Promise<VendorSubscription> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendor_subscriptions')
    .insert(sub)
    .select()
    .single()
  if (error) throw error
  // Sync denormalized status on vendor row
  await supabase.from('vendors').update({
    subscription_status: sub.status,
    subscription_plan_id: sub.plan_id,
    subscription_expires_at: sub.expires_at,
  }).eq('id', sub.vendor_id)
  return data as VendorSubscription
}

export async function updateVendorSubscription(
  id: string,
  updates: Partial<Pick<VendorSubscription, 'status' | 'payment_reference' | 'payment_method' | 'payment_proof_url' | 'admin_note' | 'started_at' | 'expires_at' | 'grace_period_ends_at'>>
): Promise<void> {
  const supabase = createAdminClient()
  const { data: sub, error: fetchErr } = await supabase
    .from('vendor_subscriptions')
    .update(updates)
    .eq('id', id)
    .select('vendor_id,status,plan_id,expires_at')
    .single()
  if (fetchErr) throw fetchErr
  // Sync denormalized fields
  if (sub && (updates.status || updates.expires_at)) {
    await supabase.from('vendors').update({
      ...(updates.status       && { subscription_status: updates.status }),
      ...(updates.expires_at   && { subscription_expires_at: updates.expires_at }),
    }).eq('id', sub.vendor_id)
  }
}

export async function getAllVendorSubscriptions(opts?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<{ subscriptions: (VendorSubscription & { store_name: string; store_slug: string })[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const page = opts?.page ?? 0
  const pageSize = opts?.pageSize ?? 50
  let q = supabase
    .from('vendor_subscriptions')
    .select('*, vendors(store_name,store_slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize)
  if (opts?.status) q = q.eq('status', opts.status)
  const { data, error } = await q
  if (error) throw error
  const rows = ((data ?? []) as unknown[]).map((r: unknown) => {
    const row = r as Record<string, unknown>
    const v = row.vendors as { store_name: string; store_slug: string } | null
    return { ...row, store_name: v?.store_name ?? '', store_slug: v?.store_slug ?? '' } as VendorSubscription & { store_name: string; store_slug: string }
  })
  return { subscriptions: rows.slice(0, pageSize), hasMore: rows.length > pageSize }
}
