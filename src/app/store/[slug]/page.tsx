import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, BadgeCheck, Package, ShoppingBag, Star, Instagram, Facebook } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { Product } from '@/types'
import ReferralCapture from '@/components/ui/ReferralCapture'

interface VendorRow {
  id: string
  store_name: string
  store_slug: string
  logo_url: string | null
  banner_url?: string | null
  accent_color?: string | null
  description: string | null
  wilaya: string | null
  is_approved: boolean
  is_on_vacation?: boolean | null
  vacation_message?: string | null
  verified_at?: string | null
  seo_title?: string | null
  seo_description?: string | null
  created_at: string
  social_instagram?: string | null
  social_facebook?: string | null
  social_whatsapp?: string | null
  social_tiktok?: string | null
  return_policy?: string | null
  shipping_policy?: string | null
}

async function getStoreProducts(vendorId: string): Promise<{ products: Product[]; totalOrders: number }> {
  const supabase = createAdminClient()
  const [{ data: products }, { count }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('status', 'delivered'),
  ])
  return {
    products: (products ?? []).map(dbToProduct),
    totalOrders: count ?? 0,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vendor = await getVendorBySlug(slug)
  if (!vendor) return { title: 'Boutique introuvable' }
  return {
    title:       vendor.seo_title ?? `${vendor.store_name} — ShopDZ`,
    description: vendor.seo_description ?? vendor.description ?? `Boutique ${vendor.store_name} sur ShopDZ`,
    openGraph: {
      title:       vendor.store_name,
      description: vendor.description ?? '',
      images:      vendor.logo_url ? [vendor.logo_url] : [],
    },
  }
}

