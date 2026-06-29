import type { MetadataRoute } from 'next'
import { niches } from '@/lib/data/niches'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  let dbProducts: { id: string; niche_id: string; created_at: string }[] = []
  let vendors: { store_slug: string; created_at: string }[] = []
  let storeProducts: { id: string; store_slug: string; created_at: string }[] = []

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createAdminClient()
    const [productsResult, vendorsResult, storeProductsResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, niche_id, created_at')
        .eq('is_active', true)
        .limit(10000),
      supabase
        .from('vendors')
        .select('store_slug, created_at')
        .eq('is_approved', true)
        .eq('is_active', true)
        .limit(5000),
      supabase
        .from('products')
        .select('id, created_at, vendors!inner(store_slug)')
        .eq('is_active', true)
        .limit(50000),
    ])
    dbProducts = productsResult.data ?? []
    vendors = vendorsResult.data ?? []
    storeProducts = (storeProductsResult.data ?? []).map((row: { id: string; created_at: string; vendors: { store_slug: string } | { store_slug: string }[] }) => ({
      id: row.id,
      created_at: row.created_at,
      store_slug: Array.isArray(row.vendors) ? row.vendors[0]?.store_slug : (row.vendors as { store_slug: string })?.store_slug,
    })).filter((row) => row.store_slug)
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
  ]

  const nicheRoutes: MetadataRoute.Sitemap = niches.map((niche) => ({
    url:             `${SITE_URL}/${niche.id}`,
    lastModified:    now,
    changeFrequency: 'daily',
    priority:        0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = dbProducts.map((p) => ({
    url:             `${SITE_URL}/${p.niche_id}/${p.id}`,
    lastModified:    new Date(p.created_at),
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  const storeRoutes: MetadataRoute.Sitemap = vendors.map((v) => ({
    url:             `${SITE_URL}/store/${v.store_slug}`,
    lastModified:    new Date(v.created_at),
    changeFrequency: 'weekly',
    priority:        0.6,
  }))

  const storeProductRoutes: MetadataRoute.Sitemap = storeProducts.map((p) => ({
    url:             `${SITE_URL}/store/${p.store_slug}/${p.id}`,
    lastModified:    new Date(p.created_at),
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  return [...staticRoutes, ...nicheRoutes, ...productRoutes, ...storeRoutes, ...storeProductRoutes]
}
