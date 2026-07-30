import { createAdminClient } from './admin'
import { encryptField, decryptField, isEncrypted } from '@/lib/utils/crypto'

// ── Vendor Types ───────────────────────────────────────────────────
export interface Vendor {
  id:                    string
  user_id:               string
  owner_id:              string | null
  store_name:            string | null
  store_slug:            string | null
  logo_url:              string | null
  banner_url:            string | null
  cover_url:             string | null
  accent_color:          string | null
  seo_title:             string | null
  seo_description:       string | null
  description:           string | null
  phone:                 string | null
  wilaya:                string | null
  commission_rate:       number | null
  is_approved:           boolean
  is_active:             boolean
  social_instagram:      string | null
  social_facebook:       string | null
  social_whatsapp:       string | null
  social_tiktok:         string | null
  theme_preset:          string | null
  business_type:         string | null
  is_on_vacation:        boolean | null
  vacation_message:      string | null
  bank_rib:              string | null
  bank_ccp:              string | null
  bank_baridimob:        string | null
  bank_account_name:     string | null
  low_stock_threshold:   number | null
  verified_at:           string | null
  return_policy:         string | null
  shipping_policy:       string | null
  referral_code:         string | null
  subscription_status:   string | null
  subscription_plan_id:  string | null
  subscription_expires_at: string | null
  admin_note:            string | null
  meta_pixel_id:         string | null
  gtag_id:               string | null
  tiktok_pixel_id:       string | null
  pixel_id:              string | null
  meta_capi_token:       string | null
  tiktok_capi_token:     string | null
  gtag_api_secret:       string | null
  meta_test_event_code:  string | null
  meta_enabled:          boolean
  created_at:            string
  updated_at?:           string
}

export interface VendorDeliveryConfig {
  id:                   string
  vendor_id:            string
  default_provider:     string
  yalidine_api_id:      string | null
  yalidine_api_token:   string | null
  procolis_token?:      string | null
  procolis_key?:        string | null
  zr_token?:            string | null
  zr_key?:              string | null
  colivraison_token?:   string | null
  maystro_token?:       string | null
  rex_token?:           string | null
  yassir_api_key?:      string | null
  ecom_api_key?:        string | null
  ecom_api_token?:      string | null
  apec_api_id?:         string | null
  apec_api_token?:      string | null
  auto_create_shipment: boolean
  notify_whatsapp:      boolean
  notify_sms:           boolean
  /** Internal flag set when an encrypted credential could not be decrypted. */
  _decryptionFailed?:   boolean
}

// ── Vendor CRUD ───────────────────────────────────────────────────
const VENDOR_COLS = 'id,user_id,owner_id,store_name,store_slug,logo_url,banner_url,cover_url,accent_color,seo_title,seo_description,description,phone,wilaya,commission_rate,is_approved,is_active,social_instagram,social_facebook,social_whatsapp,social_tiktok,theme_preset,business_type,is_on_vacation,vacation_message,bank_rib,bank_ccp,bank_baridimob,bank_account_name,low_stock_threshold,verified_at,return_policy,shipping_policy,referral_code,subscription_status,subscription_plan_id,subscription_expires_at,admin_note,meta_pixel_id,gtag_id,tiktok_pixel_id,pixel_id,meta_capi_token,tiktok_capi_token,gtag_api_secret,meta_test_event_code,meta_enabled,created_at'

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  // Used from seller server components and client auth; admin client is safe
  // and avoids browser-client failures during SSR.
  // Resolves owners first, then team members (vendor_members), matching the
  // RBAC logic in @/lib/auth/vendorAuth.
  const supabase = createAdminClient()
  const { data: ownedVendor, error: ownerErr } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', userId)
    .maybeSingle()
  if (ownerErr) return null
  if (ownedVendor) return ownedVendor as Vendor

  const { data: membership, error: memberErr } = await supabase
    .from('vendor_members')
    .select('vendor_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (memberErr || !membership) return null

  const { data: memberVendor, error: vendorErr } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('id', membership.vendor_id)
    .maybeSingle()
  if (vendorErr || !memberVendor) return null
  return memberVendor as Vendor
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('id', vendorId)
    .maybeSingle()
  if (error || !data) return null
  return data as Vendor
}

