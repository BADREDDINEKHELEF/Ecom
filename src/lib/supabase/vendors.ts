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
  // Subscription (denormalized cache)
  subscription_status?:     'trial' | 'active' | 'grace_period' | 'expired' | 'none' | null
  subscription_plan_id?:    string | null
  subscription_expires_at?: string | null
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
  procolis_token?:       string | null
  zr_token?:             string | null
  auto_create_shipment: boolean
  notify_whatsapp:      boolean
  notify_sms:           boolean
}

// ── Vendor CRUD ────────────────────────────────────────────────

const VENDOR_COLS = 'id,user_id,owner_id,store_name,store_slug,logo_url,banner_url,cover_url,accent_color,seo_title,seo_description,description,phone,wilaya,commission_rate,is_approved,is_active,social_instagram,social_facebook,social_whatsapp,social_tiktok,theme_preset,business_type,subscription_status,subscription_plan_id,subscription_expires_at,created_at'

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', userId)
    .single()
  return (data as Vendor) ?? null
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('store_slug', slug)
    .eq('is_active', true)
    .single()
  return (data as Vendor) ?? null
}

export async function createVendor(
  vendor: Omit<Vendor, 'id' | 'commission_rate' | 'is_approved' | 'is_active' | 'created_at'>
): Promise<Vendor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert(vendor)
    .select()
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
  if (e.yalidine_api_id)   e.yalidine_api_id   = enc(e.yalidine_api_id)
  if (e.yalidine_api_token) e.yalidine_api_token = enc(e.yalidine_api_token)
  if (e.procolis_token)    e.procolis_token    = enc(e.procolis_token)
  if (e.zr_token)          e.zr_token          = enc(e.zr_token)
  return e
}

function decryptConfigCredentials(config: VendorDeliveryConfig): VendorDeliveryConfig {
  const dec = (v: string | null | undefined): string | null =>
    v ? (isEncrypted(v) ? decryptField(v) : v) : null
  return {
    ...config,
    yalidine_api_id:    dec(config.yalidine_api_id),
    yalidine_api_token: dec(config.yalidine_api_token),
    procolis_token:     dec(config.procolis_token),
    zr_token:           dec(config.zr_token),
  }
}

export async function getVendorDeliveryConfig(
  vendorId: string
): Promise<VendorDeliveryConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendor_delivery_config')
    .select('*')
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
  const { error } = await supabase
    .from('vendor_delivery_config')
    .upsert({ vendor_id: vendorId, ...encrypted })
  if (error) throw error
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
  updates: Partial<Pick<VendorSubscription, 'status' | 'payment_reference' | 'payment_method' | 'payment_proof_url' | 'admin_note' | 'expires_at' | 'grace_period_ends_at'>>
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
