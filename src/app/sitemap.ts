import type { MetadataRoute } from 'next'
import { niches } from '@/lib/data/niches'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shopdz.dz'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const supabase = createAdminClient()

  const [{ data: dbProducts }, { data: vendors }] = await Promise.all([
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
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,              lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/auth`,    lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/orders`,  lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const nicheRoutes: MetadataRoute.Sitemap = niches.map((niche) => ({
    url:             `${SITE_URL}/${niche.id}`,
    lastModified:    now,
    changeFrequency: 'daily',
    priority:        0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = (dbProducts ?? []).map((p) => ({
    url:             `${SITE_URL}/${p.niche_id}/${p.id}`,
    lastModified:    new Date(p.created_at),
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  const storeRoutes: MetadataRoute.Sitemap = (vendors ?? []).map((v) => ({
    url:             `${SITE_URL}/store/${v.store_slug}`,
    lastModified:    new Date(v.created_at),
    changeFrequency: 'weekly',
    priority:        0.6,
  }))

  return [...staticRoutes, ...nicheRoutes, ...productRoutes, ...storeRoutes]
}
