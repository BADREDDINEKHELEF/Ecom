'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Clock,
  Package, Plus, ArrowRight, CheckCircle2, Truck, AlertCircle,
  Users, Award, AlertTriangle, Zap, Bell,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts } from '@/lib/supabase/products'
import { type VendorOrderSummary } from '@/lib/supabase/orders'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { formatPrice } from '@/lib/utils'
import { useT } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { Product } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string }> = {
  pending:   { icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  confirmed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
  shipped:   { icon: Truck,        color: 'text-indigo-600 bg-indigo-50' },
  delivered: { icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { icon: AlertCircle,  color: 'text-red-600 bg-red-50' },
}

// ─── Analytics ────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5

function urgentPendingOrders(orders: VendorOrderSummary[]) {
  return orders.filter((o) => {
    if (o.order.status !== 'pending') return false
    const ageH = (Date.now() - new Date(o.order.created_at).getTime()) / 3_600_000
    return ageH >= 2
  })
}

function processOrders(orders: VendorOrderSummary[], allProducts: Product[]) {
  const monthlyMap: Record<string, number> = {}
  const productMap: Record<string, { id: string; sales: number; revenue: number }> = {}
  const customerMap: Record<string, { name: string; wilaya: string; orders: number; spend: number }> = {}
  const deliveryMap: Record<string, number> = {}
  let pending = 0

  for (const { order, items, vendorTotal } of orders) {
    // Monthly
    const key = new Date(order.created_at).toLocaleString('en', { month: 'short' })
    monthlyMap[key] = (monthlyMap[key] ?? 0) + vendorTotal

    // Pending
    if (order.status === 'pending' || order.status === 'confirmed') pending++

    // Products (keyed by product_id for worst-seller cross-reference)
    for (const item of items) {
      const pid = item.product_id ?? item.product_name
      if (!productMap[pid]) productMap[pid] = { id: item.product_id ?? '', sales: 0, revenue: 0 }
      productMap[pid].sales += item.quantity
      productMap[pid].revenue += item.subtotal
    }

    // Customers (group by phone)
    const phone = order.phone
    if (!customerMap[phone]) customerMap[phone] = { name: order.full_name, wilaya: order.wilaya, orders: 0, spend: 0 }
    customerMap[phone].orders++
    customerMap[phone].spend += vendorTotal

    // Delivery provider
    if (order.delivery_provider) {
      deliveryMap[order.delivery_provider] = (deliveryMap[order.delivery_provider] ?? 0) + 1
    }
  }

  // Monthly chart — last 6 months
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = d.toLocaleString('en', { month: 'short' })
    return { month: key, revenue: monthlyMap[key] ?? 0 }
  })

  // Best sellers — by revenue from orders
  const soldIds = new Set(Object.keys(productMap))
  const bestSellers = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([key, s]) => {
      const prod = allProducts.find((p) => p.id === s.id || p.id === key)
      return { name: prod?.name ?? key, sales: s.sales, revenue: s.revenue, image: prod?.images[0] }
    })

  // Worst sellers — products with ZERO sales
  const worstSellers = allProducts
    .filter((p) => !soldIds.has(p.id))
    .slice(0, 4)

  // Top customers
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)

  // Delivery breakdown
  const totalDelivered = Object.values(deliveryMap).reduce((s, n) => s + n, 0)
  const deliveryBreakdown = Object.entries(deliveryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => {
      const provider = DELIVERY_PROVIDERS.find((p) => p.id === id)
      return { id, name: provider?.name ?? id, color: provider?.color ?? '#6b7280', count, pct: Math.round((count / totalDelivered) * 100) }
    })

  // Recent 5 orders
  const recent = [...orders]
    .sort((a, b) => new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime())
    .slice(0, 5)

  return { monthly, bestSellers, worstSellers, topCustomers, deliveryBreakdown, recent, pending }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const t = useT()
  const sd = t.sellerDash
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<VendorOrderSummary[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!vendor) return
    Promise.all([
      getVendorProducts(vendor.id),
      fetch('/api/seller/orders').then((r) => r.json()).then((d) => d.orders as VendorOrderSummary[]),
    ])
      .then(([prods, ords]) => { setAllProducts(prods); setOrders(ords) })
      .finally(() => setFetching(false))
  }, [vendor])

  const analytics    = useMemo(() => processOrders(orders, allProducts), [orders, allProducts])
  const grossRevenue = orders.reduce((s, o) => s + o.vendorTotal, 0)
  const netEarnings  = grossRevenue * (1 - (vendor?.commission_rate ?? 10) / 100)
  const maxMonthly   = Math.max(...analytics.monthly.map((m) => m.revenue), 1)
  const hour         = new Date().getHours()
  const greeting     = hour < 12 ? sd.goodMorning : hour < 18 ? sd.goodAfternoon : sd.goodEvening
  const urgentOrders = useMemo(() => urgentPendingOrders(orders), [orders])
  const lowStockProds = useMemo(
    () => allProducts.filter((p) => p.stock >= 0 && p.stock <= LOW_STOCK_THRESHOLD),
    [allProducts]
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!vendor) return null

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{greeting}, {vendor.store_name.split(' ')[0]} 👋</h1>
            <p className="text-gray-500 text-sm mt-1">
              {t.sellerDash.viewMyStore}:{' '}
              <a href={`/shop/${vendor.store_slug}`} target="_blank" rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-medium">/shop/{vendor.store_slug}</a>
            </p>
          </div>
          <Link href="/seller/products?new=1"
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> {sd.addProduct}
          </Link>
        </div>

        {/* Urgency strip — orders waiting > 2h */}
        {urgentOrders.length > 0 && (
          <div className="mb-5 flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-red-800">
                  {urgentOrders.length} commande{urgentOrders.length > 1 ? 's' : ''} non confirmée{urgentOrders.length > 1 ? 's' : ''} depuis +2h
                </p>
                <p className="text-xs text-red-600 mt-0.5">Les acheteurs attendent une réponse — confirmez ou annulez maintenant.</p>
              </div>
            </div>
            <Link href="/seller/orders?status=pending"
              className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              Confirmer maintenant →
            </Link>
          </div>
        )}

        {/* Low stock alerts */}
        {!fetching && lowStockProds.length > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-black text-amber-800">Stocks critiques ({lowStockProds.length} produit{lowStockProds.length > 1 ? 's' : ''})</p>
              </div>
              <Link href="/seller/products" className="text-xs font-bold text-amber-700 hover:underline">Gérer le stock →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lowStockProds.slice(0, 4).map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className={`text-sm font-black mt-1 ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock === 0 ? 'Rupture' : `${p.stock} restant${p.stock > 1 ? 's' : ''}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {[
            { label: sd.netEarnings, value: formatPrice(Math.round(netEarnings)), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50', sub: sd.afterCommission.replace('{n}', String(vendor.commission_rate)) },
            { label: sd.totalOrders, value: orders.length.toLocaleString(), icon: ShoppingBag, color: 'text-blue-600 bg-blue-50', sub: sd.allTime },
            { label: sd.pending, value: analytics.pending.toLocaleString(), icon: Clock, color: analytics.pending > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50', sub: sd.needAttention },
            { label: sd.products, value: allProducts.length.toLocaleString(), icon: Package, color: 'text-violet-600 bg-violet-50', sub: sd.listedInStore },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900">{sd.revenueChart}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{sd.grossSalesFrom}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900">{formatPrice(grossRevenue)}</p>
              <p className="text-xs text-gray-400">{sd.grossTotal}</p>
            </div>
          </div>
          {fetching || analytics.monthly.every((m) => m.revenue === 0) ? (
            <div className="h-36 flex items-center justify-center text-gray-300 text-sm">
              {fetching ? sd.loadingChart : sd.noRevenueYet}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {analytics.monthly.map((m, i) => {
                const prev = analytics.monthly[i - 1]?.revenue ?? 0
                const up = m.revenue >= prev
                const h = Math.max(Math.round((m.revenue / maxMonthly) * 100), m.revenue > 0 ? 4 : 0)
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    {m.revenue > 0 && (
                      <div className="flex items-center gap-0.5">
                        {prev > 0 && (up
                          ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                          : <TrendingDown className="w-3 h-3 text-red-400" />)}
                        <span className="text-[10px] text-gray-500 font-medium">
                          {m.revenue >= 1000 ? `${Math.round(m.revenue / 1000)}k` : m.revenue}
                        </span>
                      </div>
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

        {/* Best Sellers + Recent Orders */}
        <div className="grid xl:grid-cols-5 gap-6 mb-6">

          {/* Best Sellers */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">{sd.bestSellers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.bestSellers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noSalesYet}</p>
            ) : (
              <div className="space-y-4">
                {analytics.bestSellers.map((p, i) => {
                  const pct = Math.round((p.revenue / (analytics.bestSellers[0]?.revenue || 1)) * 100)
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                          <span className="text-emerald-500 font-bold mr-1.5">#{i + 1}</span>{p.name}
                        </p>
                        <p className="text-xs font-bold text-gray-700 flex-shrink-0">{formatPrice(p.revenue)}</p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(p.sales === 1 ? sd.unitsSold : sd.unitsSoldPlural).replace('{n}', String(p.sales))}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{sd.recentOrders}</h2>
              <Link href="/seller/orders" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                {sd.viewAll} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noOrdersYet}</p>
            ) : (
              <div className="space-y-2">
                {analytics.recent.map(({ order, vendorTotal }) => {
                  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                  const Icon = cfg.icon
                  return (
                    <div key={order.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{order.full_name}</p>
                        <p className="text-xs text-gray-400">{order.wilaya} · {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(vendorTotal)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Worst Sellers + Top Customers */}
        <div className="grid xl:grid-cols-2 gap-6 mb-6">

          {/* Worst Sellers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-gray-900">{sd.worstSellers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.worstSellers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">{sd.allProductsSold}</p>
            ) : (
              <>
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">{sd.noSalesProducts}</p>
                <div className="space-y-3">
                  {analytics.worstSellers.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category} · {formatPrice(p.price)}</p>
                      </div>
                      <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">0 sales</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-gray-900">{sd.topCustomers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.topCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noOrdersYet}</p>
            ) : (
              <div className="space-y-3">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.wilaya} · {sd.customerOrders.replace('{n}', String(c.orders))}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(c.spend)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Breakdown + Earnings */}
        <div className="grid xl:grid-cols-2 gap-6">

          {/* Delivery Company Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">{sd.deliveryBreakdown}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.deliveryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noDeliveryData}</p>
            ) : (
              <div className="space-y-4">
                {analytics.deliveryBreakdown.map((d) => (
                  <div key={d.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-sm font-medium text-gray-800">{d.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {sd.deliveryOrders.replace('{n}', String(d.count))} · {d.pct}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Earnings Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">{sd.earningsBreakdown}</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-lg font-black text-gray-900">{formatPrice(grossRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{sd.grossSalesLabel}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-lg font-black text-red-600">{vendor.commission_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">{sd.platformFee}</p>
                <p className="text-xs text-red-400 mt-0.5">{formatPrice(Math.round(grossRevenue * vendor.commission_rate / 100))}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-lg font-black text-emerald-700">{formatPrice(Math.round(netEarnings))}</p>
                <p className="text-xs text-gray-500 mt-1">{sd.youEarn}</p>
                <p className="text-xs text-emerald-500 mt-0.5">{sd.ofSales.replace('{n}', String(100 - vendor.commission_rate))}</p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
