import { Product } from '@/types'

// Products are managed via the Admin panel and stored in Supabase.
// Add your products at /admin/products after setting up Supabase.
export const products: Product[] = []

export function getProductsByNiche(nicheId: string): Product[] {
  return products.filter((p) => p.nicheId === nicheId)
}

export function getFeaturedProducts(nicheId?: string): Product[] {
  const pool = nicheId ? getProductsByNiche(nicheId) : products
  return pool.filter((p) => p.isFeatured)
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.id !== product.id && p.nicheId === product.nicheId)
    .slice(0, limit)
}
