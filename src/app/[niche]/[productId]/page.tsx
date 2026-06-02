import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { products, getProductById, getRelatedProducts } from '@/lib/data/products'
import { getNiche, isValidNiche } from '@/lib/data/niches'
import ProductDetails from './ProductDetails'

interface PageProps {
  params: Promise<{ niche: string; productId: string }>
}

export function generateStaticParams() {
  return products.map((p) => ({ niche: p.nicheId, productId: p.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { niche: nicheId, productId } = await params
  const product = getProductById(productId)
  if (!product || product.nicheId !== nicheId) return {}
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} | ShopDZ`,
      description: product.description,
      images: [{ url: product.images[0], width: 600, height: 600 }],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { niche: nicheId, productId } = await params

  if (!isValidNiche(nicheId)) notFound()

  const product = getProductById(productId)
  if (!product || product.nicheId !== nicheId) notFound()

  const niche = getNiche(nicheId)!
  const related = getRelatedProducts(product)

  return <ProductDetails product={product} niche={niche} related={related} />
}
