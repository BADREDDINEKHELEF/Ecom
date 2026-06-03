import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { niches, getNiche, isValidNiche } from '@/lib/data/niches'
import NicheShell from '@/components/shop/NicheShell'
import { getProducts } from '@/lib/supabase/queries'
import { Product } from '@/types'

export const revalidate = 60

interface PageProps {
  params: Promise<{ niche: string }>
  searchParams: Promise<{ category?: string; sort?: string }>
}

export function generateStaticParams() {
  return niches.map((n) => ({ niche: n.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { niche: nicheId } = await params
  if (!isValidNiche(nicheId)) return {}
  const niche = getNiche(nicheId)!
  return {
    title: `${niche.name} — Casbah Store`,
    description: `${niche.description} Livraison rapide dans toute l'Algérie.`,
    openGraph: {
      title: `${niche.name} | Casbah Store`,
      description: niche.description,
      images: [{ url: niche.banner, width: 1200, height: 630 }],
    },
  }
}

export default async function NichePage({ params, searchParams }: PageProps) {
  const { niche: nicheId } = await params
  const { category, sort } = await searchParams

  if (!isValidNiche(nicheId)) notFound()

  let products: Product[] = []
  try {
    const all = await getProducts()
    products = all.filter((p) => p.nicheId === nicheId)
  } catch {
    products = []
  }

  if (category) products = products.filter((p) => p.category === category)

  if (sort === 'price-asc')  products = [...products].sort((a, b) => a.price - b.price)
  else if (sort === 'price-desc') products = [...products].sort((a, b) => b.price - a.price)
  else if (sort === 'rating')     products = [...products].sort((a, b) => b.rating - a.rating)
  else if (sort === 'new')        products = [...products].sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1))

  return <NicheShell nicheId={nicheId} category={category} products={products} />
}
