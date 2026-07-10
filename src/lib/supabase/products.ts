import { unstable_cache } from 'next/cache'
import { createAdminClient } from './admin'
import { Product, ColorVariant, ProductVariant } from '@/types'
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
    variants:          Array.isArray(row.variants) ? (row.variants as ProductVariant[]) : undefined,
    totalOrders:       row.total_orders != null ? Number(row.total_orders) : undefined,
    vendorId:          row.vendor_id != null ? String(row.vendor_id) : undefined,
  }
}

export const getProducts = unstable_cache(
  async (nicheId?: string, category?: string): Promise<Product[]> => {
    // Public catalog; admin client so cached reads work reliably server-side.
    const supabase = createAdminClient()
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
    const supabase = createAdminClient()
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
        .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,color_variants,created_at')
        .eq('id', id)
        .single()
      data = result.data as Record<string, unknown> | null
      error = result.error
    }

    if (error || !data) return null

    return dbToProduct(data)
  },
  ['product-by-id-v2'],
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

export interface VendorProductsPage {
  products: Product[]
  total: number
  totalPages: number
}

export async function getVendorProducts(vendorId: string): Promise<Product[]> {
  // Called from seller server components; admin client is safe because the
  // caller has already verified the vendor identity.
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,color_variants,created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map(dbToProduct)
}

export async function getVendorProductsPaginated(
  vendorId: string,
  options: {
    page?: number
    limit?: number
    search?: string
    sortBy?: 'created_at' | 'name' | 'price' | 'stock'
    sortOrder?: 'asc' | 'desc'
  } = {}
): Promise<VendorProductsPage> {
  const {
    page = 1,
    limit = 20,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options
  const supabase = createAdminClient()

  let query = supabase
    .from('products')
    .select(
      'id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,color_variants,created_at',
      { count: 'exact' }
    )
    .eq('vendor_id', vendorId)

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  if (error) throw error

  const total = count ?? 0
  return {
    products: (data ?? []).map(dbToProduct),
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export interface SearchProductsPage {
  products: Product[]
  total: number
  totalPages: number
}

export async function searchProducts(
  query: string,
  options: { page?: number; limit?: number } = {}
): Promise<SearchProductsPage> {
  const { page = 1, limit = 24 } = options
  const supabase = createAdminClient()

  const q = query.trim()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let dbQuery = supabase
    .from('products')
    .select(
      'id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,created_at',
      { count: 'exact' }
    )
    .eq('is_active', true)

  if (q) {
    // Escape PostgREST wildcard (%) so the query cannot be broadened by user input,
    // and remove characters that would break the filter grammar (, { } ).
    const safeQ = q.replace(/%/g, '\\%').replace(/[,{}]/g, '')
    dbQuery = dbQuery.or(`name.ilike.%${safeQ}%,description.ilike.%${safeQ}%,category.ilike.%${safeQ}%,tags.cs.{${safeQ}}`)
  }

  const { data, error, count } = await dbQuery
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const total = count ?? 0
  return {
    products: (data ?? []).map(dbToProduct),
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getVendorPublicProducts(vendorId: string): Promise<Product[]> {
  // Public store catalog; use admin client so it works reliably in SSR.
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,created_at')
    .eq('vendor_id', vendorId)
    .gt('stock', 0)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToProduct)
}
