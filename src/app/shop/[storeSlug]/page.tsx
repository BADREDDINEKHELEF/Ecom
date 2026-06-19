import { notFound } from 'next/navigation'
import Image from 'next/image'
import type { Metadata } from 'next'
import { MapPin, Phone, Package, Star } from 'lucide-react'
import { getVendorBySlug, getVendorPublicProducts } from '@/lib/supabase/queries'
import ProductCard from '@/components/shop/ProductCard'

interface PageProps { params: Promise<{ storeSlug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { storeSlug } = await params
  const vendor = await getVendorBySlug(storeSlug)
  if (!vendor) return {}
  return {
    title: `${vendor.store_name} | StoreDz`,
    description: vendor.description || `Shop at ${vendor.store_name} on StoreDz`,
  }
}

export default async function PublicStorePage({ params }: PageProps) {
  const { storeSlug } = await params
  const vendor = await getVendorBySlug(storeSlug)
  if (!vendor || !vendor.is_approved) notFound()

  const products = await getVendorPublicProducts(vendor.id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Store Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 flex items-start gap-5 flex-wrap">
        {vendor.logo_url ? (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
            <Image src={vendor.logo_url} alt={vendor.store_name} fill className="object-cover" sizes="80px" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-black text-2xl">{vendor.store_name[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-black text-gray-900">{vendor.store_name}</h1>
            {vendor.is_approved && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                <Star className="w-3 h-3 fill-current" /> Verified Seller
              </span>
            )}
          </div>
          {vendor.description && (
            <p className="text-gray-500 text-sm mb-3 max-w-lg">{vendor.description}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500">
            {vendor.wilaya && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400" /> {vendor.wilaya}
              </span>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
                <Phone className="w-4 h-4 text-gray-400" /> {vendor.phone}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4 text-gray-400" /> {products.length} products
            </span>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">No products yet</p>
          <p className="text-sm mt-1">This seller hasn&apos;t listed any products.</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-black text-gray-900 mb-5">All Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
