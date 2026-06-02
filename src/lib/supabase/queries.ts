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

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
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

  return order.id
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

export async function getAllOrders(): Promise<OrderRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as OrderRow[]
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  if (error) throw error
}
