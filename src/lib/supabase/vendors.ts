import { createClient } from './client'
import { createAdminClient } from './admin'
import { encryptField, decryptField, isEncrypted } from '@/lib/utils/crypto'

export interface Vendor {
  id:               string
  user_id:          string
  store_name:       string
  store_slug:       string
  logo_url:         string | null
  banner_url?:       string | null
  accent_color?:     string | null
  seo_title?:        string | null
  seo_description?:  string | null
  description:      string | null
  phone:            string | null
  wilaya:           string | null
  commission_rate:  number
  is_approved:      boolean
  is_active:        boolean
  created_at:       string
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

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', userId)
    .single()
  return (data as Vendor) ?? null
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('vendors')
    .select('*')
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

export async function getAllVendors(): Promise<Vendor[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Vendor[]
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
