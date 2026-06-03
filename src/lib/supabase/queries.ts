import { createClient } from './client'
import { Product } from '@/types'

// ─── Products ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToProduct(row: any): Product {
  return {
    id: row.id,
    nicheId: row.niche_id,
    category: row.category,
    name: row.name,
    description: row.description || '',
    price: row.price,
    comparePrice: row.compare_price ?? undefined,
    images: row.images || [],
    stock: row.stock || 0,
    rating: row.rating || 0,
    reviewCount: row.review_count || 0,
    tags: row.tags || [],
    isNew: row.is_new || false,
    isFeatured: row.is_featured || false,
  }
}

export async function getProducts(nicheId?: string, category?: string): Promise<Product[]> {
  const supabase = createClient()
  let query = supabase.from('products').select('*').order('created_at', { ascending: false })
  if (nicheId) query = query.eq('niche_id', nicheId)
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(dbToProduct)
}

export async function upsertProduct(product: Omit<Product, 'rating' | 'reviewCount'>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    niche_id: product.nicheId,
    category: product.category,
    name: product.name,
    description: product.description,
    price: product.price,
    compare_price: product.comparePrice ?? null,
    images: product.images,
    stock: product.stock,
    tags: product.tags,
    is_new: product.isNew ?? false,
    is_featured: product.isFeatured ?? false,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItemRow {
  id: string
  product_id: string
  product_name: string
  product_image: string | null
  product_price: number
  quantity: number
  subtotal: number
}

export interface OrderRow {
  id: string
  full_name: string
  phone: string
  wilaya: string
  city: string
  address: string
  payment_method: string
  status: string
  subtotal: number
  shipping_cost: number
  total: number
  discount_amount?: number
  delivery_outcome?: string | null
  delivery_provider?: string | null
  yalidine_tracking?: string | null
  yalidine_label_url?: string | null
  created_at: string
  order_items?: OrderItemRow[]
}

export interface CreateOrderInput {
  fullName: string
  phone: string
  wilaya: string
  city: string
  address: string
  paymentMethod: string
  subtotal: number
  shippingCost: number
  total: number
  promoCodeId?: string
  discountAmount?: number
  items: {
    productId: string
    productName: string
    productImage: string
    productPrice: number
    quantity: number
    subtotal: number
  }[]
}

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/-/g, '')
}

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const supabase = createClient()
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      full_name: input.fullName,
      phone: normalizePhone(input.phone),
      wilaya: input.wilaya,
      city: input.city,
      address: input.address,
      payment_method: input.paymentMethod,
      subtotal: input.subtotal,
      shipping_cost: input.shippingCost,
      total: input.total,
      promo_code_id: input.promoCodeId ?? null,
      discount_amount: input.discountAmount ?? 0,
    })
    .select('id')
    .single()
  if (orderErr) throw orderErr

  const { error: itemsErr } = await supabase.from('order_items').insert(
    input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      product_image: item.productImage || null,
      product_price: item.productPrice,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }))
  )
  if (itemsErr) throw itemsErr

  if (input.promoCodeId) {
    // fire-and-forget: increment usage count
    void supabase.rpc('increment_promo_uses', { promo_id: input.promoCodeId })
  }

  return order.id
}

// ─── Promo Codes ──────────────────────────────────────────────────────────────

export interface PromoCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export async function validatePromoCode(
  code: string,
  orderTotal: number
): Promise<{ valid: true; promo: PromoCode; discountAmount: number } | { valid: false; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !data) return { valid: false, message: 'invalid' }

  const promo = data as PromoCode

  if (promo.expires_at && new Date(promo.expires_at) < new Date())
    return { valid: false, message: 'expired' }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses)
    return { valid: false, message: 'maxed' }

  if (orderTotal < promo.min_order)
    return { valid: false, message: 'min_order' }

  const discountAmount =
    promo.discount_type === 'percentage'
      ? Math.round((orderTotal * promo.discount_value) / 100)
      : Math.min(promo.discount_value, orderTotal)

  return { valid: true, promo, discountAmount }
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as PromoCode[]
}

export async function upsertPromoCode(promo: Omit<PromoCode, 'id' | 'uses_count' | 'created_at'>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('promo_codes').upsert({
    ...promo,
    code: promo.code.toUpperCase().trim(),
  })
  if (error) throw error
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('promo_codes').update({ is_active: isActive }).eq('id', id)
  if (error) throw error
}

export async function deletePromoCode(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) throw error
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  product_id: string
  author_name: string
  phone: string | null
  rating: number
  comment: string
  is_verified: boolean
  created_at: string
}

export async function getReviews(productId: string): Promise<Review[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Review[]
}

