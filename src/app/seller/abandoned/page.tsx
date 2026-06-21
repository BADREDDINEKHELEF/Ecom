'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingCart, TrendingUp, MapPin, Calendar,
  RefreshCw, AlertTriangle, CheckCircle,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import SellerSidebar from '@/components/seller/SellerSidebar'

interface AbandonedAnalytics {
  totalAbandoned: number
  recovered:      number
  recoveryRate:   number
  totalValue:     number
  byWilaya: { wilaya: string; count: number; value: number }[]
  byDay:    { date: string;   count: number }[]
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${bg[color]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function SellerAbandonedPage() {
  const { vendor, loading: authLoading, signOut } = useSellerAuth()
  const [data, setData]           = useState<AbandonedAnalytics | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!vendor) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/seller/abandoned-analytics')
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch {
      setError('Impossible de charger les données abandonnées.')
    } finally {
      setLoading(false)
    }
  }, [vendor])

  useEffect(() => { if (!authLoading && vendor) fetchData() }, [authLoading, vendor, fetchData])

  if (authLoading || !vendor) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerSidebar
        storeName={vendor.store_name}
        slug={vendor.store_slug}
        onLogout={signOut}
        logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <main className="lg:ml-64 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paniers abandonnés</h1>
            <p className="text-sm text-gray-500 mt-0.5">30 derniers jours</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-20 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={ShoppingCart} label="Abandonnés"   value={String(data.totalAbandoned)} color="red" />
              <StatCard icon={CheckCircle}  label="Récupérés"    value={String(data.recovered)} color="green" />
              <StatCard icon={TrendingUp}   label="Taux récup."  value={`${data.recoveryRate}%`} color="indigo" />
              <StatCard icon={TrendingUp}   label="Valeur perdue" value={formatPrice(data.totalValue)} color="amber" />
            </div>

            {/* Daily chart */}
            {data.byDay.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  Abandons par jour (14 derniers jours)
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [`${v} abandons`, '']} labelFormatter={(l) => `Date : ${l}`} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Abandons" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By wilaya */}
            {data.byWilaya.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  Top wilayas abandonnées
                </h2>
                <div className="space-y-3">
                  {data.byWilaya.map((row) => {
                    const pct = data.totalAbandoned > 0 ? Math.round((row.count / data.totalAbandoned) * 100) : 0
                    return (
                      <div key={row.wilaya} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-28 truncate">{row.wilaya}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{row.count}</span>
                        <span className="text-xs text-gray-400 w-20 text-right">{formatPrice(row.value)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {data.totalAbandoned === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucun panier abandonné ces 30 derniers jours.</p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}
