import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Package, Star, BadgeCheck, Shield } from 'lucide-react'
import { getProductById } from '@/lib/supabase/products'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { formatPrice } from '@/lib/utils'
import StoreProductClient from './StoreProductClient'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

interface VendorExt {
  accent_color?: string | null
  verified_at?: string | null
  logo_url?: string | null
  social_whatsapp?: string | null
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, productId } = await params
  const product = await getProductById(productId)
  const vendor = await getVendorBySlug(slug)
  if (!product || !vendor) return { title: 'Produit introuvable' }
  return {
    title: `${product.name} — ${vendor.store_name}`,
    description: product.description?.slice(0, 160) ?? product.name,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export default async function StoreProductPage({ params }: PageProps) {
  const { slug, productId } = await params
  const [product, vendor] = await Promise.all([
    getProductById(productId),
    getVendorBySlug(slug),
  ])

  if (!product || !vendor) notFound()

  const v = vendor as typeof vendor & VendorExt
  const accent = v.accent_color ?? '#4f46e5'
  const vendorWhatsApp = v.social_whatsapp ?? null

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0
  const savings = hasDiscount ? product.comparePrice! - product.price : 0

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Store top bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {vendor.store_name}
          </Link>
          <div className="flex items-center gap-2">
            {v.logo_url && (
              <Image
                src={v.logo_url}
                alt={vendor.store_name}
                width={28}
                height={28}
                className="rounded-lg object-cover"
              />
            )}
            <span className="text-sm font-bold text-gray-900 hidden sm:block">{vendor.store_name}</span>
            {v.verified_at && <BadgeCheck className="w-4 h-4 text-amber-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">

            {/* ── Image column ──────────────────────────────────────── */}
            <div className="relative aspect-square bg-gray-100">
              {product.images?.[0] ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-300" />
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg">
                  -{discountPct}%
                </span>
              )}
              {product.isNew && (
                <span
                  className="absolute top-3 left-3 text-white text-xs font-black px-2 py-1 rounded-lg"
                  style={{ background: accent }}
                >
                  NOUVEAU
                </span>
              )}
            </div>

            {/* ── Info column ───────────────────────────────────────── */}
            <div className="p-6 flex flex-col gap-4">
              <h1 className="text-xl font-black text-gray-900 leading-tight">{product.name}</h1>

              {product.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">({product.reviewCount})</span>
                </div>
              )}

              {/* Price */}
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-gray-900">{formatPrice(product.price)}</span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
                  )}
                </div>
                {hasDiscount && savings > 0 && (
                  <p className="text-emerald-600 text-sm font-bold mt-0.5">
                    Vous économisez {formatPrice(savings)} 🎉
                  </p>
                )}
              </div>

              {/* Stock */}
              {product.stock > 0 && product.stock <= 15 && (
                <div>
                  <p className="text-sm text-amber-600 font-semibold mb-1.5">
                    {product.stock <= 5
                      ? `⚡ Seulement ${product.stock} en stock — dépêchez-vous !`
                      : `Seulement ${product.stock} en stock`}
                  </p>
                  <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (product.stock / 15) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {product.stock === 0 && (
                <p className="text-sm text-red-500 font-semibold">Rupture de stock</p>
              )}

              {product.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              )}

              {/* CTA buttons */}
              <StoreProductClient
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.images?.[0] ?? '',
                  stock: product.stock,
                  nicheId: product.nicheId,
                }}
                accent={accent}
                vendorWhatsApp={vendorWhatsApp}
                storeName={vendor.store_name}
              />

              {/* COD trust badge */}
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mt-1">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">Paiement à la livraison</p>
                  <p className="text-xs text-green-700">Payez cash quand vous recevez votre commande</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          {product.images.length > 1 && (
            <div className="flex gap-3 p-4 border-t border-gray-100 overflow-x-auto">
              {product.images.slice(1).map((img, i) => (
                <div
                  key={i}
                  className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 relative"
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
