'use server'

import { revalidateTag } from 'next/cache'
import { createAdminClient } from './admin'
import type { Product } from '@/types'
import { dbToProduct } from './products' // Import dbToProduct
import type { StoreSettings } from './settings'

// ── Product mutations ──────────────────────────────────────────

export async function upsertProduct(
  product: Omit<Product, 'rating' | 'reviewCount'>
): Promise<Product> { // Change return type to Product
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('products').upsert({
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
  }).select().single() // Chain .select() to return the upserted row
  if (error) throw error
  revalidateTag('products')
  return dbToProduct(data) // Map the returned data to Product type

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
