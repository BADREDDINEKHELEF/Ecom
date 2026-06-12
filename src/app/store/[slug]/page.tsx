import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin, BadgeCheck, Package, ShoppingBag, Star,
  Instagram, Facebook, MessageCircle, Shield, Truck,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { Product } from '@/types'
import ReferralCapture from '@/components/ui/ReferralCapture'
import StoreProductsGrid from './StoreProductsGrid'

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
    products:    (products ?? []).map(dbToProduct),
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
  return `${base}/${value.replace(/^@/, '')}`
}

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
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
    ? (ratedProducts.reduce((s, p) => s + p.rating, 0) / ratedProducts.length)
    : 0

  const waHref = vendor.social_whatsapp
    ? `https://wa.me/${vendor.social_whatsapp.replace(/\D/g, '')}`
    : null

  const featuredProduct = products.find(p => p.isFeatured) ?? null

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <ReferralCapture />

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative h-56 sm:h-80 w-full overflow-hidden">
        {vendor.banner_url ? (
          <>
            <Image
              src={vendor.banner_url}
              alt="Store banner"
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/60" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${accent}f0 0%, ${accent}b0 50%, ${accent}70 100%)` }}
          >
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
            />
            <div className="absolute right-4 bottom-0 text-white/10 text-[180px] leading-none select-none">🛍️</div>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 text-xs font-bold bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-black/50 transition-colors"
        >
          ← ShopDZ
        </Link>
      </div>

      {/* ── Store Identity Card ──────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 mb-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Logo + name row */}
          <div className="flex flex-col items-center text-center px-6 pt-3 pb-6 sm:flex-row sm:text-left sm:items-end sm:gap-5 sm:pt-0">

            {/* Logo elevated */}
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-2xl flex-shrink-0 -mt-14 sm:-mt-14"
              style={{ boxShadow: `0 12px 40px ${accent}40` }}
            >
              {vendor.logo_url ? (
                <Image
                  src={vendor.logo_url}
                  alt={vendor.store_name}
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-5xl"
                  style={{ background: `${accent}20` }}
                >
                  🛍️
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0 mt-3 sm:mt-0 sm:pb-4">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">{vendor.store_name}</h1>
                {vendor.verified_at && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5" /> Certifié
                  </span>
                )}
                {vendor.is_approved && !vendor.verified_at && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <BadgeCheck className="w-3.5 h-3.5" /> Vérifié
                  </span>
                )}
              </div>

              {vendor.wilaya && (
                <p className="flex items-center justify-center sm:justify-start gap-1 text-sm text-gray-400 mb-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {vendor.wilaya}
                </p>
              )}

              {vendor.description && (
                <p className="text-sm text-gray-500 line-clamp-2 max-w-lg">{vendor.description}</p>
              )}
            </div>

            {/* WhatsApp CTA */}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] hover:bg-[#1fbe5d] text-white font-black px-5 py-3 rounded-2xl transition-colors shadow-lg shadow-green-200/60 text-sm sm:mb-4"
              >
                {WA_ICON}
                Contacter
              </a>
            )}
          </div>

          {/* ── Stats bar ── */}
          <div
            className="grid grid-cols-3 border-t divide-x"
            style={{ borderColor: `${accent}20` }}
          >
            <div className="flex flex-col items-center py-4 gap-0.5">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4" style={{ color: accent }} />
                <span className="text-xl font-black text-gray-900">{products.length}</span>
              </div>
              <span className="text-xs text-gray-400 font-medium">Produit{products.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-0.5">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                <span className="text-xl font-black text-gray-900">{totalOrders > 0 ? `${totalOrders}+` : '—'}</span>
              </div>
              <span className="text-xs text-gray-400 font-medium">Ventes</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-0.5">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-xl font-black text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
              </div>
              <span className="text-xs text-gray-400 font-medium">Note moy.</span>
            </div>
          </div>

          {/* Social links */}
          {(vendor.social_instagram || vendor.social_facebook || vendor.social_tiktok) && (
            <div className="flex items-center justify-center gap-3 px-6 py-3 border-t border-gray-50">
              {vendor.social_instagram && (
                <a href={toSocialUrl(vendor.social_instagram, 'https://instagram.com')} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <Instagram className="w-4 h-4 text-white" />
                </a>
              )}
              {vendor.social_facebook && (
                <a href={toSocialUrl(vendor.social_facebook, 'https://facebook.com')} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  <Facebook className="w-4 h-4 text-white" />
                </a>
              )}
              {vendor.social_tiktok && (
                <a href={toSocialUrl(vendor.social_tiktok, 'https://tiktok.com')} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-black flex items-center justify-center hover:scale-110 transition-transform shadow-md"
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

      {/* ── Vacation banner ────────────────────────────────────────── */}
      {vendor.is_on_vacation && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-5">
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

      {/* ── Trust strip ────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
          {[
            { icon: <Truck    className="w-4 h-4 text-blue-500"   />, label: '58 wilayas'            },
            { icon: <MessageCircle className="w-4 h-4 text-green-500"  />, label: 'Commande WhatsApp'    },
            { icon: <Shield   className="w-4 h-4 text-indigo-500" />, label: 'Paiement à la livraison' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-3">
              {icon}
              <span className="text-[10px] sm:text-xs font-semibold text-gray-600 text-center leading-tight px-1">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured product hero ──────────────────────────────────── */}
      {featuredProduct && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-6">
          <Link
            href={`/store/${vendor.store_slug}/${featuredProduct.id}`}
            className="group relative flex gap-5 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 p-5 sm:p-6"
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ background: accent }}
            />
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50">
              {featuredProduct.images?.[0] && (
                <Image
                  src={featuredProduct.images[0]}
                  alt={featuredProduct.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="160px"
                />
              )}
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <span
                className="inline-block text-[10px] font-black text-white px-2 py-0.5 rounded-md mb-2 w-fit"
                style={{ background: accent }}
              >
                ⭐ COUP DE CŒUR
              </span>
              <h3 className="font-black text-gray-900 text-base sm:text-xl leading-tight mb-2 line-clamp-2">
                {featuredProduct.name}
              </h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-black text-gray-900">
                  {formatPrice(featuredProduct.price)}
                </span>
                {featuredProduct.comparePrice && featuredProduct.comparePrice > featuredProduct.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(featuredProduct.comparePrice)}
                  </span>
                )}
              </div>
              {featuredProduct.comparePrice && featuredProduct.comparePrice > featuredProduct.price && (
                <p className="text-sm text-emerald-600 font-bold">
                  Économie {formatPrice(featuredProduct.comparePrice - featuredProduct.price)}
                </p>
              )}
              <span className="mt-3 text-xs font-bold text-gray-400 group-hover:text-gray-600 transition-colors">
                Voir le produit →
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Products grid ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <p className="font-bold text-gray-700 mb-1">Aucun produit disponible</p>
            <p className="text-sm text-gray-400">Cette boutique n'a pas encore ajouté de produits.</p>
          </div>
        ) : (
          <StoreProductsGrid
            products={products}
            accent={accent}
            storeSlug={vendor.store_slug}
          />
        )}
      </div>

      {/* ── Store policies ──────────────────────────────────────────── */}
      {(vendor.return_policy || vendor.shipping_policy) && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 space-y-2">
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

      {/* ── Sticky WhatsApp ─────────────────────────────────────────── */}
      {waHref && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-30 w-[calc(100%-2rem)] sm:w-auto">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full sm:w-auto text-sm font-black text-white bg-[#25D366] hover:bg-[#1fbe5d] px-7 py-4 rounded-2xl shadow-2xl shadow-green-300/50 transition-colors"
          >
            {WA_ICON}
            Commander via WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}
