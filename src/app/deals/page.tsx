import { Tag } from 'lucide-react'
import { products } from '@/lib/data/products'
import { niches } from '@/lib/data/niches'
import { formatPrice, discount } from '@/lib/utils'
import ProductCard from '@/components/shop/ProductCard'
import Link from 'next/link'

export default function DealsPage() {
  const discounted = products.filter((p) => p.comparePrice && p.comparePrice > p.price)
  const maxSaving = discounted.reduce((max, p) => {
    const saved = p.comparePrice! - p.price
    return saved > max ? saved : max
  }, 0)

  const byNiche = niches.map((niche) => ({
    niche,
    products: discounted.filter((p) => p.nicheId === niche.id),
  })).filter((g) => g.products.length > 0)

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-red-600 via-rose-600 to-pink-600 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm font-bold mb-5">
            <Tag className="w-4 h-4" /> Limited Time Deals
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3">Hot Deals & Offers</h1>
          <p className="text-red-100 text-lg mb-6">
            Save up to{' '}
            <span className="bg-white text-red-600 font-black px-2 py-0.5 rounded-lg">
              {formatPrice(maxSaving)}
            </span>{' '}
            on selected products
          </p>
          <p className="text-red-200 text-sm">{discounted.length} deals available right now</p>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-6 overflow-x-auto">
          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
            🔥 {discounted.length} deals
          </span>
          {byNiche.map(({ niche, products: ps }) => (
            <a
              key={niche.id}
              href={`#${niche.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap transition-colors"
            >
              <span>{niche.emoji}</span>
              {niche.name.split(' ')[0]} ({ps.length})
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        {byNiche.map(({ niche, products: nicheDeals }) => (
          <section key={niche.id} id={niche.id}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{niche.emoji}</span>
                <div>
                  <h2 className="text-xl font-black text-gray-900">{niche.name} Deals</h2>
                  <p className="text-sm text-gray-500">{nicheDeals.length} discounted products</p>
                </div>
              </div>
              <Link
                href={`/${niche.id}`}
                className="text-sm text-indigo-600 font-semibold hover:underline hidden sm:block"
              >
                View all {niche.name}
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {nicheDeals.map((product) => (
                <div key={product.id} className="relative">
                  <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow">
                    -{discount(product.price, product.comparePrice!)}%
                  </div>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
