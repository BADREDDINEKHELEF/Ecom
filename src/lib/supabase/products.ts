import { unstable_cache } from 'next/cache'
import { createClient } from './client'
import { createAdminClient } from './admin'
import { Product } from '@/types'

export function dbToProduct(row: Record<string, unknown>): Product {
  return {
    id:           String(row.id),
    nicheId:      String(row.niche_id),
    category:     String(row.category),
    name:         String(row.name),
    description:  String(row.description ?? ''),
    price:        Number(row.price),
    comparePrice: row.compare_price != null ? Number(row.compare_price) : undefined,
    images:       (row.images as string[]) ?? [],
    stock:        Number(row.stock ?? 0),
    rating:       Number(row.rating ?? 0),
    reviewCount:  Number(row.review_count ?? 0),
    tags:         (row.tags as string[]) ?? [],
    isNew:        Boolean(row.is_new),
    isFeatured:   Boolean(row.is_featured),
  }
}

export const getProducts = unstable_cache(
  async (nicheId?: string, category?: string): Promise<Product[]> => {
    const supabase = createClient()
    let query = supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (nicheId)  query = query.eq('niche_id', nicheId)
    if (category) query = query.eq('category', category)
    const { data, error } = await query
    if (error) throw error
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
      .select('*')
      .eq('is_featured', true)
      .gt('stock', 0)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (nicheId) query = query.eq('niche_id', nicheId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(dbToProduct)
  },
  ['products-featured'],
  { revalidate: 60, tags: ['products'] }
)

export const getProductById = unstable_cache(
  async (id: string): Promise<Product | null> => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return dbToProduct(data)
  },
  ['product-by-id'],
  { revalidate: 60, tags: ['products'] }
)


export async function getVendorProducts(vendorId: string): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToProduct)
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
  return (data ?? []).map(dbToProduct)
}
