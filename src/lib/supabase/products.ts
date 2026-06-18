import { unstable_cache } from 'next/cache'
import { createClient } from './client'
import { createAdminClient } from './admin'
import { Product, ColorVariant } from '@/types'

export function dbToProduct(row: Record<string, unknown>): Product {
  return {
    id:              String(row.id),
    nicheId:         String(row.niche_id),
    category:        String(row.category),
    name:            String(row.name),
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
    const { data, error } = await supabase
      .from('products')
      .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,total_orders,created_at')
      .eq('id', id)
      .single()
    if (error || !data) return null

    const product = dbToProduct(data)

    // Fetch color_variants separately — column may not exist yet before migration 029
    const { data: cv } = await supabase
      .from('products')
      .select('color_variants')
      .eq('id', id)
      .single()
    if (cv && Array.isArray(cv.color_variants)) {
      product.colorVariants = cv.color_variants as ColorVariant[]
    }

    return product
  },
  ['product-by-id'],
  { revalidate: 60, tags: ['products'] }
)


export async function getVendorProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,image_colors,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,created_at')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const products = (data ?? []).map(dbToProduct)

  // Fetch color_variants separately so edit form preserves them (migration_029)
  if (products.length > 0) {
    const ids = products.map(p => p.id)
    const { data: cvData } = await supabase
      .from('products')
      .select('id,color_variants')
      .in('id', ids)
    if (cvData) {
      const cvMap = new Map(cvData.map((r: Record<string, unknown>) => [r.id as string, r.color_variants]))
      for (const p of products) {
        const cv = cvMap.get(p.id)
        if (Array.isArray(cv)) p.colorVariants = cv as ColorVariant[]
      }
    }
  }

  return products
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
