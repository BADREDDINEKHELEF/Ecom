'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LowStockProduct {
  id: string
  name: string
  images: string[] | null
  stock: number
}

async function getLowStockProducts(): Promise<LowStockProduct[]> {
  const res = await fetch('/api/seller/low-stock-products')
  if (!res.ok) {
    throw new Error('Failed to fetch low stock products')
  }
  return res.json()
}

export function LowStockAlerts() {
  const [products, setProducts] = useState<LowStockProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getLowStockProducts()
      .then(setProducts)
      .catch(() => {
        // Silently fail, don't show an error for a non-critical dashboard component
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleDeactivate = (productId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/seller/products/${productId}/deactivate`, {
          method: 'PATCH',
        })
        if (!res.ok) throw new Error('Failed to deactivate')

        toast.success('Produit désactivé.')
        setProducts((prev) => prev.filter((p) => p.id !== productId))
      } catch (error) {
        toast.error('Impossible de désactiver le produit.')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded-md bg-gray-200" />
        <div className="h-12 w-full animate-pulse rounded-md bg-gray-100" />
        <div className="h-12 w-full animate-pulse rounded-md bg-gray-100" />
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h3 className="font-bold text-gray-900">⚠️ Stocks faibles</h3>
      </div>
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex items-center justify-between gap-3 rounded-md bg-white p-2 pr-3 shadow-sm">
            <div className="flex items-center gap-3">
              <img src={product.images?.[0] || '/placeholder-image.svg'} alt={product.name} className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 object-cover" />
              <div>
                <p className="max-w-[200px] truncate text-sm font-medium text-gray-800 sm:max-w-xs">{product.name}</p>
                <p className={`text-xs font-bold ${product.stock <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                  {product.stock > 0 ? `${product.stock} restant(s)` : 'En rupture de stock'}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Link href={`/seller/products/edit/${product.id}`} className="text-nowrap rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                Réapprovisionner
              </Link>
              {product.stock <= 0 && (
                <button type="button" onClick={() => handleDeactivate(product.id)} disabled={isPending} className="text-nowrap rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Désactiver'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}