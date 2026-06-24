'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import type { InventoryProduct } from '@/app/seller/inventory/page'

function StockStatusBadge({ available, threshold }: { available: number; threshold: number }) {
  if (available <= 0) {
    return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">⛔ Rupture</span>
  }
  if (available <= threshold) {
    return <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">🟠 Critique</span>
  }
  return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">🟢 OK</span>
}

function EditableStockCell({ product, onUpdate }: { product: InventoryProduct; onUpdate: (productId: string, newStock: number) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [stock, setStock] = useState(product.stock)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setIsEditing(false)
    if (stock === product.stock) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/seller/inventory/stock', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, newStock: stock }),
        })
        if (!res.ok) throw new Error('Failed to update stock')
        toast.success(`Stock pour "${product.name}" mis à jour.`)
        onUpdate(product.id, stock)
      } catch (error) {
        toast.error('Erreur lors de la mise à jour du stock.')
        setStock(product.stock) // Revert on failure
      }
    })
  }

  if (isEditing) {
    return (
      <div className="relative">
        <input type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)} onBlur={handleSave} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="w-20 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm" autoFocus />
        {isPending && <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>
    )
  }

  return (
    <button onClick={() => setIsEditing(true)} className="w-20 rounded-md py-1 text-center hover:bg-gray-100">
      {product.stock}
    </button>
  )
}

export function InventoryTable({ initialData, isLoading }: { initialData: InventoryProduct[]; isLoading: boolean }) {
  const [products, setProducts] = useState(initialData)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setProducts(initialData)
  }, [initialData])

  const handleStockUpdate = (productId: string, newStock: number) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock, available: newStock - p.reserved } : p)))
  }

  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase()))

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par nom ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm rounded-md border-gray-200 pl-9 focus:border-emerald-400 focus:ring-emerald-400 sm:text-sm" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Produit</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Seuil</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Stock Actuel</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Réservé</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Disponible</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <img className="h-10 w-10 rounded-md object-cover" src={product.images?.[0] || '/placeholder-image.svg'} alt={product.name} />
                    </div>
                    <div className="ml-4">
                      <div className="max-w-xs truncate text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">{product.threshold}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  <EditableStockCell product={product} onUpdate={handleStockUpdate} />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">{product.reserved}</td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">{product.available}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  <StockStatusBadge available={product.available} threshold={product.threshold} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && !isLoading && (
          <div className="py-12 text-center text-gray-500">
            <p>Aucun produit trouvé.</p>
          </div>
        )}
      </div>
    </div>
  )
}