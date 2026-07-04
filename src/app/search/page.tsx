import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Search } from 'lucide-react'
import { searchProducts } from '@/lib/supabase/queries'
import { getVendorById } from '@/lib/supabase/vendors'
import { formatPrice } from '@/lib/utils'
import { getServerT } from '@/lib/i18n/server'

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const t = await getServerT()
  return {
    title: q ? `${q} — ${t.store.searchPlaceholder}` : t.store.searchPlaceholder,
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '', page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const t = await getServerT()
  const ts = t.store

  const { products, total, totalPages } = await searchProducts(q, { page, limit: 24 })
  const totalVendors = new Set(products.map((p) => p.vendorId).filter(Boolean)).size

  return (
    <div className="min-h-screen bg-[#f5f5f7] pt-6 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#1d1d1f] mb-6">{ts.searchPlaceholder}</h1>

        {/* Search form */}
        <form action="/search" method="GET" className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#aeaeb2]" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={ts.searchPlaceholder}
            aria-label={ts.searchPlaceholder}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-black/10 shadow-sm"
          />
        </form>

        {q && (
          <p className="text-sm text-[#86868b] mb-6">
            {total === 0 ? ts.noResults.replace('{q}', q) : `${total} résultat${total > 1 ? 's' : ''} dans ${totalVendors} boutique${totalVendors > 1 ? 's' : ''}`}
          </p>
        )}

        <Suspense fallback={<SearchSkeleton />}>
          {products.length === 0 ? (
            <div className="text-center py-20 text-[#86868b]">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">
                {q ? ts.noResults.replace('{q}', q) : 'Tapez un mot-clé pour commencer votre recherche.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
                {products.map((product) => (
                  <SearchProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-10">
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&page=${Math.max(1, page - 1)}`}
                    className={`px-4 py-2 text-sm font-semibold rounded-full border border-black/10 bg-white text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
                  >
                    Précédent
                  </Link>
                  <span className="text-sm text-[#86868b]">
                    Page {page} / {totalPages}
                  </span>
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, page + 1)}`}
                    className={`px-4 py-2 text-sm font-semibold rounded-full border border-black/10 bg-white text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
                  >
                    Suivant
                  </Link>
                </div>
              )}
            </>
          )}
        </Suspense>
      </div>
    </div>
  )
}

async function SearchProductCard({ product }: { product: Awaited<ReturnType<typeof searchProducts>>['products'][number] }) {
  const vendor = product.vendorId ? await getVendorById(product.vendorId) : null
  const storeSlug = vendor?.store_slug ?? ''
  const href = storeSlug ? `/store/${storeSlug}/${product.id}` : '#'

  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-white mb-3">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-[#c7c7cc]" />
          </div>
        )}
      </div>
      <p className="text-[13px] sm:text-sm text-[#1d1d1f] font-medium line-clamp-2 leading-snug mb-1.5">
        {product.name}
      </p>
      <p className="text-sm font-bold text-[#1d1d1f]">{formatPrice(product.price)}</p>
      {vendor?.store_name && (
        <p className="text-xs text-[#86868b] mt-1">{vendor.store_name}</p>
      )}
    </Link>
  )
}

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded-2xl bg-[#e8e8ed] mb-3" />
          <div className="h-4 bg-[#e8e8ed] rounded w-3/4 mb-2" />
          <div className="h-4 bg-[#e8e8ed] rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}
