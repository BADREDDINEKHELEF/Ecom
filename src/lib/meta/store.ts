/**
 * Store Meta Config Resolver
 *
 * Loads Meta configuration dynamically based on the current store context.
 * Centralises all store lookups so tracking code never touches the DB directly.
 *
 * Three resolution strategies:
 *   1. By store slug (public store pages: /store/{slug})
 *   2. By vendor ID (order processing, authenticated APIs)
 *   3. Platform default (homepage, platform-level pixel from env)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { StoreMetaConfig } from './types'

const META_FIELDS = [
  'id',
  'store_slug',
  'meta_pixel_id',
  'meta_capi_token',
  'meta_test_event_code',
  'meta_dataset_id',
  'meta_enabled',
] as const

type VendorRow = Record<string, string | null | boolean>

function rowToConfig(row: VendorRow | null): StoreMetaConfig | null {
  if (!row || !row.id) return null
  const pixelId     = row.meta_pixel_id   ? String(row.meta_pixel_id)  : null
  const accessToken = row.meta_capi_token ? String(row.meta_capi_token) : null
  // The vendors table has a meta_enabled kill-switch, but it defaults to false
  // and there is currently no seller-facing toggle. A store that has taken the
  // trouble to configure both a Pixel ID and a CAPI token should be considered
  // active. The meta_enabled flag is still honoured when explicitly true/false
  // for admin-level overrides once a toggle is exposed.
  const hasCredentials = Boolean(pixelId) && Boolean(accessToken)
  const adminEnabled = row.meta_enabled === true
  const adminDisabled = row.meta_enabled === false
  const enabled = adminEnabled || (!adminDisabled && hasCredentials)
  return {
    storeId:       String(row.id),
    storeSlug:     String(row.store_slug ?? ''),
    pixelId,
    accessToken,
    testEventCode: row.meta_test_event_code ? String(row.meta_test_event_code) : null,
    datasetId:     row.meta_dataset_id ? String(row.meta_dataset_id) : null,
    enabled,
  }
}

/**
 * Load a store's Meta config by its URL slug.
 * Used on public store pages (/store/{slug}).
 */
export async function getMetaConfigBySlug(slug: string): Promise<StoreMetaConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendors')
    .select(META_FIELDS.join(','))
    .eq('store_slug', slug)
    .maybeSingle()
  return rowToConfig(data as VendorRow | null)
}

/**
 * Load a store's Meta config by vendor UUID.
 * Used during order processing and authenticated API routes.
 */
export async function getMetaConfigById(vendorId: string): Promise<StoreMetaConfig | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendors')
    .select(META_FIELDS.join(','))
    .eq('id', vendorId)
    .maybeSingle()
  return rowToConfig(data as VendorRow | null)
}

/**
 * Load Meta configs for multiple vendors at once.
 * Used after order creation to fire CAPI for all vendors in the order.
 */
export async function getMetaConfigsByIds(vendorIds: string[]): Promise<StoreMetaConfig[]> {
  if (vendorIds.length === 0) return []
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('vendors')
    .select(META_FIELDS.join(','))
    .in('id', vendorIds)
  return ((data ?? []) as unknown as VendorRow[]).map(rowToConfig).filter((c): c is StoreMetaConfig => c !== null)
}

/**
 * Get the platform-level Meta config from environment variables.
 * Used for the platform's own pixel (homepage, non-store pages).
 */
export function getPlatformMetaConfig(): StoreMetaConfig | null {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!pixelId) return null
  return {
    storeId:       '__platform__',
    storeSlug:     '',
    pixelId,
    accessToken:   process.env.META_CAPI_TOKEN ?? null,
    testEventCode: null,
    datasetId:     null,
    enabled:       true,
  }
}

/**
 * Resolve active Meta config for the current request context.
 *
 * Priority:
 *   1. If storeSlug provided → load by slug
 *   2. If vendorId provided → load by ID
 *   3. Fallback → platform config from env
 */
export async function resolveMetaConfig(opts: {
  storeSlug?: string
  vendorId?:  string
}): Promise<StoreMetaConfig | null> {
  if (opts.storeSlug) {
    const config = await getMetaConfigBySlug(opts.storeSlug)
    if (config?.enabled && config.pixelId) return config
  }
  if (opts.vendorId) {
    const config = await getMetaConfigById(opts.vendorId)
    if (config?.enabled && config.pixelId) return config
  }
  const platform = getPlatformMetaConfig()
  if (platform?.enabled && platform.pixelId) return platform
  return null
}