export async function getVendorsByIds(
  vendorIds: string[]
): Promise<Record<string, Pick<Vendor, 'id' | 'store_name' | 'store_slug'>>> {
  if (vendorIds.length === 0) return {}
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('id,store_name,store_slug')
    .in('id', vendorIds)
  if (error || !data) return {}
  return (data as Array<Pick<Vendor, 'id' | 'store_name' | 'store_slug'>>).reduce(
    (map, vendor) => {
      if (vendor.id) map[vendor.id] = vendor
      return map
    },
    {} as Record<string, Pick<Vendor, 'id' | 'store_name' | 'store_slug'>>
  )
}

export async function getVendorByUserIdServer(userId: string): Promise<Vendor | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return data as Vendor
}

// ── Vendor Delivery Config ────────────────────────────────────────────
function encryptConfigCredentials(
  config: Partial<Omit<VendorDeliveryConfig, 'id' | 'vendor_id'>>
): typeof config {
  const e = { ...config }
  const enc = (v?: string | null) => (v && !isEncrypted(v) ? encryptField(v) : v)

  if (e.ecom_api_key)        e.ecom_api_key        = enc(e.ecom_api_key)
  if (e.ecom_api_token)      e.ecom_api_token      = enc(e.ecom_api_token)
  if (e.yalidine_api_id)    e.yalidine_api_id    = enc(e.yalidine_api_id)
  if (e.yalidine_api_token) e.yalidine_api_token = enc(e.yalidine_api_token)
  if (e.procolis_token)     e.procolis_token     = enc(e.procolis_token)
  if (e.procolis_key)       e.procolis_key       = enc(e.procolis_key)
  if (e.zr_token)           e.zr_token           = enc(e.zr_token)
  if (e.zr_key)             e.zr_key             = enc(e.zr_key)
  if (e.colivraison_token)  e.colivraison_token  = enc(e.colivraison_token)
  if (e.maystro_token)      e.maystro_token      = enc(e.maystro_token)
  if (e.rex_token)          e.rex_token          = enc(e.rex_token)
  if (e.yassir_api_key)     e.yassir_api_key     = enc(e.yassir_api_key)
  if (e.apec_api_id)        e.apec_api_id        = enc(e.apec_api_id)
  if (e.apec_api_token)     e.apec_api_token     = enc(e.apec_api_token)
  return e
}

function decryptConfigCredentials(config: VendorDeliveryConfig): VendorDeliveryConfig {
  let decryptionFailed = false
  const dec = (v: string | null | undefined): string | null => {
    if (!v) return null
    if (!isEncrypted(v)) return v
    const plain = decryptField(v)
    if (plain === '') {
      decryptionFailed = true
      return null
    }
    return plain
  }

  return {
    ...config,
    yalidine_api_id:    dec(config.yalidine_api_id),
    yalidine_api_token: dec(config.yalidine_api_token),
    procolis_token:     dec(config.procolis_token),
    procolis_key:       dec(config.procolis_key),
    zr_token:           dec(config.zr_token),
    zr_key:             dec(config.zr_key),
    colivraison_token:  dec(config.colivraison_token),
    maystro_token:      dec(config.maystro_token),
    rex_token:          dec(config.rex_token),
    yassir_api_key:     dec(config.yassir_api_key),
    ecom_api_key:       dec(config.ecom_api_key),
    ecom_api_token:     dec(config.ecom_api_token),
    apec_api_id:        dec(config.apec_api_id),
    apec_api_token:     dec(config.apec_api_token),
    _decryptionFailed:  decryptionFailed || undefined,
  }
}

export async function getVendorDeliveryConfig(
  vendorId: string
): Promise<VendorDeliveryConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_delivery_config')
    .select('id, vendor_id, default_provider, yalidine_api_id, yalidine_api_token, procolis_token, procolis_key, zr_token, zr_key, colivraison_token, maystro_token, rex_token, yassir_api_key, ecom_api_key, ecom_api_token, apec_api_id, apec_api_token, auto_create_shipment, notify_whatsapp, notify_sms')
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
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('vendor_delivery_config')
    .upsert(
      { vendor_id: vendorId, ...encrypted, updated_at: now },
      { onConflict: 'vendor_id' }
    )

  if (error) throw error
}

// ── Subscription Types ───────────────────────────────────────────────────
export interface SubscriptionPlan {
  id:                 string
  name:               string
  name_ar?:           string
  name_fr?:           string
  name_en?:           string
  price:              number
  price_dzd:          number
  billing_period_days: number
  features:           string[]
  features_ar?:       string[]
  features_fr?:       string[]
  features_en?:       string[]
  is_active:          boolean
  created_at:         string
}

