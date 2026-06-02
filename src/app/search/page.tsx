import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { products } from '@/lib/data/products'
import { translations } from '@/lib/i18n/translations'
import ProductCard from '@/components/shop/ProductCard'
import SearchInput from '@/components/shop/SearchInput'

const t = translations.fr

export const metadata: Metadata = {
  title: t.search.title,
}

interface PageProps {
  searchParams: Promise<{ q?: string; niche?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '', niche } = await searchParams
  const query = q.trim().toLowerCase()

  const results = query
    ? products.filter((p) =>
        (!niche || p.nicheId === niche) &&
        (p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.includes(query)))
      )
    : []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 max-w-xl">
        <h1 className="text-2xl font-black text-gray-900 mb-4">{t.search.title}</h1>
        <Suspense>
          <SearchInput initialValue={q} />
        </Suspense>
      </div>

      {query ? (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {results.length > 0 ? (
              <>
                <span className="font-bold text-gray-900">{results.length}</span>{' '}
                {t.search.results.replace('{n}', '')}{' '}
                <span className="text-indigo-600 font-semibold">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              <>{t.search.noResults} — <span className="text-indigo-600 font-semibold">&ldquo;{q}&rdquo;</span></>
            )}
          </p>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
              <SearchX className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="font-semibold text-gray-700 mb-2">{t.common.noProducts}</p>
              <p className="text-gray-500 text-sm mb-6">{t.search.hint}</p>
              <div className="flex justify-center gap-3">
                {[{ id: 'cars', emoji: '🚗' }, { id: 'animals', emoji: '🐾' }, { id: 'kids', emoji: '🧸' }].map(({ id, emoji }) => (
                  <Link
                    key={id}
                    href={`/${id}`}
                    className="text-2xl hover:scale-110 transition-transform"
                    title={id}
                  >
                    {emoji}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm text-gray-400">
          <p>{t.search.hint}</p>
        </div>
      )}
    </div>
  )
}
