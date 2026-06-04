import type { MetadataRoute } from 'next'
import { niches } from '@/lib/data/niches'
import { products } from '@/lib/data/products'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shopdz.dz'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/auth`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  const nicheRoutes: MetadataRoute.Sitemap = niches.map((niche) => ({
    url: `${SITE_URL}/${niche.id}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/${product.nicheId}/${product.id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...nicheRoutes, ...productRoutes]
}
