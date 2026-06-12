import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Shield, Truck, RotateCcw, Star, Package, Eye } from 'lucide-react'
import { getProductById } from '@/lib/supabase/products'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import ProductColorGallery from './ProductColorGallery'
import StoreProductClient from './StoreProductClient'
import TrackViewContent from '@/components/analytics/TrackViewContent'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

interface VendorExt {
  accent_color?: string | null
  verified_at?: string | null
  logo_url?: string | null
  social_whatsapp?: string | null
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

  const v              = vendor as typeof vendor & VendorExt
  const accent         = v.accent_color ?? '#4f46e5'
  const vendorWhatsApp = v.social_whatsapp ?? null

  const related = await getRelatedProducts(vendor.id, productId)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0
  const savings  = hasDiscount ? product.comparePrice! - product.price : 0
  const viewers  = Math.floor(Math.random() * 14) + 4   // 4-17

  return (
    <div className="min-h-screen bg-white">

      {/* ── Sticky store bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-6xl mx-auto px-4 h-[52px] flex items-center justify-between gap-4">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f] hover:text-[#86868b] transition-colors"
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
                className="rounded-[8px] object-cover"
              />
            )}
            <span className="text-sm font-semibold text-[#1d1d1f] hidden sm:block">{vendor.store_name}</span>
            {v.verified_at && <BadgeCheck className="w-4 h-4 text-amber-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">

        {/* ── Two-column: image left, panel right ──────────────────── */}
        <div className="grid lg:grid-cols-[55%_45%] gap-10 lg:gap-14 items-start">

          {/* LEFT — Gallery */}
          <ProductColorGallery
            mainImages={product.images ?? []}
            colorVariants={product.colorVariants ?? []}
            name={product.name}
          />

          {/* RIGHT — Purchase panel (sticky desktop) */}
          <div className="lg:sticky lg:top-[68px] space-y-6 pb-28 lg:pb-0">

            {/* Store link — minimal breadcrumb feel */}
            <Link
              href={`/store/${slug}`}
              className="flex items-center gap-2 text-sm text-[#6e6e73] hover:text-[#1d1d1f] transition-colors group"
            >
              {v.logo_url && (
                <Image
                  src={v.logo_url}
                  alt={vendor.store_name}
                  width={22}
                  height={22}
                  className="rounded-[6px] object-cover"
                />
              )}
              <span className="font-medium group-hover:underline">{vendor.store_name}</span>
              {v.verified_at && <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />}
            </Link>

            {/* Product name — large, Apple-style */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1d1d1f] tracking-tight leading-tight">
                {product.name}
              </h1>

              {product.rating > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-[#d1d1d6]'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#1d1d1f]">{product.rating.toFixed(1)}</span>
                  <span className="text-sm text-[#86868b]">({product.reviewCount} avis)</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="h-px bg-[#f5f5f7]" />

            {/* Price — very large */}
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl sm:text-5xl font-black text-[#1d1d1f] tracking-tight">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-xl text-[#86868b] line-through font-semibold">
                      {formatPrice(product.comparePrice!)}
                    </span>
                    <span className="text-sm font-black text-white bg-red-500 px-2.5 py-1 rounded-full">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>
              {hasDiscount && savings > 0 && (
                <p className="text-base font-semibold text-emerald-600 mt-1.5">
                  🎉 Vous économisez {formatPrice(savings)}
                </p>
              )}
            </div>

            {/* Social proof — live viewers */}
            <div className="flex items-center gap-2 text-sm text-[#6e6e73]">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <Eye className="w-4 h-4 text-[#86868b]" />
              <span>
                <strong className="text-[#1d1d1f] font-semibold">{viewers}</strong> personnes regardent ce produit
              </span>
            </div>

            {/* Stock bar */}
            {product.stock > 0 && product.stock <= 15 && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className={`font-semibold ${product.stock <= 5 ? 'text-red-500' : 'text-orange-500'}`}>
                    {product.stock <= 5
                      ? `⚡ Seulement ${product.stock} en stock`
                      : `${product.stock} pièces disponibles`}
                  </span>
                </div>
                <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      product.stock <= 5
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : 'bg-gradient-to-r from-orange-400 to-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, (product.stock / 15) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {product.stock === 0 && (
              <p className="text-sm font-semibold text-red-500">Rupture de stock</p>
            )}

            {/* Separator */}
            <div className="h-px bg-[#f5f5f7]" />

            {/* Analytics: fires ViewContent once on mount */}
            <TrackViewContent product={{ id: product.id, name: product.name, price: product.price }} />

            {/* CTA buttons */}
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

            {/* Separator */}
            <div className="h-px bg-[#f5f5f7]" />

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: <Truck     className="w-5 h-5 text-blue-500 mx-auto mb-1.5"   />, title: 'Livraison',   sub: '58 wilayas' },
                { icon: <Shield    className="w-5 h-5 text-green-500 mx-auto mb-1.5"  />, title: 'Paiement',    sub: 'À la livraison' },
                { icon: <RotateCcw className="w-5 h-5 text-violet-500 mx-auto mb-1.5" />, title: 'Retour',      sub: 'Sous 7 jours' },
              ].map(({ icon, title, sub }) => (
                <div key={title}>
                  {icon}
                  <p className="text-[11px] font-bold text-[#1d1d1f]">{title}</p>
                  <p className="text-[10px] text-[#86868b] mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <>
                <div className="h-px bg-[#f5f5f7]" />
                <div>
                  <h2 className="text-[11px] font-black text-[#86868b] uppercase tracking-widest mb-3">
                    Description
                  </h2>
                  <p className="text-sm text-[#6e6e73] leading-relaxed whitespace-pre-line">{product.description}</p>
                </div>
              </>
            )}

            {/* COD guarantee */}
            <div className="flex items-center gap-3 bg-[#f0faf4] border border-[#d1fae5] rounded-2xl px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Paiement à la livraison</p>
                <p className="text-xs text-emerald-700 mt-0.5">Payez cash uniquement à la réception</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── Related products ─────────────────────────────────────── */}
        {related.length > 0 && (
          <div className="mt-20 pt-12 border-t border-[#f5f5f7]">
            <h2 className="text-2xl font-black text-[#1d1d1f] tracking-tight mb-8">
              Autres produits de cette boutique
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-8">
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

function RelatedCard({
  product,
  storeSlug,
  accent,
}: {
  product: Product
  storeSlug: string
  accent: string
}) {
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0

  return (
    <Link href={`/store/${storeSlug}/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#f5f5f7] mb-3">
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
            <Package className="w-8 h-8 text-[#c7c7cc]" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2.5 right-2.5 text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
        {product.isNew && (
          <span
            className="absolute top-2.5 left-2.5 text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
            style={{ background: accent }}
          >
            Nouveau
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium text-[#1d1d1f] line-clamp-2 mb-1.5">{product.name}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-[#1d1d1f]">{formatPrice(product.price)}</span>
        {hasDiscount && (
          <span className="text-xs text-[#86868b] line-through">{formatPrice(product.comparePrice!)}</span>
        )}
      </div>
    </Link>
  )
}
