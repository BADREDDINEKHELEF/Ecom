'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Search, Eye, MousePointerClick, ShoppingCart } from 'lucide-react'

interface Promotion {
  id: string
  vendor_id: string
  product_id: string
  placement: string
  status: 'pending' | 'active' | 'paused' | 'rejected' | 'expired'
  starts_at: string
  ends_at: string
  impressions: number
  clicks: number
  conversions: number
  amount_dzd: number
  payment_reference: string | null
  admin_note: string | null
  product_name: string
  product_image: string | null
  store_name: string
  store_slug: string
  created_at: string
}

const STATUS_CFG = {
  pending:  { label: 'Pending',  color: 'bg-blue-100 text-blue-700',      icon: Clock },
  active:   { label: 'Active',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  paused:   { label: 'Paused',   color: 'bg-gray-100 text-gray-600',      icon: AlertCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700',        icon: XCircle },
  expired:  { label: 'Expired',  color: 'bg-gray-100 text-gray-400',      icon: Clock },
} as const

const PLACEMENT_LABELS: Record<string, string> = {
  homepage: 'Homepage', category: 'Category', search: 'Search', all: 'All Pages',
}

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/admin/promotions${params}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setPromos(data.promotions ?? [])
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const update = async (id: string, status: string, admin_note?: string) => {
    setUpdating(id)
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_note }),
      })
      if (!res.ok) throw new Error('update failed')
      setPromos((prev) => prev.map((p) =>
        p.id === id ? { ...p, status: status as Promotion['status'] } : p
      ))
    } catch {
      // UI stays unchanged on failure
    } finally {
      setUpdating(null)
    }
  }

  const filtered = promos.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.store_name.toLowerCase().includes(q) || p.product_name.toLowerCase().includes(q)
  })

  const stats = {
    total: promos.length,
    pending: promos.filter((p) => p.status === 'pending').length,
    active: promos.filter((p) => p.status === 'active').length,
    revenue: promos.filter((p) => p.status !== 'rejected').reduce((s, p) => s + p.amount_dzd, 0),
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Promotions</h1>
        <p className="text-gray-500 text-sm mt-1">Approve and manage sponsored product placements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700 bg-gray-50' },
          { label: 'Awaiting Review', value: stats.pending, color: 'text-blue-700 bg-blue-50' },
          { label: 'Live', value: stats.active, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Revenue', value: `${stats.revenue.toLocaleString()} DZD`, color: 'text-violet-700 bg-violet-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl p-5 ${color}`}>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search store or product…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64" />
        </div>
        {(['all', 'pending', 'active', 'paused', 'rejected', 'expired'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All' : STATUS_CFG[s]?.label ?? s}
          </button>
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm">No promotions found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((promo) => {
            const cfg = STATUS_CFG[promo.status] ?? STATUS_CFG.pending
            const Icon = cfg.icon
            return (
              <div key={promo.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                {promo.product_image ? (
                  <Image src={promo.product_image} alt="" width={60} height={60} className="w-[60px] h-[60px] rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 truncate">{promo.product_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {PLACEMENT_LABELS[promo.placement] ?? promo.placement}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {promo.store_name} · {promo.amount_dzd.toLocaleString()} DZD
                    {promo.payment_reference && <> · Ref: <code className="text-xs bg-gray-100 px-1 rounded">{promo.payment_reference}</code></>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {promo.starts_at && promo.ends_at
                      ? `${new Date(promo.starts_at).toLocaleDateString()} → ${new Date(promo.ends_at).toLocaleDateString()}`
                      : 'Dates non définies'}
                  </p>
                  {promo.admin_note && <p className="text-xs text-amber-600 mt-1 italic">{promo.admin_note}</p>}
                </div>

                {/* Performance */}
                <div className="flex items-center gap-4 text-center flex-shrink-0 mr-2">
                  {[
                    { icon: Eye, label: 'Views', val: promo.impressions },
                    { icon: MousePointerClick, label: 'Clicks', val: promo.clicks },
                    { icon: ShoppingCart, label: 'Conv.', val: promo.conversions },
                  ].map(({ icon: MetaIcon, label, val }) => (
                    <div key={label}>
                      <div className="flex items-center gap-0.5 justify-center text-gray-400 mb-0.5">
                        <MetaIcon className="w-3 h-3" />
                        <span className="text-[10px]">{label}</span>
                      </div>
                      <p className="text-sm font-black text-gray-800">{val.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {promo.status === 'pending' && (
                    <>
                      <button onClick={() => update(promo.id, 'active')}
                        disabled={updating === promo.id}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        {updating === promo.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Approve
                      </button>
                      <button onClick={() => update(promo.id, 'rejected')}
                        disabled={updating === promo.id}
                        className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-200">
                        <XCircle className="w-3 h-3" />
                        Reject
                      </button>
                    </>
                  )}
                  {promo.status === 'active' && (
                    <button onClick={() => update(promo.id, 'paused')}
                      disabled={updating === promo.id}
                      className="text-gray-500 hover:text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                      Pause
                    </button>
                  )}
                  {promo.status === 'paused' && (
                    <button onClick={() => update(promo.id, 'active')}
                      disabled={updating === promo.id}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                      Resume
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
