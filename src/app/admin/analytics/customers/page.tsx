'use client'

import { useState, useEffect, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Users, AlertTriangle, Crown, RefreshCw, Download } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { exportToCSV } from '@/lib/analytics/export'

interface CustomerRow {
  phone: string; orderCount: number; totalSpend: number; avgOrder: number
  lastOrderDaysAgo: number; segment: string; churnRisk: boolean
}
interface CustomerData {
  segments: { vip: number; regular: number; new: number }
  repeatRate: number; churnRisk: number; totalCustomers: number
  top20: CustomerRow[]
}

const SEGMENT_COLOR: Record<string, string> = {
  VIP:       '#6366F1',
  Régulier:  '#10B981',
  Nouveau:   '#F59E0B',
}

export default function CustomersPage() {
  const [data, setData]       = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics/customers', {
        
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm h-48 animate-pulse" />
        ))}
      </div>
    )
  }

  const pieData = [
    { name: 'VIP',      value: data?.segments.vip     ?? 0 },
    { name: 'Régulier', value: data?.segments.regular  ?? 0 },
    { name: 'Nouveau',  value: data?.segments.new      ?? 0 },
  ]

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Clients & Rétention
          </h1>
          <p className="text-sm text-gray-500 mt-1">{data?.totalCustomers.toLocaleString('fr')} clients uniques (identifiés par téléphone)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => exportToCSV(data?.top20 ?? [], 'clients_top20')}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total clients', value: String(data?.totalCustomers ?? 0), color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Taux de réachat', value: `${data?.repeatRate ?? 0}%`, color: 'bg-green-50 text-green-700' },
          { label: 'VIP (5+ commandes)', value: String(data?.segments.vip ?? 0), color: 'bg-violet-50 text-violet-700' },
          { label: 'Risque churn', value: String(data?.churnRisk ?? 0), color: 'bg-amber-50 text-amber-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-2xl font-black mt-1 px-2 py-0.5 rounded-lg inline-block ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Segment pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">Segments clients</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={SEGMENT_COLOR[entry.name] ?? '#ccc'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Churn risk panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-gray-900">Risque d&apos;abandon</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Clients avec 2+ commandes mais inactifs depuis 60+ jours.
          </p>
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
            <p className="text-4xl font-black text-amber-700">{data?.churnRisk ?? 0}</p>
            <p className="text-sm text-amber-600 mt-1">clients à risque</p>
          </div>
          <p className="text-xs text-gray-400 mt-4">Envoyez-leur un code promo via WhatsApp depuis la page Promo codes.</p>
        </div>
      </div>

      {/* Top 20 table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-gray-50">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h2 className="font-bold text-gray-900">Top 20 clients par dépenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600">#</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Téléphone</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Commandes</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Dépenses totales</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Panier moy.</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-right">Dernier achat</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(data?.top20 ?? []).map((c, i) => (
                <tr key={c.phone} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-5 py-3 font-mono text-gray-700">{c.phone}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{c.orderCount}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{formatPrice(c.totalSpend)} DA</td>
                  <td className="px-5 py-3 text-right text-gray-600">{formatPrice(c.avgOrder)} DA</td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs">
                    {c.lastOrderDaysAgo === 0 ? 'Aujourd\'hui' : `il y a ${c.lastOrderDaysAgo}j`}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: SEGMENT_COLOR[c.segment] + '20', color: SEGMENT_COLOR[c.segment] }}>
                      {c.segment}
                    </span>
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
