import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, BadgeCheck, Shield, Truck, RotateCcw,
  Star, Package, Eye,
} from 'lucide-react'
import { getProductById } from '@/lib/supabase/products'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import ProductGallery from './ProductGallery'
import StoreProductClient from './StoreProductClient'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

interface VendorExt {
  accent_color?: string | null
  verified_at?: string | null
  logo_url?: string | null
  social_whatsapp?: string | null
  description?: string | null
}

async function getRelatedProducts(vendorId: string, excludeId: string): Promise<Product[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('is_active', true)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(4)
  return (data ?? []).map(dbToProduct)
}

export async function generateMetadata({ params }: PageProps) {
  const { slug, productId } = await params
  const product = await getProductById(productId)
  const vendor  = await getVendorBySlug(slug)
  if (!product || !vendor) return { title: 'Produit introuvable' }
  return {
    title:       product.metaTitle ?? `${product.name} — ${vendor.store_name}`,
    description: product.metaDescription ?? product.description?.slice(0, 160) ?? product.name,
    openGraph: {
      title:  product.name,
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
  const accent        = v.accent_color       ?? '#4f46e5'
  const vendorWhatsApp = v.social_whatsapp   ?? null

  const related = await getRelatedProducts(vendor.id, productId)

  const hasDiscount  = product.comparePrice && product.comparePrice > product.price
  const discountPct  = hasDiscount ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100) : 0
  const savings      = hasDiscount ? product.comparePrice! - product.price : 0
  const viewers      = Math.floor(Math.random() * 13) + 4   // 4-16

  const waHref = vendorWhatsApp
    ? `https://wa.me/${vendorWhatsApp.replace(/\D/g, '')}`
    : null

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* ── Sticky store top bar ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:block">{vendor.store_name}</span>
            <span className="sm:hidden">Boutique</span>
          </Link>

          <div className="flex items-center gap-2">
            {v.logo_url && (
              <Image
                src={v.logo_url}
                alt={vendor.store_name}
                width={30}
                height={30}
                className="rounded-xl object-cover"
              />
            )}
            <span className="text-sm font-black text-gray-900 hidden sm:block">{vendor.store_name}</span>
            {v.verified_at && <BadgeCheck className="w-4 h-4 text-amber-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">

        {/* ── Two-column layout ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-[55%_45%] gap-8 items-start">

          {/* ── LEFT — Images ──────────────────────────────────────── */}
          <div>
            <ProductGallery images={product.images ?? []} name={product.name} />
          </div>

          {/* ── RIGHT — Purchase panel (sticky on desktop) ──────────── */}
          <div className="lg:sticky lg:top-20 space-y-5 pb-24 lg:pb-0">

            {/* Store mini card */}
            <Link
              href={`/store/${slug}`}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow group"
            >
              {v.logo_url ? (
                <Image
                  src={v.logo_url}
                  alt={vendor.store_name}
                  width={40}
                  height={40}
                  className="rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: `${accent}20` }}>🛍️</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black text-gray-900 truncate">{vendor.store_name}</p>
                  {v.verified_at && <BadgeCheck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400">Voir la boutique →</p>
              </div>
            </Link>

            {/* Product name */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{product.name}</h1>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{product.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({product.reviewCount} avis)</span>
                </div>
              )}

              {/* Price */}
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-gray-900">{formatPrice(product.price)}</span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-400 line-through font-semibold">{formatPrice(product.comparePrice!)}</span>
                  )}
                  {hasDiscount && (
                    <span className="text-sm font-black text-white bg-red-500 px-2 py-0.5 rounded-lg">-{discountPct}%</span>
                  )}
                </div>
                {hasDiscount && savings > 0 && (
                  <p className="text-emerald-600 text-sm font-black mt-1">
                    🎉 Vous économisez {formatPrice(savings)}
                  </p>
                )}
              </div>

              {/* Live viewers */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <Eye className="w-4 h-4 text-gray-400" />
                <span><strong className="text-gray-800">{viewers}</strong> personnes regardent ce produit</span>
              </div>

              {/* Stock */}
              {product.stock > 0 && product.stock <= 15 && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className={product.stock <= 5 ? 'text-red-500' : 'text-orange-500'}>
                      {product.stock <= 5
                        ? `⚡ Seulement ${product.stock} en stock — dépêchez-vous !`
                        : `${product.stock} pièces disponibles`}
                    </span>
                    <span className="text-gray-400">{Math.round((product.stock / 15) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${product.stock <= 5 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-orange-400 to-amber-400'}`}
                      style={{ width: `${Math.min(100, (product.stock / 15) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {product.stock === 0 && (
                <p className="text-sm font-bold text-red-500">Rupture de stock</p>
              )}
            </div>

            {/* CTA buttons panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
              <StoreProductClient
                product={{
                  id:      product.id,
                  name:    product.name,
                  price:   product.price,
                  image:   product.images?.[0] ?? '',
                  stock:   product.stock,
                  nicheId: product.nicheId,
                }}
                accent={accent}
                vendorWhatsApp={vendorWhatsApp}
                storeName={vendor.store_name}
              />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Truck className="w-5 h-5 text-blue-500" />,    title: 'Livraison',        sub: '58 wilayas'           },
                { icon: <Shield className="w-5 h-5 text-green-500" />,  title: 'Paiement',         sub: 'À la livraison'        },
                { icon: <RotateCcw className="w-5 h-5 text-violet-500" />, title: 'Retour',         sub: 'Sous 7 jours'         },
              ].map(({ icon, title, sub }) => (
                <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center gap-1.5 py-4 text-center">
                  {icon}
                  <p className="text-xs font-black text-gray-800">{title}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-sm font-black text-gray-900 mb-3 uppercase tracking-wide">Description</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* COD banner */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-black text-green-800">Paiement à la livraison garanti</p>
                <p className="text-xs text-green-700 mt-0.5">Payez uniquement cash quand vous recevez votre commande</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Related products ─────────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-black text-gray-900 mb-5">Autres produits de cette boutique</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(p => (
                <RelatedCard key={p.id} product={p} storeSlug={slug} accent={accent} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RelatedCard({ product, storeSlug, accent }: { product: Product; storeSlug: string; accent: string }) {
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0

  return (
    <Link
      href={`/store/${storeSlug}/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 border border-gray-100 transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-2 left-2 text-[10px] font-black text-white px-1.5 py-0.5 rounded-md" style={{ background: accent }}>
            NOUVEAU
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-bold text-gray-900 line-clamp-2 flex-1 mb-1.5">{product.name}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-gray-900">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
