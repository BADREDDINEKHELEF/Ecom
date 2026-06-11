import { unstable_cache } from 'next/cache'
import { createClient } from './client'
import { createAdminClient } from './admin'

export interface Review {
  id:          string
  product_id:  string
  author_name: string
  phone:       string | null
  rating:      number
  comment:     string
  is_verified: boolean
  created_at:  string
}

async function _getReviews(productId: string): Promise<Review[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, product_id, author_name, rating, comment, is_verified, created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Review[]
}

export const getReviews = unstable_cache(
  _getReviews,
  ['reviews'],
  { revalidate: 60, tags: ['reviews'] }
)

export async function addReview(
  review: Omit<Review, 'id' | 'is_verified' | 'created_at'>
): Promise<void> {
  const { revalidateTag } = await import('next/cache')
  const supabase = createAdminClient()
  const { error } = await supabase.from('reviews').insert(review)
  if (error) throw error
  revalidateTag('reviews')
}

export async function deleteReview(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
}

export async function verifyReview(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('reviews')
    .update({ is_verified: true })
    .eq('id', id)
  if (error) throw error
}
