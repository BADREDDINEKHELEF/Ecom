'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Search, ChevronDown } from 'lucide-react'

interface Subscription {
  id: string
  vendor_id: string
  plan_id: string
  status: 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled'
  amount_dzd: number
  started_at: string
  expires_at: string
  payment_method: string | null
  payment_reference: string | null
  payment_proof_url: string | null
  admin_note: string | null
  store_name: string
  store_slug: string
  created_at: string
}

const STATUS_CFG = {
  trial:        { label: 'Trial',        color: 'bg-blue-100 text-blue-700',      icon: Clock },
  active:       { label: 'Active',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  grace_period: { label: 'Grace Period', color: 'bg-amber-100 text-amber-700',    icon: AlertCircle },
  expired:      { label: 'Expired',      color: 'bg-red-100 text-red-700',        icon: AlertCircle },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-600',      icon: XCircle },
} as const

const PLAN_BADGE: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-700',
  professional: 'bg-violet-100 text-violet-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [noteEditing, setNoteEditing] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = filter !== 'all' ? `?status=${filter}` : ''
    const res = await fetch(`/api/admin/subscriptions${params}`)
    const data = await res.json()
    setSubs(data.subscriptions ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string, admin_note?: string) => {
    setUpdating(id)
    setUpdateError(null)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_note }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setUpdateError(d.error ?? 'Update failed. Try again.')
      } else {
        setSubs((prev) => prev.map((s) =>
          s.id === id ? { ...s, status: status as Subscription['status'], admin_note: admin_note ?? s.admin_note } : s
        ))
        setNoteEditing(null)
      }
    } catch {
      setUpdateError('Network error. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = subs.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.store_name.toLowerCase().includes(q) || s.store_slug.toLowerCase().includes(q)
  })

  const stats = {
    total: subs.length,
    active: subs.filter((s) => s.status === 'active').length,
    trial: subs.filter((s) => s.status === 'trial').length,
    revenue: subs.filter((s) => s.status === 'active').reduce((sum, s) => sum + s.amount_dzd, 0),
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Subscriptions</h1>
        <p className="text-gray-500 text-sm mt-1">Manage vendor subscription plans and payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Subscriptions', value: stats.total, color: 'text-gray-700 bg-gray-50' },
          { label: 'Active', value: stats.active, color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Awaiting Approval', value: stats.trial, color: 'text-blue-700 bg-blue-50' },
          { label: 'Monthly Revenue', value: `${stats.revenue.toLocaleString()} DZD`, color: 'text-violet-700 bg-violet-50' },
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
          <input
            type="text"
            placeholder="Search store…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
          />
        </div>
        {(['all', 'trial', 'active', 'grace_period', 'expired', 'cancelled'] as const).map((s) => (
          <button key={s}
            onClick={() => setFilter(s)}
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

      {updateError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {updateError}
          <button onClick={() => setUpdateError(null)} className="text-red-400 hover:text-red-700 ml-4 flex-shrink-0">✕</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading subscriptions…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No subscriptions found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Store', 'Plan', 'Status', 'Amount', 'Payment', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => {
                const cfg = STATUS_CFG[sub.status]
                const Icon = cfg?.icon ?? Clock
                const isExpanded = expandedId === sub.id
                return (
                  <Fragment key={sub.id}>
                    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{sub.store_name}</p>
                        <p className="text-xs text-gray-400">/{sub.store_slug}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${PLAN_BADGE[sub.plan_id] ?? 'bg-gray-100 text-gray-600'}`}>
                          {sub.plan_id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="w-3 h-3" />
                          {cfg?.label ?? sub.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-gray-900">{sub.amount_dzd.toLocaleString()} DZD</p>
                        {sub.payment_method && <p className="text-xs text-gray-400 capitalize">{sub.payment_method.replace('_', ' ')}</p>}
                      </td>
                      <td className="px-5 py-4">
                        {sub.payment_reference ? (
                          <p className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{sub.payment_reference}</p>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700">{new Date(sub.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {sub.status === 'trial' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'active')}
                              disabled={updating === sub.id}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                              {updating === sub.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Approve
                            </button>
                          )}
                          {sub.status === 'active' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'expired')}
                              disabled={updating === sub.id}
                              className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-200">
                              <XCircle className="w-3 h-3" />
                              Expire
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="grid sm:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Details</p>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-gray-500">Started:</span> {new Date(sub.started_at).toLocaleDateString()}</p>
                                <p><span className="text-gray-500">Vendor ID:</span> <code className="text-xs bg-gray-200 px-1 rounded">{sub.vendor_id}</code></p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Admin Note</p>
                              {noteEditing === sub.id ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Note…"
                                  />
                                  <button onClick={() => updateStatus(sub.id, sub.status, noteText)}
                                    className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                                    Save
                                  </button>
                                  <button onClick={() => setNoteEditing(null)}
                                    className="text-gray-500 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <p className="text-sm text-gray-700 flex-1">{sub.admin_note ?? <span className="text-gray-400 italic">No note</span>}</p>
                                  <button onClick={() => { setNoteEditing(sub.id); setNoteText(sub.admin_note ?? '') }}
                                    className="text-xs text-emerald-600 hover:underline flex-shrink-0">
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
