'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Search, AlertCircle, Download, RefreshCw } from 'lucide-react'
import { exportToCSV } from '@/lib/analytics/export'

interface SearchTerm {
  term: string; count: number; avgResults: number; zeroResultCount: number; zeroResultPct: number
}
interface SearchData {
  terms: SearchTerm[]; zeroResultTerms: SearchTerm[]; totalSearches: number; days: number
}

const PERIOD_OPTIONS = [
  { label: '7 j', days: 7 }, { label: '30 j', days: 30 }, { label: '90 j', days: 90 },
]

export default function SearchAnalyticsPage() {
  const [data, setData]   = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays]   = useState(7)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics/search?days=${days}`, {
        headers: { 'x-admin-token': localStorage.getItem('adminToken') ?? '' },
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => { load() }, [load])

  const Skeleton = () => (
    <div className="p-4 sm:p-8 space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-64 animate-pulse" />
      ))}
    </div>
  )
  if (loading && !data) return <Skeleton />

  const top20 = (data?.terms ?? []).slice(0, 20)

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-600" /> Analyses de recherche
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.totalSearches.toLocaleString('fr')} recherches sur {data?.days} jours
          </p>
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
          <button onClick={() => exportToCSV(data?.terms ?? [], 'recherches')}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Zero-result alert */}
      {(data?.zeroResultTerms ?? []).length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <h2 className="font-bold text-red-900">Recherches sans résultat — lacunes catalogue</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(data?.zeroResultTerms ?? []).slice(0, 12).map((t) => (
              <div key={t.term} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <span className="font-medium text-gray-900 truncate">&ldquo;{t.term}&rdquo;</span>
                <span className="text-xs font-bold text-red-600 flex-shrink-0">{t.zeroResultCount}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top searches bar chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4">Top 20 recherches</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={top20} layout="vertical" margin={{ left: 80, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="term" tick={{ fontSize: 11 }} width={80} />
            <Tooltip
              formatter={(v: unknown, name: unknown) =>
                name === 'count' ? [`${v} recherches`, 'Recherches'] : [`${v}`, `${name}`]}
            />
            <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Détail par terme</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Terme</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Recherches</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Moy. résultats</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Sans résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.terms ?? []).map((t) => (
                <tr key={t.term} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.term}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{t.count.toLocaleString('fr')}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{t.avgResults}</td>
                  <td className="px-5 py-3 text-right">
                    {t.zeroResultCount > 0
                      ? <span className="text-red-600 font-semibold">{t.zeroResultCount} ({t.zeroResultPct}%)</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                </tr>
              ))}
              {(data?.terms ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Aucune donnée de recherche pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
