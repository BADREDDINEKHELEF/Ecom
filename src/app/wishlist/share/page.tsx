'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Heart, ArrowLeft, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import type { Product } from '@/types'

export default function SharedWishlistPage() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const addItem = useCartStore((s) => s.addItem)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!idsParam) { setLoading(false); return }
    fetch(`/api/compare?ids=${idsParam}`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [idsParam])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-black text-gray-900">Liste de souhaits partagée</h1>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">Cette liste est vide ou le lien est invalide.</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <Link href={`/${product.nicheId}/${product.id}`}>
                <div className="relative aspect-square bg-gray-100">
                  {product.images[0] && (
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="(max-width:768px) 50vw, 25vw" />
                  )}
                </div>
              </Link>
              <div className="p-3">
                <Link href={`/${product.nicheId}/${product.id}`}>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1 hover:text-indigo-600">{product.name}</p>
                </Link>
                <p className="text-base font-black text-gray-900 mb-3">{formatPrice(product.price)}</p>
                <button
                  onClick={() => addItem(product, 1)}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Ajouter au panier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
