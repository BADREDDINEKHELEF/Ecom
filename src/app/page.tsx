import { niches } from '@/lib/data/niches'
import { getFeaturedProducts } from '@/lib/supabase/products'
import HomepageContent from '@/components/home/HomepageContent'

export const revalidate = 60

export default async function HomePage() {
  const [featured, ...nicheFeatured] = await Promise.all([
    getFeaturedProducts(undefined, 8),
    ...niches.map((n) => getFeaturedProducts(n.id, 4)),
  ])

  const nicheProducts = Object.fromEntries(
    niches.map((n, i) => [n.id, nicheFeatured[i]])
  )

  return <HomepageContent featured={featured} nicheProducts={nicheProducts} />
}
