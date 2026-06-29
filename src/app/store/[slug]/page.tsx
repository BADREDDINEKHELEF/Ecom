import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  MapPin, BadgeCheck, Package, ShoppingBag, Star,
  Instagram, Facebook, ChevronDown,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { Product } from '@/types'
import { niches as staticNiches } from '@/lib/data/niches'
import ReferralCapture from '@/components/ui/ReferralCapture'
import StoreProductsGrid from './StoreProductsGrid'
import VendorAnalyticsScripts from '@/components/analytics/VendorAnalyticsScripts'
import { getServerT } from '@/lib/i18n/server'

export type StoreNiche = { id: string; name: string; emoji: string }

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
  phone?: string | null
  social_instagram?: string | null
  social_facebook?: string | null
  social_whatsapp?: string | null
  social_tiktok?: string | null
  return_policy?: string | null
  shipping_policy?: string | null
  meta_pixel_id?: string | null
  gtag_id?: string | null
  tiktok_pixel_id?: string | null
  pixel_id?: string | null
}

async function getStoreProducts(vendorId: string): Promise<{
  products: Product[]
  totalOrders: number
  storeNiches: StoreNiche[]
}> {
  const supabase = createAdminClient()
  const [{ data: products }, { count }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('status', 'delivered'),
  ])

  const mapped = (products ?? []).map(dbToProduct)

  // Collect unique niche IDs used by this store
  const nicheIds = [...new Set(mapped.map(p => p.nicheId).filter(Boolean))]

  let storeNiches: StoreNiche[] = []
  if (nicheIds.length > 1) {
    // Try DB niches first, fall back to static config
    const { data: dbNiches } = await supabase
      .from('niches')
      .select('id, name, emoji')
      .in('id', nicheIds)

    storeNiches = nicheIds.map(id => {
      const db = (dbNiches ?? []).find(n => n.id === id)
      if (db) return { id: db.id, name: db.name, emoji: db.emoji ?? '🛒' }
      const stat = staticNiches.find(n => n.id === id)
      return stat ? { id: stat.id, name: stat.name, emoji: stat.emoji } : { id, name: id, emoji: '🛒' }
    })
  }

  return { products: mapped, totalOrders: count ?? 0, storeNiches }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vendor = await getVendorBySlug(slug)
  if (!vendor) return { title: 'Boutique introuvable' }
  const title = (vendor.seo_title ?? `${vendor.store_name} — StoreDz`).slice(0, 60)
  const description = (vendor.seo_description ?? vendor.description ?? '').slice(0, 160) || `Boutique ${vendor.store_name} sur StoreDz`
  const canonicalUrl = `${SITE_URL}/store/${slug}`
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title:       vendor.store_name,
      description,
      url:         canonicalUrl,
      type:        'website',
      locale:      'fr_DZ',
      siteName:    'StoreDz',
      images:      vendor.logo_url ? [{ url: vendor.logo_url, alt: vendor.store_name }] : [],
    },
  }
}

function toSocialUrl(value: string, base: string): string {
  if (!value) return ''
  if (value.startsWith('http')) return value
  return `${base}/${value.replace(/^@/, '')}`
}

