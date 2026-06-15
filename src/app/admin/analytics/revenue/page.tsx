'use client'

import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, RefreshCw, Download, CheckCircle, Clock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { exportToCSV } from '@/lib/analytics/export'

interface VendorCommission {
  id: string; name: string; slug: string
  pendingAmount: number; paidAmount: number; orderCount: number
}
interface RecentCommission {
  id: string; vendorName: string; orderTotal: number
  commissionAmount: number; commissionRate: number
  status: string; createdAt: string; paidAt: string | null
}
interface RevenueData {
  totalPending: number
  totalPaid: number
  byVendor: VendorCommission[]
  monthly: { month: string; amount: number }[]
  recent: RecentCommission[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" /> Payé
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" /> En attente
    </span>
  )
}

export default function RevenuePage() {
  const [data, setData]     = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/revenue', {
        headers: { 'x-admin-token': localStorage.getItem('adminToken') ?? '' },
      })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markPaid = async (id: string) => {
    setPaying(id)
    try {
      const res = await fetch('/api/admin/analytics/revenue', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem('adminToken') ?? '',
        },
        body: JSON.stringify({ id }),
      })
      if (res.ok) await load()
    } finally {
      setPaying(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-48 animate-pulse" />
        ))}
      </div>
    )
  }

  const exportRows = (data?.recent ?? []).map((r) => ({
    vendeur: r.vendorName,
    montant_commande: r.orderTotal,
    taux: `${r.commissionRate}%`,
    commission: r.commissionAmount,
    statut: r.status,
    date: r.createdAt.slice(0, 10),
  }))

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-indigo-600" /> Revenus & Commissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Commissions plateforme sur les ventes vendeurs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => exportToCSV(exportRows, 'commissions')}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">En attente de paiement</p>
          <p className="text-3xl font-black text-amber-600 mt-1">{formatPrice(data?.totalPending ?? 0)} DA</p>
          <p className="text-xs text-gray-400 mt-1">{(data?.byVendor ?? []).filter((v) => v.pendingAmount > 0).length} vendeurs concernés</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total payé (cumulé)</p>
          <p className="text-3xl font-black text-green-600 mt-1">{formatPrice(data?.totalPaid ?? 0)} DA</p>
          <p className="text-xs text-gray-400 mt-1">Sur toutes les périodes</p>
        </div>
      </div>

      {/* Monthly chart */}
      {(data?.monthly ?? []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Commissions par mois (12 derniers mois)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.monthly ?? []}>
              <defs>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: unknown) => [`${formatPrice(Number(v))} DA`, 'Commissions']} />
              <Area dataKey="amount" stroke="#6366F1" strokeWidth={2} fill="url(#commGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-vendor summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-5 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Commissions par vendeur</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Vendeur</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Commandes</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">En attente</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Payé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.byVendor ?? []).map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{v.orderCount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-bold ${v.pendingAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {formatPrice(v.pendingAmount)} DA
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-green-700">
                    {formatPrice(v.paidAmount)} DA
                  </td>
                </tr>
              ))}
              {(data?.byVendor ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Aucune commission enregistrée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent commissions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Commissions récentes (50 dernières)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">Vendeur</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Commande</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Taux</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Commission</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Statut</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.recent ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.vendorName}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatPrice(r.orderTotal)} DA</td>
                  <td className="px-5 py-3 text-right text-gray-500">{r.commissionRate}%</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatPrice(r.commissionAmount)} DA</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => markPaid(r.id)}
                        disabled={paying === r.id}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors">
                        {paying === r.id ? 'En cours…' : 'Marquer payé'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.recent ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Aucune commission récente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
