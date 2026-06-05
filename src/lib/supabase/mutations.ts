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
    stock:         product.stock,
    tags:          product.tags,
    is_new:        product.isNew ?? false,
    is_featured:   product.isFeatured ?? false,
    updated_at:    new Date().toISOString(),
  })
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
    updated_at:              new Date().toISOString(),
  })
  if (error) throw error
  revalidateTag('store-settings')
}
