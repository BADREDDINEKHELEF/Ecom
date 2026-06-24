'use client'

import { useState, useEffect } from 'react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { InventoryTable } from '@/components/seller/inventory/InventoryTable'
import type { InventoryProduct } from '@/components/seller/inventory/InventoryTable'
import { Menu } from 'lucide-react'

export default function SellerInventoryPage() {
  const { vendor, loading: authLoading, signOut } = useSellerAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inventoryData, setInventoryData] = useState<InventoryProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchInventory() {
      if (!vendor) return
      setIsLoading(true)
      try {
        const res = await fetch('/api/seller/inventory')
        if (!res.ok) throw new Error('Failed to fetch inventory')
        const data = await res.json()
        setInventoryData(data)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInventory()
  }, [vendor])

  if (authLoading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>

      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} logoUrl={vendor.logo_url} subscriptionStatus={vendor.subscription_status} isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} onLogout={signOut} />
      <main className="lg:ml-64 flex-1">
        <div className="p-4 sm:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-black text-gray-900">Inventaire</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez les niveaux de stock de tous vos produits en un seul endroit.</p>
          </div>
          <InventoryTable initialData={inventoryData} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}