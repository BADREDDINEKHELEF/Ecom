import { createClient } from './client'
import { createAdminClient } from './admin'
import { encryptField, decryptField, isEncrypted } from '@/lib/utils/crypto'

export interface Vendor {
  id:              string
  user_id:         string
  store_name:      string
  store_slug:      string
  logo_url:        string | null
  description:     string | null
  phone:           string | null
  wilaya:          string | null
  commission_rate: number
  is_approved:     boolean
  is_active:       boolean
  created_at:      string
}

export interface VendorDeliveryConfig {
  id:                   string
  vendor_id:            string
  default_provider:     string
  yalidine_api_id:      string | null
  yalidine_api_token:   string | null
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
  const encrypted = { ...config }
  if (encrypted.yalidine_api_id && !isEncrypted(encrypted.yalidine_api_id)) {
    encrypted.yalidine_api_id = encryptField(encrypted.yalidine_api_id)
  }
  if (encrypted.yalidine_api_token && !isEncrypted(encrypted.yalidine_api_token)) {
    encrypted.yalidine_api_token = encryptField(encrypted.yalidine_api_token)
  }
  return encrypted
}

function decryptConfigCredentials(config: VendorDeliveryConfig): VendorDeliveryConfig {
  return {
    ...config,
    yalidine_api_id: config.yalidine_api_id && isEncrypted(config.yalidine_api_id)
      ? decryptField(config.yalidine_api_id)
      : config.yalidine_api_id,
    yalidine_api_token: config.yalidine_api_token && isEncrypted(config.yalidine_api_token)
      ? decryptField(config.yalidine_api_token)
      : config.yalidine_api_token,
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
