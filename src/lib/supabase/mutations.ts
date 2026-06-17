'use server'

import { revalidateTag } from 'next/cache'
import { createAdminClient } from './admin'
import type { Product } from '@/types'
import type { StoreSettings } from './settings'

// ── Product mutations ──────────────────────────────────────────

export async function upsertProduct(
  product: Omit<Product, 'rating' | 'reviewCount'>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').upsert({
    id:            product.id,
    niche_id:      product.nicheId,
    category:      product.category,
    name:          product.name,
    description:   product.description,
    price:         product.price,
    compare_price: product.comparePrice ?? null,
    images:        product.images,
    image_colors:  product.imageColors ?? [],
    stock:         product.stock,
    tags:          product.tags,
    is_new:        product.isNew ?? false,
    is_featured:   product.isFeatured ?? false,
    updated_at:    new Date().toISOString(),
  })
  if (error) throw error
  revalidateTag('products')
}

export async function updateProductExtras(
  id: string,
  extras: {
    vendor_id:          string
    condition?:         string | null
    meta_title?:        string | null
    meta_description?:  string | null
    is_pre_order?:      boolean
    pre_order_date?:    string | null
    min_order_quantity?: number
    is_bundle?:         boolean
    variants?:          unknown
    color_variants?:    unknown
  }
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').update(extras).eq('id', id)
  if (error) throw error
  revalidateTag('products')
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
  revalidateTag('products')
}

// ── Subscription limit check ───────────────────────────────────

/**
 * Checks whether a vendor can add another product based on their active
 * subscription plan's max_products limit.
 * Returns { allowed: true } when under limit, { allowed: false, count, limit }
 * when at or over the limit.
 * A limit of null/0 means unlimited.
 */
export async function checkVendorProductLimit(
  vendorId: string
): Promise<{ allowed: boolean; count: number; limit: number | null }> {
  const supabase = createAdminClient()

  // Count existing products for this vendor
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
  const currentCount = count ?? 0

  // Get vendor's active subscription plan
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_plan_id, subscription_status, subscription_expires_at')
    .eq('id', vendorId)
    .single()

  if (!vendor) return { allowed: true, count: currentCount, limit: null }

  // Expired or no subscription — cap at 10 products (free trial)
  const isActive =
    vendor.subscription_status === 'active' &&
    vendor.subscription_plan_id &&
    (!vendor.subscription_expires_at || new Date(vendor.subscription_expires_at) > new Date())

  if (!isActive) {
    const FREE_LIMIT = 10
    return { allowed: currentCount < FREE_LIMIT, count: currentCount, limit: FREE_LIMIT }
  }

  // Get plan's max_products
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('max_products')
    .eq('id', vendor.subscription_plan_id)
    .single()

  const limit = plan?.max_products && plan.max_products > 0 ? plan.max_products : null
  return { allowed: limit === null || currentCount < limit, count: currentCount, limit }
}

// ── Settings mutations ─────────────────────────────────────────

export async function saveStoreSettings(s: StoreSettings): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('store_settings').upsert({
    id:                      1,
    store_name:              s.storeName,
    store_email:             s.storeEmail,
    phone:                   s.phone,
    whatsapp_number:         s.whatsappNumber,
    free_shipping_threshold: s.freeShippingThreshold,
    zone1_cost:              s.zone1Cost,
    zone2_cost:              s.zone2Cost,
    zone3_cost:              s.zone3Cost,
    zone4_cost:              s.zone4Cost,
    cash_on_delivery:        s.cashOnDelivery,
    card_payment:            s.cardPayment,
    payment_ccp:             s.paymentCcp,
    payment_baridimob:       s.paymentBaridimob,
    payment_note:            s.paymentNote,
    announcement_text:       s.announcementText,
    announcement_active:     s.announcementActive,
    announcement_color:      s.announcementColor,
    updated_at:              new Date().toISOString(),
  })
  if (error) throw error
  revalidateTag('store-settings')
}