export async function addReview(review: Omit<Review, 'id' | 'is_verified' | 'created_at'>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('reviews').insert(review)
  if (error) throw error

  // Recalculate product rating
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', review.product_id)

  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    await supabase
      .from('products')
      .update({ rating: Math.round(avg * 10) / 10, review_count: reviews.length })
      .eq('id', review.product_id)
  }
}

// ─── COD Analytics ────────────────────────────────────────────────────────────

export interface CodStats {
  total: number
  delivered: number
  failed: number
  returned: number
  pending: number
}

export async function getCodStats(): Promise<CodStats> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('delivery_outcome')
    .eq('payment_method', 'cash')
  if (error) throw error
  const rows = data || []
  return {
    total: rows.length,
    delivered: rows.filter((r) => r.delivery_outcome === 'delivered').length,
    failed: rows.filter((r) => r.delivery_outcome === 'failed').length,
    returned: rows.filter((r) => r.delivery_outcome === 'returned').length,
    pending: rows.filter((r) => r.delivery_outcome === null).length,
  }
}

export async function updateYalidineTracking(id: string, tracking: string, labelUrl?: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({ yalidine_tracking: tracking, ...(labelUrl ? { yalidine_label_url: labelUrl } : {}) })
    .eq('id', id)
  if (error) throw error
}

export async function updateShippingInfo(
  id: string,
  tracking: string,
  provider: string,
  labelUrl?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('orders')
    .update({
      yalidine_tracking: tracking,
      delivery_provider: provider,
      ...(labelUrl ? { yalidine_label_url: labelUrl } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateDeliveryOutcome(id: string, outcome: 'delivered' | 'failed' | 'returned'): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update({ delivery_outcome: outcome }).eq('id', id)
  if (error) throw error
}

// ─── Vendors ──────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string
  user_id: string
  store_name: string
  store_slug: string
  logo_url: string | null
  description: string | null
  phone: string | null
  wilaya: string | null
  commission_rate: number
  is_approved: boolean
  is_active: boolean
  created_at: string
}

export async function getVendorByUserId(userId: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase.from('vendors').select('*').eq('user_id', userId).single()
  return (data as Vendor) || null
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const supabase = createClient()
  const { data } = await supabase.from('vendors').select('*').eq('store_slug', slug).eq('is_active', true).single()
  return (data as Vendor) || null
}

export async function createVendor(
  vendor: Omit<Vendor, 'id' | 'commission_rate' | 'is_approved' | 'is_active' | 'created_at'>
): Promise<Vendor> {
  const supabase = createClient()
  const { data, error } = await supabase.from('vendors').insert(vendor).select().single()
  if (error) throw error
  return data as Vendor
}

export async function updateVendor(id: string, updates: Partial<Omit<Vendor, 'id' | 'user_id' | 'created_at'>>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('vendors').update(updates).eq('id', id)
  if (error) throw error
}

export async function getAllVendors(): Promise<Vendor[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Vendor[]
}

export async function getVendorProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(dbToProduct)
}

export async function getVendorPublicProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(dbToProduct)
}

export interface VendorOrderSummary {
  order: OrderRow
  items: OrderItemRow[]
  vendorTotal: number
}

export async function getVendorOrders(vendorId: string): Promise<VendorOrderSummary[]> {
  const supabase = createClient()
  // Get all product IDs belonging to this vendor
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('vendor_id', vendorId)
  if (!products || products.length === 0) return []

  const productIds = products.map((p) => p.id)

  // Get order_items for those products
  const { data: items } = await supabase
    .from('order_items')
    .select('*, orders(*)')
    .in('product_id', productIds)
    .order('orders(created_at)', { ascending: false })

  if (!items) return []

  // Group by order
  const grouped = new Map<string, { order: OrderRow; items: OrderItemRow[] }>()
  for (const item of items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = (item as any).orders as OrderRow
    if (!order) continue
    if (!grouped.has(order.id)) grouped.set(order.id, { order, items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grouped.get(order.id)!.items.push(item as any as OrderItemRow)
  }

  return Array.from(grouped.values()).map(({ order, items }) => ({
    order,
    items,
    vendorTotal: items.reduce((s, i) => s + i.subtotal, 0),
  }))
}

export async function getOrdersByPhone(phone: string): Promise<OrderRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('phone', normalizePhone(phone))
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as OrderRow[]
}

export async function getAllOrders(page = 0, pageSize = 50): Promise<{ orders: OrderRow[]; hasMore: boolean }> {
  const supabase = createClient()
  const from = page * pageSize
  const to = from + pageSize
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  const orders = (data || []) as OrderRow[]
  return { orders: orders.slice(0, pageSize), hasMore: orders.length > pageSize }
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}
