'use server'

import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { createAdminClient } from './admin'
import { createServerActionClient } from './server'
import type { Product, ProductVariant } from '@/types'
import { dbToProduct } from './products' // Import dbToProduct
import type { StoreSettings } from './settings'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { getAdminCookieName } from '@/cookie'

// ── Auth helpers for server actions ────────────────────────────

export interface MutationAuth {
  /** Bypass vendor ownership checks (admin only). Verified server-side. */
  isAdmin?: boolean
}

async function getSessionVendorId(): Promise<string | null> {
  const supabase = await createServerActionClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  return data?.id ?? null
}

async function requireSessionVendorId(): Promise<string> {
  const vendorId = await getSessionVendorId()
  if (!vendorId) {
    throw new Error('Session vendeur invalide')
  }
  return vendorId
}

async function verifyAdminCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(getAdminCookieName())?.value
  if (!token) return false

  const payload = await verifyAdminToken(token)
  if (!payload) return false

  if (payload.jti) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('admin_revoked_tokens')
      .select('jti')
      .eq('jti', payload.jti)
      .maybeSingle()
    if (data !== null) return false
  }

  return true
}

async function resolveMutationAuth(auth: MutationAuth): Promise<{ vendorId?: string; isAdmin: boolean }> {
  if (auth.isAdmin) {
    const ok = await verifyAdminCookie()
    if (!ok) {
      throw new Error('Session admin invalide')
    }
    return { isAdmin: true }
  }
  const vendorId = await requireSessionVendorId()
  return { vendorId, isAdmin: false }
}

async function verifyProductOwnership(
  productId: string,
  vendorId: string
): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('products')
    .select('vendor_id')
    .eq('id', productId)
    .maybeSingle()
  if (error) {
    throw new Error('Erreur de base de données lors de la vérification de propriété')
  }
  if (data && data.vendor_id !== vendorId) {
    throw new Error('Action non autorisée sur ce produit')
  }
}

function validateProductInput(product: Omit<Product, 'rating' | 'reviewCount'>) {
  if (!product.name || product.name.trim().length === 0) {
    throw new Error('Le nom du produit est requis')
  }
  if (typeof product.price !== 'number' || product.price < 0 || !Number.isFinite(product.price)) {
    throw new Error('Le prix doit être un nombre positif')
  }
  if (product.comparePrice !== undefined && product.comparePrice !== null && product.comparePrice < product.price) {
    throw new Error('Le prix barré doit être supérieur au prix actuel')
  }
  if (typeof product.stock !== 'number' || product.stock < 0 || !Number.isFinite(product.stock)) {
    throw new Error('Le stock doit être un nombre positif')
  }
}

function validateVariants(value: unknown): value is ProductVariant[] {
  if (!Array.isArray(value)) return false
  return value.every((v) => (
    v &&
    typeof v.id === 'string' &&
    typeof v.options === 'object' && v.options !== null &&
    typeof v.price === 'number' && v.price >= 0 && Number.isFinite(v.price) &&
    typeof v.stock === 'number' && v.stock >= 0 && Number.isFinite(v.stock) &&
    typeof v.sku === 'string'
  ))
}

// ── Product mutations ──────────────────────────────────────────

export async function upsertProduct(
  product: Omit<Product, 'rating' | 'reviewCount'>,
  auth: MutationAuth = {}
): Promise<Product> {
  const admin = createAdminClient()
  const ctx = await resolveMutationAuth(auth)

  validateProductInput(product)

  if (!ctx.vendorId && !ctx.isAdmin) {
    throw new Error('Session vendeur invalide: impossible de déterminer le vendorId. Déconnectez-vous et reconnectez-vous.')
  }

  let vendorId = ctx.vendorId
  if (ctx.isAdmin) {
    vendorId = product.vendorId
  } else if (product.vendorId && product.vendorId !== vendorId) {
    throw new Error('Action non autorisée sur ce produit')
  }

  if (!vendorId && !product.id) {
    throw new Error('vendorId requis pour créer un produit')
  }

  // Verify ownership when updating an existing product
  if (product.id && !ctx.isAdmin) {
    await verifyProductOwnership(product.id, vendorId!)
  }

  const { data, error } = await admin.from('products').upsert({
    id:            product.id,
    niche_id:      product.nicheId,
    category:      product.category,
    name:          product.name.trim(),
    description:   product.description,
    price:         product.price,
    compare_price: product.comparePrice ?? null,
    images:        product.images,
    image_colors:  product.imageColors ?? [],
    stock:         product.stock,
    tags:          product.tags,
    is_new:        product.isNew ?? false,
    is_featured:   product.isFeatured ?? false,
    vendor_id:     vendorId ?? null,
    updated_at:    new Date().toISOString(),
    // New products default to active. Updates preserve the existing is_active
    // unless the caller explicitly provides it.
    ...((product as typeof product & { isActive?: boolean }).isActive !== undefined
      ? { is_active: (product as typeof product & { isActive?: boolean }).isActive }
      : product.id ? {} : { is_active: true }),
  }).select().single() // Chain .select() to return the upserted row
  if (error) throw error
  revalidateTag('products')
  return dbToProduct(data) // Map the returned data to Product type
}

export async function updateProductExtras(
  id: string,
  extras: {
    vendor_id?:          string
    condition?:         string | null
    meta_title?:        string | null
    meta_description?:  string | null
    is_pre_order?:      boolean
    pre_order_date?:    string | null
    min_order_quantity?: number
    is_bundle?:         boolean
    variants?:          unknown
    color_variants?:    unknown
  },
  auth: MutationAuth = {}
): Promise<void> {
  const ctx = await resolveMutationAuth(auth)
  if (!ctx.isAdmin) {
    await verifyProductOwnership(id, ctx.vendorId!)
  }

  // Prevent caller from changing the vendor_id via extras
  const safeExtras = { ...extras }
  delete (safeExtras as { vendor_id?: string }).vendor_id

  // Validate variant arrays before persisting
  if (safeExtras.variants != null && !validateVariants(safeExtras.variants)) {
    throw new Error('Format de variantes invalide')
  }
  if (
    safeExtras.color_variants != null &&
    (!Array.isArray(safeExtras.color_variants) ||
      !safeExtras.color_variants.every(
        (v) => v && typeof v.name === 'string' && typeof v.hex === 'string' && Array.isArray(v.images)
      ))
  ) {
    throw new Error('Format de variantes de couleur invalide')
  }

  const admin = createAdminClient()
  const { error } = await admin.from('products').update(safeExtras).eq('id', id)
  if (error) throw error
  revalidateTag('products')
}

export async function deleteProduct(id: string, auth: MutationAuth = {}): Promise<void> {
  const ctx = await resolveMutationAuth(auth)
  if (!ctx.isAdmin) {
    await verifyProductOwnership(id, ctx.vendorId!)
  }
  const admin = createAdminClient()
  const { error } = await admin.from('products').delete().eq('id', id)
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
