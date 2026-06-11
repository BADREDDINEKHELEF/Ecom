import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, BadgeCheck, Package, ShoppingBag, Star, ArrowLeft, Instagram, Facebook } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
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

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vendor = await getVendorBySlug(slug) as VendorRow | null
  if (!vendor) notFound()

  const { products, totalOrders } = await getStoreProducts(vendor.id)
  const accent = vendor.accent_color ?? '#4f46e5'

  return (
    <div className="min-h-screen bg-gray-50">
      <ReferralCapture />
      {/* Banner */}
      <div
        className="relative h-48 sm:h-64 w-full overflow-hidden"
        style={{ background: vendor.banner_url ? undefined : `linear-gradient(135deg, ${accent}22 0%, ${accent}44 100%)` }}
      >
        {vendor.banner_url && (
          <Image src={vendor.banner_url} alt="Store banner" fill className="object-cover" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <Link
          href="/"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-semibold bg-black/20 backdrop-blur px-3 py-1.5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> ShopDZ
        </Link>
      </div>

      {/* Store Header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-12 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-gray-100 flex-shrink-0 -mt-10 sm:mt-0">
            {vendor.logo_url ? (
              <Image src={vendor.logo_url} alt={vendor.store_name} width={80} height={80} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `${accent}22` }}>
                <ShoppingBag className="w-8 h-8" style={{ color: accent }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-black text-gray-900 truncate">{vendor.store_name}</h1>
              {vendor.verified_at && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" /> Certifié
                </span>
              )}
              {vendor.is_approved && !vendor.verified_at && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3.5 h-3.5" /> Vérifié
                </span>
              )}
            </div>
            {vendor.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-2">{vendor.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              {vendor.wilaya && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {vendor.wilaya}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> {products.length} produit{products.length !== 1 ? 's' : ''}
              </span>
              {totalOrders > 0 && (
                <span className="flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> {totalOrders} commande{totalOrders !== 1 ? 's' : ''} livrée{totalOrders !== 1 ? 's' : ''}
                </span>
              )}
              <span>
                Membre depuis {new Date(vendor.created_at).toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long' })}
              </span>
            </div>
            {(vendor.social_instagram || vendor.social_facebook || vendor.social_tiktok || vendor.social_whatsapp) && (
              <div className="flex items-center gap-3 mt-3">
                {vendor.social_instagram && (
                  <a href={toSocialUrl(vendor.social_instagram, 'https://instagram.com')} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="Instagram">
                    <Instagram className="w-4 h-4 text-white" />
                  </a>
                )}
                {vendor.social_facebook && (
                  <a href={toSocialUrl(vendor.social_facebook, 'https://facebook.com')} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="Facebook">
                    <Facebook className="w-4 h-4 text-white" />
                  </a>
                )}
                {vendor.social_tiktok && (
                  <a href={toSocialUrl(vendor.social_tiktok, 'https://tiktok.com')} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="TikTok">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z" />
                    </svg>
                  </a>
                )}
                {vendor.social_whatsapp && (
                  <a href={`https://wa.me/${vendor.social_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label="WhatsApp">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vacation banner */}
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

      {/* Store Policies */}
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

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">Aucun produit disponible</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Tous les produits <span className="text-gray-400 font-normal">({products.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} accent={accent} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product, accent }: { product: Product; accent: string }) {
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0

  return (
    <Link
      href={`/${product.nicheId}/${product.id}`}
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100"
    >
      <div className="relative aspect-square bg-gray-100">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {product.isNew && (
          <span className="absolute top-2 left-2 text-[10px] font-black text-white px-1.5 py-0.5 rounded-md" style={{ background: accent }}>
            NOUVEAU
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{product.name}</p>
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] text-gray-500">{product.rating.toFixed(1)} ({product.reviewCount})</span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-gray-900">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>
        {product.stock <= 5 && product.stock > 0 && (
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Plus que {product.stock} en stock</p>
        )}
        {product.stock === 0 && (
          <p className="text-[10px] text-red-500 font-semibold mt-0.5">Rupture de stock</p>
        )}
      </div>
    </Link>
  )
}
