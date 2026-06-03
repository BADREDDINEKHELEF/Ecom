'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingBag, Settings, LogOut,
  Store, TrendingUp, DollarSign, Clock, Plus, ExternalLink,
  ArrowRight, CheckCircle2, Truck, AlertCircle,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts, getVendorOrders, VendorOrderSummary } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function SellerSidebar({ storeName, slug, onLogout }: { storeName: string; slug: string; onLogout: () => void }) {
  const NAV = [
    { href: '/seller/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/seller/products',  label: 'My Products',    icon: Package },
    { href: '/seller/orders',    label: 'My Orders',      icon: ShoppingBag },
    { href: '/seller/settings',  label: 'Store Settings', icon: Settings },
  ]
  const active = typeof window !== 'undefined' ? window.location.pathname : ''

  return (
    <aside className="w-60 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-20">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm truncate">{storeName}</span>
        </div>
        <span className="text-xs text-gray-500 ml-10">Seller Dashboard</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col">
        <div className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = active === href
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-gray-500'}`} />
                {label}
              </Link>
            )
          })}
        </div>
        <div className="space-y-0.5 pt-2 border-t border-gray-800">
          <a href={`/shop/${slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            View My Store
          </a>
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

// ─── Analytics helpers ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:   { label: 'Pending',   icon: Clock,         color: 'text-amber-600 bg-amber-50' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2,  color: 'text-blue-600 bg-blue-50' },
  shipped:   { label: 'Shipped',   icon: Truck,         color: 'text-indigo-600 bg-indigo-50' },
  delivered: { label: 'Delivered', icon: CheckCircle2,  color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', icon: AlertCircle,   color: 'text-red-600 bg-red-50' },
}

function processOrders(orders: VendorOrderSummary[]) {
  const monthlyMap: Record<string, number> = {}
  const productMap: Record<string, { sales: number; revenue: number }> = {}
  let pending = 0

  for (const { order, items, vendorTotal } of orders) {
    const key = new Date(order.created_at).toLocaleString('en', { month: 'short' })
    monthlyMap[key] = (monthlyMap[key] ?? 0) + vendorTotal
    if (order.status === 'pending' || order.status === 'confirmed') pending++
    for (const item of items) {
      if (!productMap[item.product_name]) productMap[item.product_name] = { sales: 0, revenue: 0 }
      productMap[item.product_name].sales += item.quantity
      productMap[item.product_name].revenue += item.subtotal
    }
  }

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = d.toLocaleString('en', { month: 'short' })
    return { month: key, revenue: monthlyMap[key] ?? 0 }
  })

  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 4)
    .map(([name, s]) => ({ name, ...s }))

  const recent = [...orders]
    .sort((a, b) => new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime())
    .slice(0, 5)

  return { monthly, topProducts, recent, pending }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [products, setProducts] = useState(0)
  const [orders, setOrders] = useState<VendorOrderSummary[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!vendor) return
    Promise.all([getVendorProducts(vendor.id), getVendorOrders(vendor.id)]).then(([prods, ords]) => {
      setProducts(prods.length)
      setOrders(ords)
    }).finally(() => setFetching(false))
  }, [vendor])

  const analytics = useMemo(() => processOrders(orders), [orders])
  const grossRevenue = orders.reduce((s, o) => s + o.vendorTotal, 0)
  const netEarnings  = grossRevenue * (1 - (vendor?.commission_rate ?? 10) / 100)
  const maxMonthly   = Math.max(...analytics.monthly.map((m) => m.revenue), 1)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!vendor) return null

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />

      <main className="flex-1 ml-60 p-8 max-w-[1200px]">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {vendor.store_name.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Store:{' '}
              <a href={`/shop/${vendor.store_slug}`} target="_blank" rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-medium">
                /shop/{vendor.store_slug}
              </a>
            </p>
          </div>
          <Link href="/seller/products?new=1"
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {[
            { label: 'Net Earnings', value: formatPrice(Math.round(netEarnings)), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', sub: `after ${vendor.commission_rate}% commission` },
            { label: 'Total Orders', value: orders.length.toLocaleString(), icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', sub: 'all time' },
            { label: 'Pending', value: analytics.pending.toLocaleString(), icon: Clock, color: 'text-amber-600 bg-amber-50', sub: 'need attention' },
            { label: 'Products', value: products.toLocaleString(), icon: Package, color: 'text-violet-600 bg-violet-50', sub: 'listed in store' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-sm text-gray-700 font-medium mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900">Revenue — Last 6 Months</h2>
              <p className="text-xs text-gray-400 mt-0.5">Gross sales from your products</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900">{formatPrice(grossRevenue)}</p>
              <p className="text-xs text-gray-400">gross total</p>
            </div>
          </div>
          {fetching || analytics.monthly.every((m) => m.revenue === 0) ? (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm">
              {fetching ? 'Loading…' : 'Revenue will appear here once you receive orders.'}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {analytics.monthly.map((m) => {
                const h = Math.max(Math.round((m.revenue / maxMonthly) * 100), m.revenue > 0 ? 6 : 0)
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    {m.revenue > 0 && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        {m.revenue >= 1000 ? `${Math.round(m.revenue / 1000)}k` : m.revenue}
                      </span>
                    )}
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-colors cursor-default"
                        style={{ height: `${h}%` }}
                        title={formatPrice(m.revenue)}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{m.month}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Orders + Top Products */}
        <div className="grid xl:grid-cols-5 gap-6 mb-6">

          {/* Recent Orders */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Recent Orders</h2>
              <Link href="/seller/orders" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {fetching ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : analytics.recent.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No orders yet. Share your store link to start selling!
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recent.map(({ order, vendorTotal }) => {
                  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                  const Icon = cfg.icon
                  return (
                    <div key={order.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{order.full_name}</p>
                        <p className="text-xs text-gray-400">{order.wilaya} · {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">{formatPrice(vendorTotal)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">Top Products</h2>
              <Link href="/seller/products" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {fetching ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : analytics.topProducts.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                Sales will appear here once orders come in.
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topProducts.map((p, i) => {
                  const pct = Math.round((p.revenue / (analytics.topProducts[0]?.revenue || 1)) * 100)
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                          <span className="text-gray-400 mr-1.5">#{i + 1}</span>{p.name}
                        </p>
                        <p className="text-xs font-bold text-gray-700 flex-shrink-0">{formatPrice(p.revenue)}</p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{p.sales} unit{p.sales !== 1 ? 's' : ''} sold</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Commission breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">Earnings Breakdown</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-black text-gray-900">{formatPrice(grossRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">Gross Sales</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-2xl font-black text-red-600">{vendor.commission_rate}%</p>
              <p className="text-sm text-gray-500 mt-1">Platform fee</p>
              <p className="text-xs text-gray-400">{formatPrice(Math.round(grossRevenue * vendor.commission_rate / 100))}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-2xl font-black text-emerald-700">{formatPrice(Math.round(netEarnings))}</p>
              <p className="text-sm text-gray-500 mt-1">You earn</p>
              <p className="text-xs text-gray-400">{100 - vendor.commission_rate}% of sales</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
