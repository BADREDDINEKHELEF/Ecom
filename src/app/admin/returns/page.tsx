'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, RotateCcw, ChevronDown } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded' | 'returned'

interface ReturnRequest {
  id:            string
  order_id:      string
  vendor_id:     string | null
  reason:        string
  photos:        string[]
  status:        ReturnStatus
  admin_note:    string | null
  refund_amount: number
  created_at:    string
  orders: {
    full_name: string
    phone:     string
    wilaya:    string
    total:     number
  } | null
}

const STATUS_CONFIG: Record<ReturnStatus, { label: string; style: string }> = {
  requested: { label: 'Demandé',  style: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Approuvé', style: 'bg-blue-100 text-blue-700' },
  rejected:  { label: 'Rejeté',   style: 'bg-red-100 text-red-700' },
  refunded:  { label: 'Remboursé',style: 'bg-purple-100 text-purple-700' },
  returned:  { label: 'Retourné', style: 'bg-green-100 text-green-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ReturnsPage() {
  const [returns, setReturns]     = useState<ReturnRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [updating, setUpdating]   = useState<string | null>(null)
  const [note, setNote]           = useState<Record<string, string>>({})

  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/admin/returns', { credentials: 'include' })
      if (!res.ok) throw new Error('Erreur de chargement')
      const { returns: list } = await res.json()
      setReturns(list ?? [])
    } catch {
      setLoadError('Impossible de charger les retours')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: ReturnStatus, adminNote?: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: adminNote ?? null }),
      })
      if (!res.ok) throw new Error('Update failed')
      setReturns((prev) => prev.map((r) => r.id === id ? { ...r, status, admin_note: adminNote ?? r.admin_note } : r))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-indigo-600" />
            Retours &amp; Remboursements
          </h1>
          <p className="text-gray-500 text-sm mt-1">{returns.length} demande(s)</p>
        {loadError && <p className="text-red-500 text-sm mt-1">{loadError}</p>}
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-16 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : returns.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm text-gray-500">
          Aucune demande de retour pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.requested
            const isOpen = expanded === r.id
            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-indigo-600 text-sm">
                        #{r.order_id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.style}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 truncate">{r.reason}</p>
                  </div>
                  {r.orders && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 text-sm">{r.orders.full_name}</p>
                      <p className="text-xs text-gray-400">{r.orders.wilaya} · {formatPrice(r.orders.total)}</p>
                    </div>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-6 py-5 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Raison</p>
                      <p className="text-sm text-gray-700">{r.reason}</p>
                    </div>

                    {r.admin_note && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Note admin</p>
                        <p className="text-sm text-gray-700">{r.admin_note}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Note interne
                      </label>
                      <textarea
                        value={note[r.id] ?? r.admin_note ?? ''}
                        onChange={(e) => setNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                        placeholder="Commentaire interne (visible uniquement par l'admin)…"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(['approved', 'rejected', 'refunded', 'returned'] as ReturnStatus[])
                        .filter((s) => s !== r.status)
                        .map((s) => {
                          const c = STATUS_CONFIG[s]
                          return (
                            <button
                              key={s}
                              disabled={updating === r.id}
                              onClick={() => updateStatus(r.id, s, note[r.id] || undefined)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${c.style} border-current`}
                            >
                              {updating === r.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `→ ${c.label}`}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
