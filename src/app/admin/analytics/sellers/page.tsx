'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, AlertTriangle, RefreshCw, Download, ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { exportToCSV } from '@/lib/analytics/export'
import Link from 'next/link'

interface VendorRow {
  id: string; name: string; slug: string; isActive: boolean; isApproved: boolean
  joinedAt: string; subscription: string | null
  orderCount: number; gmv: number; cancelRate: number; deliveryRate: number
  lastSaleDaysAgo: number; flagged: boolean
}
interface SellersData {
  leaderboard: VendorRow[]
  newSellersThisMonth: number
}

const SUB_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial:  'bg-blue-100 text-blue-700',
  grace_period: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
}
const SUB_LABEL: Record<string, string> = {
  active: 'Actif', trial: 'Essai', grace_period: 'Grâce', expired: 'Expiré', none: 'Aucun',
}

export default function SellersPage() {
  const [data, setData]     = useState<SellersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFlagged, setShowFlagged] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/sellers', {
        headers: { 'x-admin-token': localStorage.getItem('adminToken') ?? '' },
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-64 animate-pulse" />
        ))}
      </div>
    )
  }

  const all      = data?.leaderboard ?? []
  const flagged  = all.filter((v) => v.flagged)
  const displayed = showFlagged ? flagged : all

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Store className="w-6 h-6 text-indigo-600" /> Performance vendeurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {all.length} vendeurs · {data?.newSellersThisMonth} nouveaux ce mois
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFlagged((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition-colors ${showFlagged ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            <AlertTriangle className="w-4 h-4" />
            {flagged.length} signalés
          </button>
          <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => exportToCSV(all.map((v) => ({ ...v })), 'vendeurs_performance')}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Flagged alert */}
      {flagged.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{flagged.length} vendeurs</strong> signalés : taux d&apos;annulation &gt;15% ou aucune vente depuis 45+ jours.
          </p>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">#</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Boutique</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">GMV</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Commandes</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Taux livraison</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Taux annulation</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Dernière vente</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Abonnement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((v, i) => (
                <tr key={v.id} className={`hover:bg-gray-50/50 ${v.flagged ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {v.flagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-semibold text-gray-900">{v.name}</p>
                        <Link href={`/admin/vendors`} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
                          {v.slug} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatPrice(v.gmv)} DA</td>
                  <td className="px-5 py-3 text-right text-gray-700">{v.orderCount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-semibold ${v.deliveryRate >= 70 ? 'text-green-600' : v.deliveryRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {v.deliveryRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-semibold ${v.cancelRate > 15 ? 'text-red-600' : 'text-gray-700'}`}>
                      {v.cancelRate}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-500">
                    {v.lastSaleDaysAgo === 9999 ? 'Jamais' : v.lastSaleDaysAgo === 0 ? 'Aujourd\'hui' : `il y a ${v.lastSaleDaysAgo}j`}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SUB_BADGE[v.subscription ?? 'none'] ?? 'bg-gray-100 text-gray-500'}`}>
                      {SUB_LABEL[v.subscription ?? 'none'] ?? v.subscription ?? 'Aucun'}
                    </span>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Aucun vendeur</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
