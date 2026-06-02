'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store, ExternalLink, Search, Loader2 } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorOrders } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'
import type { VendorOrderSummary } from '@/lib/supabase/queries'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function SellerSidebar({ storeName, onLogout }: { storeName: string; onLogout: () => void }) {
  const NAV = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/seller/orders', label: 'My Orders', icon: ShoppingBag, active: true },
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
          {NAV.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}>
              <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500'}`} />
              {label}
            </Link>
          ))}
        </div>
        <div className="space-y-0.5 pt-2 border-t border-gray-800">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4 text-gray-500" /> View Store
          </Link>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4 text-gray-500" /> Logout
          </button>
        </div>
      </nav>
    </aside>
  )
}

export default function SellerOrdersPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [orders, setOrders] = useState<VendorOrderSummary[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    getVendorOrders(vendor.id).then((data) => { setOrders(data); setLoadingOrders(false) })
  }, [vendor])

  const filtered = orders.filter((o) =>
    o.order.full_name.toLowerCase().includes(search.toLowerCase()) ||
    o.order.phone.includes(search) ||
    o.order.wilaya.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex min-h-screen">
      <SellerSidebar storeName={vendor.store_name} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Orders containing your products</p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, wilaya…"
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{orders.length === 0 ? 'No orders yet' : 'No results'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(({ order, items, vendorTotal }) => (
                <div key={order.id}>
                  <button
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 text-sm">{order.full_name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{order.phone} · {order.wilaya} · {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900">{formatPrice(vendorTotal)}</p>
                      <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </button>

                  {expanded === order.id && (
                    <div className="px-5 pb-4 bg-gray-50">
                      <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                            <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                            <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
                        <span>Your total</span>
                        <span className="text-emerald-600">{formatPrice(vendorTotal)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        After {vendor.commission_rate}% commission: {formatPrice(vendorTotal * (1 - vendor.commission_rate / 100))}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
