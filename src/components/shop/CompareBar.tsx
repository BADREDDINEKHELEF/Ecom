'use client'

import Link from 'next/link'
import Image from 'next/image'
import { X, ArrowLeftRight } from 'lucide-react'
import { useCompareStore } from '@/lib/store/compareStore'

export default function CompareBar() {
  const { items, remove, clear } = useCompareStore()

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {items.map((product) => (
            <div key={product.id} className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 min-w-0">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                {product.images[0] && (
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="32px" />
                )}
              </div>
              <p className="text-xs font-semibold text-gray-800 truncate max-w-[100px]">{product.name}</p>
              <button
                onClick={() => remove(product.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label={`Retirer ${product.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {items.length < 3 && (
            <div className="flex items-center justify-center w-14 h-10 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 text-xs">
              +
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={clear} className="text-xs text-gray-500 hover:text-gray-700 underline">
            Effacer
          </button>
          <Link
            href={`/compare?ids=${items.map((p) => p.id).join(',')}`}
            className="flex items-center gap-2 bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Comparer ({items.length})
          </Link>
        </div>
      </div>
    </div>
  )
}
