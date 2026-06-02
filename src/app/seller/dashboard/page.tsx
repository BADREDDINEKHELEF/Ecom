'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store, TrendingUp, DollarSign, Eye, Plus, ExternalLink } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts, getVendorOrders } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'

function SellerSidebar({ storeName, onLogout }: { storeName: string; onLogout: () => void }) {
  const NAV = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/seller/orders', label: 'My Orders', icon: ShoppingBag },
    { href: '/seller/settings', label: 'Store Settings', icon: Settings },
  ]
  return (
    <aside className="w-60 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-20">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm truncate">{storeName}</span>
        </div>
        <span className="text-xs text-gray-500 ml-10">Seller Dashboard</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 flex flex-col">
        <div className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
              <Icon className="w-4 h-4 text-gray-500" />
              {label}
            </Link>
          ))}
        </div>
        <div className="space-y-0.5 pt-2 border-t border-gray-800">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            View Store
          </Link>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4 text-gray-500" />
            Logout
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default function SellerDashboardPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, views: 0 })

  useEffect(() => {
    if (!vendor) return
    Promise.all([getVendorProducts(vendor.id), getVendorOrders(vendor.id)]).then(([products, orders]) => {
      const revenue = orders.reduce((s, o) => s + o.vendorTotal, 0)
      setStats({ products: products.length, orders: orders.length, revenue, views: 0 })
    })
  }, [vendor])

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <SellerSidebar storeName={vendor.store_name} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Welcome back, {vendor.store_name}!</h1>
            <p className="text-gray-500 text-sm mt-1">
              Your store: <a href={`/shop/${vendor.store_slug}`} target="_blank" className="text-emerald-600 hover:underline font-medium">shopdz.dz/shop/{vendor.store_slug}</a>
            </p>
          </div>
          <Link href="/seller/products?new=1"
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Revenue', value: formatPrice(stats.revenue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Total Orders', value: stats.orders.toString(), icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
            { label: 'Products Listed', value: stats.products.toString(), icon: Package, color: 'text-violet-600 bg-violet-50' },
            { label: 'Store Views', value: '—', icon: Eye, color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Commission info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">Commission Structure</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-black text-gray-900">{vendor.commission_rate}%</p>
              <p className="text-sm text-gray-500 mt-1">Platform commission</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-2xl font-black text-emerald-700">{100 - vendor.commission_rate}%</p>
              <p className="text-sm text-gray-500 mt-1">You keep</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-black text-gray-900">{formatPrice(stats.revenue * (1 - vendor.commission_rate / 100))}</p>
              <p className="text-sm text-gray-500 mt-1">Your earnings</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: '/seller/products?new=1', label: 'Add New Product', icon: Package, color: 'bg-emerald-600 hover:bg-emerald-700' },
            { href: '/seller/orders', label: 'View Orders', icon: ShoppingBag, color: 'bg-blue-600 hover:bg-blue-700' },
            { href: `/shop/${vendor.store_slug}`, label: 'Preview My Store', icon: ExternalLink, color: 'bg-gray-700 hover:bg-gray-800' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className={`flex items-center justify-center gap-2 ${color} text-white font-bold py-4 rounded-xl transition-colors`}>
              <Icon className="w-5 h-5" /> {label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
