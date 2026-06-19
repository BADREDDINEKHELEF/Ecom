'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Star, Package, Check, X } from 'lucide-react'
import { useCompareStore } from '@/lib/store/compareStore'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

const ROWS: { label: string; key: keyof Product; format?: (v: unknown) => string }[] = [
  { label: 'Prix',        key: 'price',       format: (v) => formatPrice(Number(v)) },
  { label: 'Stock',       key: 'stock',       format: (v) => `${v} unités` },
  { label: 'Note',        key: 'rating',      format: (v) => `${Number(v).toFixed(1)} / 5` },
  { label: 'Catégorie',   key: 'category' },
  { label: 'État',        key: 'condition',   format: (v) => ({ new: 'Neuf', used: 'Occasion', refurbished: 'Reconditionné' }[String(v)] ?? String(v)) },
  { label: 'Pré-commande',key: 'isPreOrder',  format: (v) => v ? 'Oui' : 'Non' },
  { label: 'Qté min.',    key: 'minOrderQuantity', format: (v) => String(v ?? 1) },
]

export default function ComparePage() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const { clear } = useCompareStore()
  const addItem = useCartStore((s) => s.addItem)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!idsParam) { setLoading(false); return }
    fetch(`/api/compare?ids=${idsParam}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [idsParam])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-6">Aucun produit à comparer.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-black text-gray-900">Comparer les produits</h1>
        </div>
        <button onClick={clear} className="text-sm text-gray-500 hover:text-gray-700 underline">
          Effacer la comparaison
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr>
              <th className="w-32 sm:w-44" />
              {products.map((p) => (
                <th key={p.id} className="p-3 text-center align-top">
                  <Link href={`/${p.nicheId}/${p.id}`} className="block group">
                    <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-2xl overflow-hidden bg-gray-100 mb-2">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" sizes="128px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">{p.name}</p>
                  </Link>
                  <button
                    onClick={() => addItem(p, 1)}
                    className="mt-3 w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Ajouter au panier
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-t border-gray-100 even:bg-gray-50">
                <td className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {row.label}
                </td>
                {products.map((p) => {
                  const raw = p[row.key]
                  const display = row.format ? row.format(raw) : String(raw ?? '—')
                  return (
                    <td key={p.id} className="px-3 py-3 text-center text-sm font-medium text-gray-800">
                      {row.key === 'isPreOrder'
                        ? (raw ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />)
                        : display || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