export interface VendorSubscription {
  id:              string
  vendor_id:       string
  plan_id:         string
  status:          'trial' | 'pending' | 'active' | 'grace_period' | 'expired' | 'cancelled'
  amount_dzd:      number
  started_at:      string | null
  expires_at:      string | null
  grace_period_ends_at: string | null
  payment_method:  string | null
  payment_reference: string | null
  payment_proof_url: string | null
  admin_note:      string | null
  renewed_from_id: string | null
  created_at:      string
  updated_at:      string
}

// ── Subscription Functions ───────────────────────────────────────────────────
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('id, name, price, price_dzd, billing_period_days, features, is_active, created_at')
    .eq('is_active', true)
    .order('price', { ascending: true })
  return (data ?? []) as SubscriptionPlan[]
}

export async function getSubscriptionById(id: string): Promise<SubscriptionPlan | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('subscription_plans')
    .select('id, name, price, price_dzd, billing_period_days, features, is_active, created_at')
    .eq('id', id)
    .maybeSingle()
  return data as SubscriptionPlan | null
}

export async function getVendorSubscription(vendorId: string): Promise<VendorSubscription | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_subscriptions')
    .select('id, vendor_id, plan_id, status, amount_dzd, started_at, expires_at, grace_period_ends_at, payment_method, payment_reference, payment_proof_url, admin_note, renewed_from_id, created_at, updated_at')
    .eq('vendor_id', vendorId)
    .maybeSingle()
  return data as VendorSubscription | null
}

export async function getVendorSubscriptionById(subscriptionId: string): Promise<VendorSubscription | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_subscriptions')
    .select('id, vendor_id, plan_id, status, amount_dzd, started_at, expires_at, grace_period_ends_at, payment_method, payment_reference, payment_proof_url, admin_note, renewed_from_id, created_at, updated_at')
    .eq('id', subscriptionId)
    .maybeSingle()
  return data as VendorSubscription | null
}

export async function createVendorSubscription(input: {
  vendorId: string
  planId: string
  status: 'trial' | 'pending' | 'active' | 'grace_period' | 'expired' | 'cancelled'
  amountDzd?: number
  paymentMethod?: string | null
  paymentReference?: string | null
  paymentProofUrl?: string | null
  startedAt?: string
  expiresAt: string
  gracePeriodEndsAt?: string
  adminNote?: string | null
  renewedFromId?: string | null
}): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  await supabase
    .from('vendor_subscriptions')
    .insert({
      vendor_id: input.vendorId,
      plan_id: input.planId,
      status: input.status,
      amount_dzd: input.amountDzd ?? 0,
      payment_method: input.paymentMethod ?? null,
      payment_reference: input.paymentReference ?? null,
      payment_proof_url: input.paymentProofUrl ?? null,
      started_at: input.startedAt ?? now,
      expires_at: input.expiresAt,
      grace_period_ends_at: input.gracePeriodEndsAt ?? null,
      admin_note: input.adminNote ?? null,
      renewed_from_id: input.renewedFromId ?? null,
      created_at: now,
      updated_at: now,
    })
}

export async function getAllVendors(page: number, pageSize: number): Promise<{ vendors: Vendor[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, count } = await supabase
    .from('vendors')
    .select(VENDOR_COLS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  const vendors = (data ?? []) as Vendor[]
  return { vendors, hasMore: (count ?? 0) > to + 1 }
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  // Server components (e.g. product pages) call this; use the admin client
  // because createClient() is a browser client and is not safe/reliable in SSR.
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .ilike('store_slug', slug)
    .maybeSingle()
  if (error || !data) return null
  return data as Vendor
}

export async function updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', vendorId)
  if (error) {
    console.error('[updateVendor] Error:', error)
    throw error
  }
}

export async function getAllVendorSubscriptions(opts: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<{ subscriptions: VendorSubscription[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const from = (opts.page ?? 0) * (opts.pageSize ?? 50)
  const to = from + (opts.pageSize ?? 50) - 1
  let query = supabase
    .from('vendor_subscriptions')
    .select('id, vendor_id, plan_id, status, started_at, expires_at, grace_period_ends_at, payment_method, payment_reference, payment_proof_url, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (opts.status) query = query.eq('status', opts.status)
  const { data, count } = await query
  const subscriptions = (data ?? []) as VendorSubscription[]
  return { subscriptions, hasMore: (count ?? 0) > to + 1 }
}

export async function updateVendorSubscription(
  subscriptionId: string,
  updates: Partial<Pick<VendorSubscription, 'status' | 'expires_at' | 'grace_period_ends_at' | 'started_at'>>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('vendor_subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) {
    console.error('[updateVendorSubscription] Error:', error)
    throw error
  }
}
