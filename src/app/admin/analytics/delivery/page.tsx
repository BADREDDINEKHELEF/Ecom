'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { Truck, RefreshCw, Download, AlertCircle } from 'lucide-react'
import { exportToCSV } from '@/lib/analytics/export'
import { useRecharts } from '@/lib/charts/useRecharts'

interface Provider {
  provider: string; total: number; delivered: number; returned: number
  avgDays: number | null; onTimeRate: number; returnRate: number
}
interface WilayaRow {
  wilaya: string; total: number; delivered: number; returned: number; returnRate: number
}
interface DeliveryData {
  providers: Provider[]; byWilaya: WilayaRow[]; days: number
}

const PERIOD_OPTIONS = [
  { label: '7 j', days: 7 }, { label: '30 j', days: 30 }, { label: '90 j', days: 90 }, { label: '1 an', days: 365 },
]

function DeliveryContent() {
  const [data, setData]   = useState<DeliveryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]   = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/delivery?days=${days}`, {
        credentials: 'include',
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = useRecharts()

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-48 animate-pulse" />
        ))}
      </div>
    )
  }

  const slowWilayas = (data?.byWilaya ?? []).filter((w) => w.returnRate > 25)

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" /> Livraison — SLA
          </h1>
          <p className="text-sm text-gray-500 mt-1">Performance par prestataire sur {data?.days} jours</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIOD_OPTIONS.map(({ label, days: d }) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => exportToCSV(data?.providers ?? [], 'livraison_prestataires')}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Slow zones alert */}
      {slowWilayas.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 mb-1">Wilayas à taux de retour élevé (&gt;25%)</p>
            <div className="flex flex-wrap gap-2">
              {slowWilayas.map((w) => (
                <span key={w.wilaya} className="text-xs bg-white border border-red-200 text-red-700 px-2.5 py-1 rounded-full font-medium">
                  {w.wilaya} — {w.returnRate}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Provider comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {(data?.providers ?? []).map((p) => (
          <div key={p.provider} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="font-bold text-gray-900 capitalize mb-3">{p.provider}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Expéditions</span>
                <span className="font-semibold">{p.total.toLocaleString('fr')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Délai moyen</span>
                <span className="font-semibold">{p.avgDays != null ? `${p.avgDays}j` : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taux livraison</span>
                <span className={`font-bold ${p.onTimeRate >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{p.onTimeRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taux retour</span>
                <span className={`font-bold ${p.returnRate > 20 ? 'text-red-600' : 'text-gray-700'}`}>{p.returnRate}%</span>
              </div>
            </div>
            {/* Mini bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.onTimeRate}%` }} />
            </div>
          </div>
        ))}
        {(data?.providers ?? []).length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl p-8 text-center text-gray-400">
            Aucune donnée de livraison pour cette période
          </div>
        )}
      </div>

      {/* On-time rate bar chart */}
      {(data?.providers ?? []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Taux de livraison par prestataire</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.providers ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: unknown) => [`${v}%`, 'Taux livraison']} />
              <Bar dataKey="onTimeRate" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Wilaya table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Retours par wilaya (top 20)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Wilaya</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Total</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Livrées</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Retours</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Taux retour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.byWilaya ?? []).map((w) => (
                <tr key={w.wilaya} className={`hover:bg-gray-50/50 ${w.returnRate > 25 ? 'bg-red-50/40' : ''}`}>
                  <td className="px-5 py-3 font-medium text-gray-900">{w.wilaya}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{w.total}</td>
                  <td className="px-5 py-3 text-right text-green-700 font-semibold">{w.delivered}</td>
                  <td className="px-5 py-3 text-right text-red-700 font-semibold">{w.returned}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-bold ${w.returnRate > 25 ? 'text-red-600' : 'text-gray-700'}`}>{w.returnRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function DeliveryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DeliveryContent />
    </Suspense>
  )
}
