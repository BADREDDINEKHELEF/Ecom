'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Truck,
  Users, Package, CreditCard, RefreshCw, Download, ArrowRight,
  Store, BarChart2, MapPin, Star,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { AdminStats } from '@/lib/supabase/analytics'
import { useT } from '@/lib/store/langStore'

const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6']

const PERIOD_OPTIONS = [
  { label: '7 j',  days: 7  },
  { label: '30 j', days: 30 },
  { label: '90 j', days: 90 },
  { label: '1 an', days: 365 },
]

type Tab = 'overview' | 'vendors' | 'geography'

function GrowthBadge({ pct }: { pct: number }) {
  if (pct === 0) return null
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
      up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function KpiCard({
  icon: Icon, label, value, sub, color = 'indigo', growth,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color?: string
  growth?: number
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
    blue:   'bg-blue-50 text-blue-600',
    emerald:'bg-emerald-50 text-emerald-600',
    pink:   'bg-pink-50 text-pink-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color] ?? bg.indigo}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-2xl font-black text-gray-900">{value}</p>
          {growth !== undefined && <GrowthBadge pct={growth} />}
        </div>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function RevTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg space-y-1">
      <p className="font-bold">{label}</p>
      {payload.map((p, i) => (
        <p key={i}>{i === 0 ? formatPrice(p.value) : `${p.value}`}</p>
      ))}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const t = useT()
  const a = t.admin

  const [days, setDays]   = useState(30)
  const [tab, setTab]     = useState<Tab>('overview')
  const [data, setData]   = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`, {
        headers: { 'x-admin-token': localStorage.getItem('adminToken') ?? '' },
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse mb-8" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm h-72 animate-pulse" />
      </div>
    )
  }

  const d = data

  return (
    <div className="p-4 sm:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" /> {a.analyticsTitle}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{a.analyticsSubtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIOD_OPTIONS.map(({ label, days: d }) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={load} className="border border-gray-200 bg-white p-2 rounded-xl text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a href="/api/admin/analytics/export"
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" /> {a.exportCsv}
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {([
          ['overview',   BarChart2, a.tabOverview],
          ['vendors',    Store,     a.tabVendors],
          ['geography',  MapPin,    a.tabGeography],
        ] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {!d ? (
        <div className="text-center py-24 text-gray-400">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{a.cannotLoad}</p>
          <button onClick={load} className="mt-4 text-indigo-600 text-sm font-semibold hover:underline">{a.retryAction}</button>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                <KpiCard icon={DollarSign} label={a.revenue} color="indigo"
                  value={formatPrice(d.totalRevenue)} growth={d.revenueGrowth}
                  sub={`moy. ${formatPrice(d.avgOrderValue)} / ${a.orders.toLowerCase()}`} />
                <KpiCard icon={ShoppingBag} label={a.orders} color="blue"
                  value={d.totalOrders.toLocaleString('fr-DZ')} growth={d.ordersGrowth} />
                <KpiCard icon={Truck} label={a.colDelivRate} color="green"
                  value={`${d.deliveryRate}%`} />
                <KpiCard icon={CreditCard} label="MRR" color="violet"
                  value={formatPrice(d.mrr)}
                  sub={`${d.activeSubscriptions} ${a.subActive.toLowerCase()}`} />
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <KpiCard icon={Users} label={a.activeVendors} color="emerald"
                  value={d.activeVendors.toLocaleString()}
                  sub={`+${d.newVendorsThisMonth} · ${d.totalVendors} ${a.vendors.toLowerCase()}`} />
                <KpiCard icon={Package} label={a.publishedProducts} color="amber"
                  value={d.totalProducts.toLocaleString()} />
                <KpiCard icon={Star} label={a.verifiedVendors} color="pink"
                  value="—" />
                <KpiCard icon={TrendingUp} label={a.analytics} color={d.revenueGrowth >= 0 ? 'green' : 'red'}
                  value={`${d.revenueGrowth > 0 ? '+' : ''}${d.revenueGrowth}%`}
                  sub={`vs ${days} j`} />
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                <h2 className="font-bold text-gray-900 mb-4">{a.revenue6m}</h2>
                {d.monthly.every((m) => m.revenue === 0) ? (
                  <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                    {a.noDataPeriod}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={d.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip content={<RevTooltip />} />
                      <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#adminGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                <h2 className="font-bold text-gray-900 mb-4">{a.ordersByWilaya}</h2>
                {d.monthly.every((m) => m.orders === 0) ? (
                  <div className="h-40 flex items-center justify-center text-gray-400 text-sm">{a.noData}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={d.monthly} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(v) => [v, a.orders]}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="orders" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <Link href="/admin/analytics/cod"
                className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-5 hover:bg-indigo-100 transition-colors group mb-5">
                <div>
                  <p className="font-bold text-indigo-900">{a.analytics} COD →</p>
                  <p className="text-sm text-indigo-600 mt-0.5">
                    {a.colDelivRate} · {a.exportCsv}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </>
          )}

          {/* VENDORS TAB */}
          {tab === 'vendors' && (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <KpiCard icon={Users}    label={a.vendors}       color="indigo" value={d.totalVendors.toLocaleString()} />
                <KpiCard icon={Store}    label={a.activeVendors} color="green"  value={d.activeVendors.toLocaleString()} />
                <KpiCard icon={TrendingUp} label={a.thisMonth}   color="amber"  value={String(d.newVendorsThisMonth)} />
                <KpiCard icon={CreditCard} label="MRR"           color="violet" value={formatPrice(d.mrr)}
                  sub={`${d.activeSubscriptions} ${a.subActive.toLowerCase()}`} />
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h2 className="font-bold text-gray-900">{a.topVendors}</h2>
                  <span className="ml-auto text-xs text-gray-400">{days} j</span>
                </div>
                {d.topVendors.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {a.noDataPeriod}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['#', a.colStore, a.orders, a.revenue, a.colRevShare, a.colDelivRate].map((h) => (
                            <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {d.topVendors.map((v, i) => {
                          const share = d.totalRevenue > 0 ? Math.round((v.revenue / d.totalRevenue) * 100) : 0
                          return (
                            <tr key={v.id} className="hover:bg-gray-50">
                              <td className="px-5 py-4 font-black text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-5 py-4">
                                <Link href={`/store/${v.slug}`} target="_blank"
                                  className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                                  {v.name}
                                </Link>
                                <p className="text-xs text-gray-400">{v.slug}</p>
                              </td>
                              <td className="px-5 py-4 font-bold text-gray-700">{v.orders}</td>
                              <td className="px-5 py-4 font-black text-indigo-600">{formatPrice(v.revenue)}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-100 rounded-full h-1.5 flex-shrink-0">
                                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500 tabular-nums">{share}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                  v.deliveryRate >= 70 ? 'bg-green-100 text-green-700'
                                  : v.deliveryRate >= 50 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                  {v.deliveryRate}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {d.topVendors.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="font-bold text-gray-900 mb-4">{a.topVendors} (Top 8)</h2>
                  <div className="flex items-center gap-8">
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={d.topVendors.slice(0, 8)}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          dataKey="revenue" nameKey="name"
                          strokeWidth={0}
                        >
                          {d.topVendors.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatPrice(Number(v ?? 0))}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1 min-w-0">
                      {d.topVendors.slice(0, 8).map((v, i) => (
                        <div key={v.id} className="flex items-center justify-between text-sm gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="text-gray-700 truncate">{v.name}</span>
                          </div>
                          <span className="font-bold text-gray-900 tabular-nums flex-shrink-0">{formatPrice(v.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* GEOGRAPHY TAB */}
          {tab === 'geography' && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <div className="bg-white rounded-2xl p-6 shadow-sm xl:col-span-2">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-500" /> {a.ordersByWilaya} (Top 15)
                  </h2>
                  {d.byWilaya.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                      {a.noData}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={d.byWilaya} layout="vertical" margin={{ left: 100, right: 60, top: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="wilaya" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={95} />
                        <Tooltip
                          formatter={(v, name) => [name === 'orders' ? String(v) : formatPrice(Number(v ?? 0)), name === 'orders' ? a.orders : a.revenue]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="orders" fill="#6366F1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <h2 className="font-bold text-gray-900">{a.colWilaya}</h2>
                </div>
                {d.byWilaya.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">{a.noData}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['#', a.colWilaya, a.orders, a.revenue, a.colRevShare, a.colAvgCart].map((h) => (
                            <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {d.byWilaya.map((w, i) => {
                          const total = d.byWilaya.reduce((s, x) => s + x.orders, 0)
                          const share = total > 0 ? Math.round((w.orders / total) * 100) : 0
                          const avg   = w.orders > 0 ? Math.round(w.revenue / w.orders) : 0
                          return (
                            <tr key={w.wilaya} className="hover:bg-gray-50">
                              <td className="px-5 py-3.5 font-black text-gray-400 text-xs">{i + 1}</td>
                              <td className="px-5 py-3.5 font-semibold text-gray-900">{w.wilaya}</td>
                              <td className="px-5 py-3.5 font-bold text-gray-700">{w.orders}</td>
                              <td className="px-5 py-3.5 font-black text-indigo-600">{formatPrice(w.revenue)}</td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500 tabular-nums">{share}%</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 text-gray-600">{formatPrice(avg)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
