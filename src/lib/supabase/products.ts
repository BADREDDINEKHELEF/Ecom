import { unstable_cache } from 'next/cache'
import { createClient } from './client'
import { createAdminClient } from './admin'
import { Product, ColorVariant } from '@/types'
import { normalizePhone } from '@/lib/utils/phone'

export function dbToProduct(row: Record<string, unknown>): Product {
  return {
    id:              String(row.id),
    nicheId:         row.niche_id != null ? String(row.niche_id) : '',
    category:        row.category != null ? String(row.category) : '',
    name:            row.name != null ? String(row.name) : '',
    description:     String(row.description ?? ''),
    price:           Number(row.price),
    comparePrice:    row.compare_price != null ? Number(row.compare_price) : undefined,
    images:          (row.images as string[]) ?? [],
    imageColors:     (row.image_colors as string[] | null)?.length ? (row.image_colors as string[]) : undefined,
    stock:           Number(row.stock ?? 0),
    rating:          Number(row.rating ?? 0),
    reviewCount:     Number(row.review_count ?? 0),
    tags:            (row.tags as string[]) ?? [],
    isNew:           Boolean(row.is_new),
    isFeatured:      Boolean(row.is_featured),
    condition:         (row.condition as 'new' | 'used' | 'refurbished') ?? 'new',
    metaTitle:         row.meta_title != null ? String(row.meta_title) : undefined,
    metaDescription:   row.meta_description != null ? String(row.meta_description) : undefined,
    isPreOrder:        Boolean(row.is_pre_order),
    preOrderDate:      row.pre_order_date != null ? String(row.pre_order_date) : undefined,
    minOrderQuantity:  row.min_order_quantity != null ? Number(row.min_order_quantity) : 1,
    isBundle:          Boolean(row.is_bundle),
    colorVariants:     Array.isArray(row.color_variants) ? (row.color_variants as ColorVariant[]) : [],
    totalOrders:       row.total_orders != null ? Number(row.total_orders) : undefined,
    vendorId:          row.vendor_id != null ? String(row.vendor_id) : undefined,
  }
}

export const getProducts = unstable_cache(
  async (nicheId?: string, category?: string): Promise<Product[]> => {
    const supabase = createClient()
    let query = supabase
      .from('products')
      .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,created_at')
      .order('created_at', { ascending: false })
    if (nicheId)  query = query.eq('niche_id', nicheId)
    if (category) query = query.eq('category', category)
    const { data, error } = await query
    if (error) return []
    return (data ?? []).map(dbToProduct)
  },
  ['products-list'],
  { revalidate: 60, tags: ['products'] }
)

export const getFeaturedProducts = unstable_cache(
  async (nicheId?: string, limit = 8): Promise<Product[]> => {
    const supabase = createClient()
    let query = supabase
      .from('products')
      .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,created_at')
      .eq('is_featured', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (nicheId) query = query.eq('niche_id', nicheId)
    const { data, error } = await query
    if (error) return []
    return (data ?? []).map(dbToProduct)
  },
  ['products-featured'],
  { revalidate: 60, tags: ['products'] }
)

export const getProductById = unstable_cache(
  async (id: string): Promise<Product | null> => {
    const supabase = createAdminClient()
    let data: Record<string, unknown> | null = null
    let error: unknown = null

    try {
      const result = await supabase
        .from('products')
        .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,color_variants,created_at')
        .eq('id', id)
        .single()
      data = result.data as Record<string, unknown> | null
      error = result.error
    } catch {
      const result = await supabase
        .from('products')
        .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,created_at')
        .eq('id', id)
        .single()
      data = result.data as Record<string, unknown> | null
      error = result.error
    }

    if (error || !data) return null

    return dbToProduct(data)
  },
  ['product-by-id'],
  { revalidate: 60, tags: ['products'] }
)


export async function getVendorPhoneByProductId(productId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('products')
    .select('vendor_id')
    .eq('id', productId)
    .single()
  if (!row?.vendor_id) return null
  const { data: vendor } = await supabase
    .from('vendors')
    .select('phone, social_whatsapp')
    .eq('id', row.vendor_id)
    .single()
  if (!vendor) return null
  const raw = (vendor.social_whatsapp || vendor.phone) as string | null
  if (!raw) return null
  try {
    // Use the centralized, robust phone normalization utility.
    return normalizePhone(raw)
  } catch (error) {
    console.error(`Failed to normalize vendor phone for product ${productId}:`, error)
    // Return null if the stored number is invalid, maintaining function signature.
    return null
  }
}

export async function getVendorProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,color_variants,created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map(dbToProduct)
}

export async function getVendorPublicProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,created_at')
    .eq('vendor_id', vendorId)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToProduct)
}
