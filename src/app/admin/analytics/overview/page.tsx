'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ShoppingBag, DollarSign, Store, RefreshCw, Zap,
  TrendingUp, CreditCard, MapPin,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface FeedItem {
  id: string; total: number; wilaya: string | null; status: string
  method: string; createdAt: string
}
interface OverviewData {
  today: {
    orders: number; gmv: number; avgBasket: number; codRate: number; newVendors: number
  }
  feed: FeedItem[]
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'COD', card: 'Carte', edahabia: 'Edahabia', cib: 'CIB', baridimob: 'BaridiMob',
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `il y a ${s}s`
  if (s < 3600) return `il y a ${Math.floor(s / 60)}min`
  return `il y a ${Math.floor(s / 3600)}h`
}

function KpiCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-black text-gray-900 mt-0.5 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function OverviewPage() {
  const [data, setData]       = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/overview', {
        
      })
      if (res.ok) {
        setData(await res.json())
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 30 seconds for realtime feel
    intervalRef.current = setInterval(load, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [load])

  if (loading && !data) {
    return (
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm h-96 animate-pulse" />
      </div>
    )
  }

  const d = data

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" /> Temps réel
          </h1>
          <p className="text-gray-500 text-sm">Aujourd&apos;hui — mise à jour auto toutes les 30s</p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && <p className="text-xs text-gray-400">{timeAgo(lastRefresh.toISOString())}</p>}
          <button onClick={load}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={ShoppingBag} label="Commandes aujourd'hui" value={String(d?.today.orders ?? 0)} color="indigo" />
        <KpiCard icon={DollarSign}  label="GMV aujourd'hui"  value={formatPrice(d?.today.gmv ?? 0)} sub="DZD" color="green" />
        <KpiCard icon={CreditCard}  label="Panier moyen"     value={formatPrice(d?.today.avgBasket ?? 0)} color="violet" />
        <KpiCard icon={TrendingUp}  label="Taux COD"         value={`${d?.today.codRate ?? 0}%`} color="amber" />
      </div>

      {/* Live Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 p-5 border-b border-gray-50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h2 className="font-bold text-gray-900">Flux en direct</h2>
          <span className="text-xs text-gray-400 ml-auto">{d?.feed.length ?? 0} dernières commandes</span>
        </div>
        <div className="divide-y divide-gray-50">
          {(d?.feed ?? []).length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">Aucune commande récente</div>
          )}
          {(d?.feed ?? []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {item.wilaya && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" /> {item.wilaya}
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {METHOD_LABEL[item.method] ?? item.method}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 text-sm">{formatPrice(item.total)} DA</p>
                <p className="text-xs text-gray-400">{timeAgo(item.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
