'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import PriceRangeSlider from './PriceRangeSlider'
import { Star } from 'lucide-react'

const PRICE_MAX = 200000

export default function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q       = searchParams.get('q') ?? ''
  const minPrice = Number(searchParams.get('minPrice') ?? 0)
  const maxPrice = Number(searchParams.get('maxPrice') ?? PRICE_MAX)
  const minRating = Number(searchParams.get('minRating') ?? 0)

  const push = useCallback((updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === '0') p.delete(k)
      else p.set(k, v)
    })
    router.replace(`/search?${p.toString()}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 space-y-5">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Fourchette de prix</p>
        <PriceRangeSlider
          min={0}
          max={PRICE_MAX}
          value={[minPrice, maxPrice === 0 ? PRICE_MAX : maxPrice]}
          onChange={([lo, hi]) =>
            push({ minPrice: lo === 0 ? null : String(lo), maxPrice: hi === PRICE_MAX ? null : String(hi) })
          }
        />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Note minimale</p>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => push({ minRating: r === 0 ? null : String(r) })}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border-2 transition-colors ${
                minRating === r ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {r === 0 ? 'Tous' : <><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r}+</>}
            </button>
          ))}
        </div>
      </div>
      {(minPrice > 0 || maxPrice < PRICE_MAX || minRating > 0) && (
        <button
          onClick={() => push({ minPrice: null, maxPrice: null, minRating: null })}
          className="text-xs text-indigo-600 hover:underline"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )
}
