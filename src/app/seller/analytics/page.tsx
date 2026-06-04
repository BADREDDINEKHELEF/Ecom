'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, RotateCcw,
  Truck, Award, Download, RefreshCw, ChevronDown, AlertTriangle
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { SellerAnalytics } from '@/lib/supabase/queries'

// ─── Colour palette ────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  yalidine: '#FF6B35', zr: '#2563EB', maystro: '#059669',
  colivraison: '#7C3AED', rex: '#DC2626', procolis: '#D97706',
  direct: '#6B7280', yassir: '#0EA5E9',
}

const WILAYA_COLOR = '#6366F1'
const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#6366F1', '#10B981', '#EF4444']

const DAYS_OPTIONS = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    blue:   'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function RevTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="font-bold mb-1">{label}</p>
      <p>{formatPrice(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SellerAnalyticsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<SellerAnalytics | null>(null)
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    if (!vendor) return
    setFetching(true)
    try {
      const res = await fetch(`/api/seller/analytics?vendorId=${vendor.id}&days=${days}`)
      const json = await res.json()
      setData(json)
    } finally {
      setFetching(false)
    }
  }, [vendor, days])

  useEffect(() => { load() }, [load])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', data.totalRevenue],
      ['Total Orders', data.totalOrders],
      ['Pending Orders', data.pendingOrders],
      ['Delivered Orders', data.deliveredOrders],
      ['Returned Orders', data.returnedOrders],
      ['Avg Order Value', data.avgOrderValue],
      ['Return Rate %', data.returnRate],
      ['', ''],
      ['Top Products', ''],
      ['Name', 'Units', 'Revenue'],
      ...data.topProducts.map((p) => [p.name, p.units, p.revenue]),
      ['', ''],
      ['Sales by Wilaya', ''],
      ['Wilaya', 'Orders', 'Revenue'],
      ...data.byWilaya.map((w) => [w.wilaya, w.orders, w.revenue]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `analytics-${days}d-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  // Status donut data
  const statusData = data ? [
    { name: 'Pending',   value: data.pendingOrders,   },
    { name: 'Delivered', value: data.deliveredOrders,  },
    { name: 'Returned',  value: data.returnedOrders,   },
    { name: 'Other',     value: Math.max(0, data.totalOrders - data.pendingOrders - data.deliveredOrders - data.returnedOrders) },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />

      <main className="flex-1 ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Performance overview for your store</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Date range picker */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {DAYS_OPTIONS.map(({ label, days: d }) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {fetching && !data ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.totalOrders === 0 ? (
          <div className="text-center py-32 text-gray-400">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">No orders in the last {days} days</p>
            <p className="text-sm mt-1">Start selling to see analytics here</p>
          </div>
        ) : (
          <>
            {/* ── KPI Row ──────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={DollarSign} label="Revenue" color="indigo"
                value={formatPrice(data.totalRevenue)}
                sub={`${data.totalOrders} orders · avg ${formatPrice(data.avgOrderValue)}`} />
              <StatCard icon={ShoppingBag} label="Orders" color="blue"
                value={String(data.totalOrders)}
                sub={`${data.pendingOrders} pending`} />
              <StatCard icon={Truck} label="Delivered" color="green"
                value={String(data.deliveredOrders)}
                sub={`${data.totalOrders > 0 ? Math.round((data.deliveredOrders / data.totalOrders) * 100) : 0}% success rate`} />
              <StatCard icon={RotateCcw} label="Return rate" color={data.returnRate > 20 ? 'red' : 'amber'}
                value={`${data.returnRate}%`}
                sub={`${data.returnedOrders} returned`} />
            </div>

            {/* ── Revenue Chart ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
              <h2 className="font-bold text-gray-900 mb-4">Revenue Over Time</h2>
              {data.monthly.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip content={<RevTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Middle Row: Orders by Status + Sales by Courier ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Orders by status — donut */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">Orders by Status</h2>
                {statusData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No status data</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                          dataKey="value" strokeWidth={0}>
                          {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {statusData.map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-bold text-gray-900">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sales by courier — pie */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 mb-4">Deliveries by Courier</h2>
                {data.byProvider.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No delivery data yet</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={data.byProvider} cx="50%" cy="50%" outerRadius={80}
                          dataKey="count" nameKey="provider" strokeWidth={0}>
                          {data.byProvider.map((p) => (
                            <Cell key={p.provider} fill={PROVIDER_COLORS[p.provider] ?? '#94a3b8'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {data.byProvider.map((p) => (
                        <div key={p.provider} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PROVIDER_COLORS[p.provider] ?? '#94a3b8' }} />
                            <span className="text-gray-600 capitalize">{p.provider}</span>
                          </div>
                          <span className="font-bold text-gray-900">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sales by Wilaya ───────────────────────────────────────────────── */}
            {data.byWilaya.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                <h2 className="font-bold text-gray-900 mb-4">Sales by Wilaya (Top 10)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byWilaya} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="wilaya" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      formatter={(value, name) => [name === 'orders' ? value : formatPrice(Number(value)), name === 'orders' ? 'Orders' : 'Revenue']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Bar dataKey="orders" fill={WILAYA_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Top Products Table ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-bold text-gray-900">Top Products by Revenue</h2>
              </div>
              {data.topProducts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No sales data yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Product', 'Units Sold', 'Revenue', 'Share'].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topProducts.map((p, i) => {
                      const share = data.totalRevenue > 0 ? Math.round((p.revenue / data.totalRevenue) * 100) : 0
                      return (
                        <tr key={p.name} className="hover:bg-gray-50">
                          <td className="px-5 py-3.5 text-gray-400 font-bold">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-gray-900 max-w-xs truncate">{p.name}</p>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">{p.units} units</td>
                          <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(p.revenue)}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 max-w-24 bg-gray-100 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── High Return Rate Warning ──────────────────────────────────────── */}
            {data.returnRate > 20 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800">High return rate detected ({data.returnRate}%)</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Industry average in Algeria is 15–20%. Consider sending a WhatsApp confirmation before dispatch,
                    improving product descriptions, and adding size guides or demo videos.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