function toSocialUrl(value: string, base: string): string {
  if (!value) return ''
  if (value.startsWith('http')) return value
  const handle = value.replace(/^@/, '')
  return `${base}/${handle}`
}

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vendor = await getVendorBySlug(slug) as VendorRow | null
  if (!vendor) notFound()

  const { products, totalOrders } = await getStoreProducts(vendor.id)
  const accent = vendor.accent_color ?? '#4f46e5'

  const ratedProducts = products.filter(p => p.rating > 0)
  const avgRating = ratedProducts.length > 0
    ? ratedProducts.reduce((sum, p) => sum + p.rating, 0) / ratedProducts.length
    : 0

  const waHref = vendor.social_whatsapp
    ? `https://wa.me/${vendor.social_whatsapp.replace(/\D/g, '')}`
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <ReferralCapture />

      {/* ── Banner ──────────────────────────────────────────────────── */}
      <div className="relative h-52 sm:h-72 w-full overflow-hidden">
        {vendor.banner_url ? (
          <>
            <Image src={vendor.banner_url} alt="Store banner" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accent}ee 0%, ${accent}99 60%, ${accent}55 100%)` }}
          >
            {/* dot-grid watermark */}
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}
            />
            {/* big emoji accent */}
            <div className="absolute right-6 bottom-2 text-white/15 text-[140px] leading-none select-none pointer-events-none">
              🛍️
            </div>
          </div>
        )}

        <Link
          href="/"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 text-xs font-semibold bg-black/25 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-black/40 transition-colors"
        >
          ← ShopDZ
        </Link>
      </div>

      {/* ── Store Header Card ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-14 mb-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex gap-4 sm:gap-5 items-start">
              {/* Logo — elevated above banner */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex-shrink-0 -mt-[4.5rem] ring-2 ring-white/60">
                {vendor.logo_url ? (
                  <Image src={vendor.logo_url} alt={vendor.store_name} width={112} height={112} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `${accent}18` }}>
                    🛍️
                  </div>
                )}
              </div>

              {/* Name + actions */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate">{vendor.store_name}</h1>
                      {vendor.verified_at && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5" /> Certifié
                        </span>
                      )}
                      {vendor.is_approved && !vendor.verified_at && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5" /> Vérifié
                        </span>
                      )}
                    </div>
                    {vendor.wilaya && (
                      <p className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" /> {vendor.wilaya}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp CTA — prominent in header */}
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#1fbe5d] px-4 py-2.5 rounded-xl transition-colors shadow-sm flex-shrink-0"
                    >
                      {WA_ICON}
                      <span>Contacter</span>
                    </a>
                  )}
                </div>

                {vendor.description && (
                  <p className="text-sm text-gray-500 leading-relaxed mt-2 line-clamp-2">{vendor.description}</p>
                )}
              </div>
            </div>

            {/* ── Stats row ── */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                <strong className="text-gray-900">{products.length}</strong> produit{products.length !== 1 ? 's' : ''}
              </span>
              {totalOrders > 0 && (
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  <strong className="text-gray-900">{totalOrders}</strong> vente{totalOrders !== 1 ? 's' : ''}
                </span>
              )}
              {avgRating > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <strong className="text-gray-900">{avgRating.toFixed(1)}</strong>
                </span>
              )}
              <span className="text-xs text-gray-400 sm:ms-auto">
                Membre depuis {new Date(vendor.created_at).toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long' })}
              </span>
            </div>

            {/* Social links */}
            {(vendor.social_instagram || vendor.social_facebook || vendor.social_tiktok) && (
              <div className="flex items-center gap-3 mt-3">
                {vendor.social_instagram && (
                  <a
                    href={toSocialUrl(vendor.social_instagram, 'https://instagram.com')}
                    target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4 text-white" />
                  </a>
                )}
                {vendor.social_facebook && (
                  <a
                    href={toSocialUrl(vendor.social_facebook, 'https://facebook.com')}
                    target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4 text-white" />
                  </a>
                )}
                {vendor.social_tiktok && (
                  <a
                    href={toSocialUrl(vendor.social_tiktok, 'https://tiktok.com')}
                    target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="TikTok"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Vacation banner ──────────────────────────────────────────── */}
      {vendor.is_on_vacation && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <span className="text-2xl flex-shrink-0">✈️</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Cette boutique est temporairement en congé</p>
              {vendor.vacation_message && (
                <p className="text-amber-700 text-sm mt-0.5">{vendor.vacation_message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Store Policies ───────────────────────────────────────────── */}
      {(vendor.return_policy || vendor.shipping_policy) && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6 space-y-2">
          {vendor.shipping_policy && (
            <details className="bg-white rounded-2xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-semibold text-gray-800 text-sm list-none">
                Politique de livraison
                <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600 whitespace-pre-line">{vendor.shipping_policy}</p>
            </details>
          )}
          {vendor.return_policy && (
            <details className="bg-white rounded-2xl shadow-sm overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-semibold text-gray-800 text-sm list-none">
                Politique de retour
                <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600 whitespace-pre-line">{vendor.return_policy}</p>
            </details>
          )}
        </div>
      )}

      {/* ── Products ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 mb-1">Aucun produit disponible</p>
            <p className="text-sm text-gray-400">Cette boutique n'a pas encore ajouté de produits.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-black text-gray-900">Tous les produits</h2>
              <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded-full" style={{ background: accent }}>
                {products.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
              {products.map((product) => (
                <StoreProductCard key={product.id} product={product} accent={accent} storeSlug={vendor.store_slug} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Sticky WhatsApp CTA (mobile + desktop) ───────────────────── */}
      {waHref && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-30 w-[calc(100%-2rem)] sm:w-auto">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full sm:w-auto text-sm font-bold text-white bg-[#25D366] hover:bg-[#1fbe5d] px-6 py-3.5 rounded-2xl shadow-2xl transition-colors"
          >
            {WA_ICON}
            Commander via WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

function StoreProductCard({ product, accent, storeSlug }: { product: Product; accent: string; storeSlug: string }) {
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0
  const savings = hasDiscount ? product.comparePrice! - product.price : 0

  return (
    <Link
      href={`/store/${storeSlug}/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 border border-gray-100 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] ? (
          <>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${product.stock === 0 ? 'opacity-60' : ''}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">
                Voir le produit
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
        )}

        {/* Out-of-stock */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              Rupture
            </span>
          </div>
        )}

        {/* Badges */}
        {product.isNew && (
          <span
            className="absolute top-2 left-2 text-[10px] font-black text-white px-1.5 py-0.5 rounded-md"
            style={{ background: accent }}
          >
            NOUVEAU
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 mb-1.5 flex-1">
          {product.name}
        </p>

        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-gray-500">{product.rating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-sm font-black text-gray-900">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>

        {hasDiscount && savings > 0 && (
          <p className="text-[10px] text-emerald-600 font-semibold">Économie {formatPrice(savings)}</p>
        )}

        {product.stock > 0 && product.stock <= 5 && (
          <div className="mt-1.5">
            <p className="text-[10px] text-orange-500 font-semibold mb-1">Plus que {product.stock} en stock</p>
            <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(product.stock / 5) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