const WA_ICON = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const WA_ICON_SM = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [vendor, t] = await Promise.all([
    getVendorBySlug(slug) as Promise<VendorRow | null>,
    getServerT(),
  ])
  const ts = t.store
  if (!vendor) notFound()

  const { products, totalOrders, storeNiches } = await getStoreProducts(vendor.id)
  const HEX_RE = /^#[0-9a-fA-F]{3,8}$/
  const accent = (vendor.accent_color && HEX_RE.test(vendor.accent_color)) ? vendor.accent_color : '#4f46e5'

  const ratedProducts = products.filter(p => p.rating > 0)
  const avgRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((s, p) => s + p.rating, 0) / ratedProducts.length)
    : 0

  const rawWA = vendor.social_whatsapp || vendor.phone
  const waHref = rawWA
    ? (() => { const d = rawWA.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('213') ? d : d.startsWith('0') ? '213' + d.slice(1) : '213' + d}` })()
    : null

  const featuredProduct = products.find(p => p.isFeatured) ?? null

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'StoreDz', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: vendor.store_name, item: `${SITE_URL}/store/${slug}` },
            ],
          }),
        }}
      />
      <VendorAnalyticsScripts
        metaPixelId={vendor.meta_pixel_id}
        gtagId={vendor.gtag_id}
        tiktokPixelId={vendor.tiktok_pixel_id}
        pixelId={vendor.pixel_id}
      />
      <ReferralCapture />

      {/* ── Cinematic Hero ──────────────────────────────────────────── */}
      <section className="relative min-h-[65vh] sm:min-h-[72vh] flex flex-col overflow-hidden">

        {/* Background */}
        {vendor.banner_url ? (
          <Image
            src={vendor.banner_url}
            alt="Store banner"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${accent} 0%, ${accent}aa 55%, ${accent}55 100%)` }}
          >
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}
            />
          </div>
        )}

        {/* Gradient overlay — lighter at top, dark at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/85" />

        {/* Top nav */}
        <div className="relative z-10 px-5 pt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/80 text-sm font-medium bg-white/10 backdrop-blur-sm border border-white/20 px-3.5 py-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            ← StoreDz
          </Link>
        </div>

        {/* Center identity */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-10 gap-4">

          {/* Logo */}
          {vendor.logo_url && (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[22px] overflow-hidden ring-[3px] ring-white/25 shadow-2xl">
              <Image
                src={vendor.logo_url}
                alt={vendor.store_name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Store name — cinematic */}
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-2xl">
            {vendor.store_name}
          </h1>

          {/* Description */}
          {vendor.description && (
            <p className="text-white/65 text-base sm:text-lg max-w-xs sm:max-w-md leading-relaxed">
              {vendor.description}
            </p>
          )}

          {/* Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {vendor.verified_at && (
              <span className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <BadgeCheck className="w-3.5 h-3.5" /> {ts.certified}
              </span>
            )}
            {vendor.is_approved && !vendor.verified_at && (
              <span className="flex items-center gap-1.5 bg-white/15 border border-white/25 text-white/90 text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <BadgeCheck className="w-3.5 h-3.5" /> {ts.verified}
              </span>
            )}
            {vendor.wilaya && (
              <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-white/75 text-xs font-medium px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <MapPin className="w-3.5 h-3.5" /> {vendor.wilaya}
              </span>
            )}
          </div>

          {/* WhatsApp CTA in hero */}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20c35a] active:scale-[.97] text-white font-black text-sm sm:text-base px-8 py-4 rounded-2xl shadow-2xl shadow-black/30 transition-all duration-200 mt-1"
            >
              {WA_ICON}
              {ts.orderViaWhatsApp}
            </a>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-5">
          <ChevronDown className="w-5 h-5 text-white/40 animate-bounce" />
        </div>
      </section>

      {/* ── Sticky slim store bar ────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.06] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="max-w-5xl mx-auto px-4 h-[52px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/"
              className="text-[#86868b] text-xs font-medium hover:text-[#1d1d1f] transition-colors hidden sm:block flex-shrink-0"
            >
              StoreDz
            </Link>
            <span className="text-[#c7c7cc] text-sm hidden sm:block">/</span>
            {vendor.logo_url && (
              <Image
                src={vendor.logo_url}
                alt={vendor.store_name}
                width={26}
                height={26}
                className="rounded-[7px] object-cover flex-shrink-0"
              />
            )}
            <span className="text-sm font-semibold text-[#1d1d1f] truncate">{vendor.store_name}</span>
            {vendor.verified_at && <BadgeCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Stats mini */}
            <div className="hidden sm:flex items-center gap-3 text-xs text-[#86868b]">
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length}</span>
              {totalOrders > 0 && <span className="flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> {totalOrders}+</span>}
              {avgRating > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)}</span>}
            </div>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#20c35a] transition-colors"
              >
                {WA_ICON_SM} {ts.contact}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Vacation banner ──────────────────────────────────────────── */}
      {vendor.is_on_vacation && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <span className="text-2xl flex-shrink-0">✈️</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">{ts.onVacation}</p>
              {vendor.vacation_message && (
                <p className="text-amber-700 text-sm mt-0.5">{vendor.vacation_message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Social links ─────────────────────────────────────────────── */}
      {(vendor.social_instagram || vendor.social_facebook || vendor.social_tiktok) && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-5 flex items-center gap-3">
          {vendor.social_instagram && (
            <a
              href={toSocialUrl(vendor.social_instagram, 'https://instagram.com')}
              target="_blank" rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
            >
              <Instagram className="w-4 h-4 text-white" aria-hidden="true" />
            </a>
          )}
          {vendor.social_facebook && (
            <a
              href={toSocialUrl(vendor.social_facebook, 'https://facebook.com')}
              target="_blank" rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
            >
              <Facebook className="w-4 h-4 text-white" aria-hidden="true" />
            </a>
          )}
          {vendor.social_tiktok && (
            <a
              href={toSocialUrl(vendor.social_tiktok, 'https://tiktok.com')}
              target="_blank" rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-9 h-9 rounded-xl bg-black flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* ── Featured hero product ─────────────────────────────────────── */}
      {featuredProduct && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <Link
            href={`/store/${vendor.store_slug}/${featuredProduct.id}`}
            className="group relative flex gap-5 sm:gap-7 bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 p-5 sm:p-6 border border-black/[0.06]"
          >
            {/* Subtle accent tint */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ background: accent }} />

            <div className="relative w-28 h-28 sm:w-40 sm:h-40 flex-shrink-0 rounded-2xl overflow-hidden bg-[#f5f5f7]">
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
                className="inline-block text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full mb-2.5 w-fit"
                style={{ background: accent }}
              >
                {ts.featured}
              </span>
              <h3 className="font-black text-[#1d1d1f] text-base sm:text-xl leading-tight mb-2 line-clamp-2 tracking-tight">
                {featuredProduct.name}
              </h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl sm:text-2xl font-black text-[#1d1d1f]">
                  {formatPrice(featuredProduct.price)}
                </span>
                {featuredProduct.comparePrice && featuredProduct.comparePrice > featuredProduct.price && (
                  <span className="text-sm text-[#86868b] line-through">
                    {formatPrice(featuredProduct.comparePrice)}
                  </span>
                )}
              </div>
              {featuredProduct.comparePrice && featuredProduct.comparePrice > featuredProduct.price && (
                <p className="text-sm text-emerald-600 font-semibold">
                  {ts.savings.replace('{n}', formatPrice(featuredProduct.comparePrice - featuredProduct.price))}
                </p>
              )}
              <span className="mt-3 text-sm text-[#86868b] group-hover:text-[#1d1d1f] transition-colors font-medium">
                {ts.viewProduct}
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Products ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-10 pb-32">
        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-black/[0.06]">
            <Package className="w-12 h-12 text-[#c7c7cc] mx-auto mb-4" />
            <p className="font-bold text-[#1d1d1f] mb-1">{ts.noProducts}</p>
            <p className="text-sm text-[#86868b]">{ts.noProductsDesc}</p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-7">
              <h2 className="text-2xl font-black text-[#1d1d1f] tracking-tight">{ts.catalogue}</h2>
              <span className="text-sm text-[#86868b]">{products.length} {t.common.products}</span>
            </div>

            <StoreProductsGrid
              products={products}
              accent={accent}
              storeSlug={vendor.store_slug}
              storeNiches={storeNiches}
            />
          </>
        )}
      </div>

      {/* ── Store policies ──────────────────────────────────────────── */}
      {(vendor.return_policy || vendor.shipping_policy) && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-12 space-y-2">
          {vendor.shipping_policy && (
            <details className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-semibold text-[#1d1d1f] text-sm list-none">
                {ts.deliveryPolicy}
                <ChevronDown className="w-4 h-4 text-[#86868b] group-open:rotate-180 transition-transform" />
              </summary>
              <p className="px-5 pb-4 text-sm text-[#6e6e73] whitespace-pre-line">{vendor.shipping_policy}</p>
            </details>
          )}
          {vendor.return_policy && (
            <details className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none font-semibold text-[#1d1d1f] text-sm list-none">
                {ts.returnPolicy}
                <ChevronDown className="w-4 h-4 text-[#86868b] group-open:rotate-180 transition-transform" />
              </summary>
              <p className="px-5 pb-4 text-sm text-[#6e6e73] whitespace-pre-line">{vendor.return_policy}</p>
            </details>
          )}
        </div>
      )}

      {/* ── Sticky floating WhatsApp ─────────────────────────────────── */}
      {waHref && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-30 w-[calc(100%-2.5rem)] sm:w-auto">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full sm:w-auto font-black text-sm text-white bg-[#25D366] hover:bg-[#20c35a] px-7 py-4 rounded-2xl shadow-2xl shadow-green-900/30 transition-all active:scale-[.97]"
          >
            {WA_ICON}
            {ts.orderViaWhatsApp}
          </a>
        </div>
      )}
    </div>
  )
}
