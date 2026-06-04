import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { products, getProductById, getRelatedProducts } from '@/lib/data/products'
import { getNiche, isValidNiche } from '@/lib/data/niches'
import ProductDetails from './ProductDetails'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shopdz.dz'

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
  const niche = getNiche(nicheId)
  const desc = product.description || `${product.name} — ${niche?.name ?? ''} — Livraison dans toute l'Algérie.`
  return {
    title: `${product.name} | ${niche?.name ?? 'Casbah Store'}`,
    description: desc.slice(0, 160),
    alternates: { canonical: `${SITE_URL}/${nicheId}/${productId}` },
    openGraph: {
      title: `${product.name} — Casbah Store`,
      description: desc.slice(0, 300),
      url: `${SITE_URL}/${nicheId}/${productId}`,
      images: product.images[0] ? [{ url: product.images[0], width: 800, height: 800, alt: product.name }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: desc.slice(0, 200),
      images: product.images[0] ? [product.images[0]] : [],
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.id,
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'DZD',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: `${SITE_URL}/${nicheId}/${productId}`,
      seller: { '@type': 'Organization', name: 'Casbah Store' },
    },
    ...(product.rating > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 1,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  }

  return (
    <>
      <Script
        id="product-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetails product={product} niche={niche} related={related} />
    </>
  )
}
