'use client'

import { useState } from 'react'
import { ShoppingCart, Loader2, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'

interface Props {
  product: {
    id: string
    name: string
    price: number
    image: string
    stock: number
    nicheId: string
  }
  accent: string
}

export default function StoreProductClient({ product, accent }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const [qty, setQty]     = useState(1)
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    addItem({
      id:       product.id,
      name:     product.name,
      price:    product.price,
      images:   [product.image],
      nicheId:  product.nicheId,
    } as Parameters<typeof addItem>[0], qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (product.stock === 0) {
    return (
      <button disabled className="w-full py-3.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
        Rupture de stock
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 font-medium">Quantité</span>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors font-bold"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-bold text-gray-900">{qty}</span>
          <button
            onClick={() => setQty(Math.min(product.stock, qty + 1))}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors font-bold"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={handleAdd}
        style={{ background: added ? '#16a34a' : accent }}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
      >
        {added ? (
          <><CheckCircle className="w-4 h-4" /> Ajouté au panier</>
        ) : (
          <><ShoppingCart className="w-4 h-4" /> Ajouter au panier</>
        )}
      </button>
    </div>
  )
}
