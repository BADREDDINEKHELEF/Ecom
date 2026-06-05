import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, BadgeCheck, Package, ShoppingBag, Star, ArrowLeft } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createClient } from '@/lib/supabase/client'
import { dbToProduct } from '@/lib/supabase/products'
import { Product } from '@/types'

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
  seo_title?: string | null
  seo_description?: string | null
  created_at: string
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

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const vendor = await getVendorBySlug(slug) as VendorRow | null
  if (!vendor) notFound()

  const { products, totalOrders } = await getStoreProducts(vendor.id)
  const accent = vendor.accent_color ?? '#4f46e5'

  return (
    <div className="min-h-screen bg-gray-50">
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
              {vendor.is_approved && (
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
          </div>
        </div>
      </div>

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
