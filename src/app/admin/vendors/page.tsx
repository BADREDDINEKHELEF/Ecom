'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Store, CheckCircle, XCircle, ExternalLink, Loader2,
  Users, ToggleLeft, ToggleRight, Clock, AlertTriangle,
  RefreshCw, ChevronDown, ChevronUp, CreditCard,
} from 'lucide-react'

interface Vendor {
  id:                    string
  store_name:            string
  store_slug:            string
  phone:                 string | null
  wilaya:                string | null
  commission_rate:       number
  is_approved:           boolean
  is_active:             boolean
  subscription_status:   string | null
  subscription_plan_id:  string | null
  admin_note:            string | null
  created_at:            string
}

const SUB_CFG: Record<string, { label: string; color: string }> = {
  trial:        { label: 'En attente paiement', color: 'bg-amber-100 text-amber-700' },
  active:       { label: 'Abonné — Payé',       color: 'bg-emerald-100 text-emerald-700' },
  grace_period: { label: 'Période de grâce',    color: 'bg-orange-100 text-orange-700' },
  expired:      { label: 'Expiré',              color: 'bg-red-100 text-red-700' },
  cancelled:    { label: 'Annulé',              color: 'bg-gray-100 text-gray-600' },
}

export default function AdminVendorsPage() {
  const [vendors,     setVendors]     = useState<Vendor[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'pending' | 'approved' | 'declined' | 'all'>('pending')
  const [working,     setWorking]     = useState<string | null>(null)
  const [declineId,   setDeclineId]   = useState<string | null>(null)
  const [declineNote, setDeclineNote] = useState('')
  const [expanded,    setExpanded]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/vendors')
      if (res.ok) {
        const d = await res.json()
        setVendors(Array.isArray(d.vendors) ? d.vendors : [])
      }
    } catch {
      // keep current list on network failure
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string) => {
    setWorking(id)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      })
      if (res.ok) {
        setVendors((prev) => prev.map((v) =>
          v.id === id ? { ...v, is_approved: true, is_active: true, admin_note: null } : v
        ))
      }
    } finally {
      setWorking(null)
    }
  }

  const handleDecline = async (id: string) => {
    if (!declineNote.trim()) return
    setWorking(id)
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'decline', admin_note: declineNote.trim() }),
      })
      if (res.ok) {
        setVendors((prev) => prev.map((v) =>
          v.id === id ? { ...v, is_approved: false, is_active: false, admin_note: declineNote.trim() } : v
        ))
        setDeclineId(null)
        setDeclineNote('')
      }
    } finally {
      setWorking(null)
    }
  }

  const handleToggleActive = async (v: Vendor) => {
    setWorking(v.id)
    const action = v.is_active ? 'suspend' : 'reactivate'
    const res = await fetch('/api/admin/vendors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: v.id, action }),
    })
    if (res.ok) {
      // Only toggle is_active — is_approved stays unchanged
      setVendors((prev) => prev.map((x) =>
        x.id === v.id ? { ...x, is_active: !x.is_active } : x
      ))
    }
    setWorking(null)
  }

  const pending  = vendors.filter((v) =>  !v.is_approved && v.is_active)
  const declined = vendors.filter((v) =>  !v.is_approved && !v.is_active)
  const approved = vendors.filter((v) =>   v.is_approved)

  const filtered =
    filter === 'pending'  ? pending :
    filter === 'approved' ? approved :
    filter === 'declined' ? declined :
    vendors

  const stats = { total: vendors.length, pending: pending.length, approved: approved.length, declined: declined.length }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8 gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Boutiques vendeurs</h1>
          <p className="text-gray-500 text-sm mt-1">Approuvez ou refusez les nouvelles inscriptions</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',              value: stats.total,    icon: Users,         color: 'text-indigo-600 bg-indigo-50',  tab: 'all'      },
          { label: 'En attente',         value: stats.pending,  icon: Clock,         color: 'text-amber-600 bg-amber-50',    tab: 'pending'  },
          { label: 'Approuvées',         value: stats.approved, icon: CheckCircle,   color: 'text-emerald-600 bg-emerald-50',tab: 'approved' },
          { label: 'Refusées',           value: stats.declined, icon: XCircle,       color: 'text-red-600 bg-red-50',        tab: 'declined' },
        ].map(({ label, value, icon: Icon, color, tab }) => (
          <button
            key={label}
            onClick={() => setFilter(tab as typeof filter)}
            className={`bg-white rounded-2xl p-5 shadow-sm text-left transition-all hover:shadow-md ${filter === tab ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </button>
        ))}
      </div>

      {/* Urgent pending notice */}
      {stats.pending > 0 && filter === 'pending' && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {stats.pending} boutique{stats.pending > 1 ? 's' : ''} en attente de votre décision
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'pending',  label: `En attente (${stats.pending})` },
          { key: 'approved', label: `Approuvées (${stats.approved})` },
          { key: 'declined', label: `Refusées (${stats.declined})` },
          { key: 'all',      label: 'Toutes' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Vendor Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune boutique dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const subCfg = SUB_CFG[v.subscription_status ?? '']
            const isPending  = !v.is_approved && v.is_active
            const isDeclined = !v.is_approved && !v.is_active
            const isOpen     = expanded === v.id
            const isWorking  = working === v.id
            const isDeclining = declineId === v.id

            return (
              <div key={v.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${
                isPending  ? 'border-amber-200' :
                isDeclined ? 'border-red-200'   :
                'border-gray-100'
              }`}>
                {/* Card header */}
                <div className="p-5 flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg ${
                    isPending  ? 'bg-amber-100 text-amber-700' :
                    isDeclined ? 'bg-red-100 text-red-700'     :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {v.store_name[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-black text-gray-900 text-base">{v.store_name}</h3>
                      {/* Approval status */}
                      {isPending  && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>}
                      {isDeclined && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" /> Refusée</span>}
                      {v.is_approved && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approuvée</span>}
                      {/* Subscription status */}
                      {subCfg && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${subCfg.color}`}>
                          <CreditCard className="w-3 h-3" /> {subCfg.label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <a href={`/shop/${v.store_slug}`} target="_blank"
                        className="flex items-center gap-1 text-indigo-500 hover:underline font-mono">
                        /{v.store_slug} <ExternalLink className="w-3 h-3" />
                      </a>
                      {v.phone   && <span>📞 {v.phone}</span>}
                      {v.wilaya  && <span>📍 {v.wilaya}</span>}
                      <span>📅 {new Date(v.created_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {/* Decline reason */}
                    {isDeclined && v.admin_note && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        <span className="font-bold">Motif :</span> {v.admin_note}
                      </p>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : v.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    aria-label="Expand"
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded: subscription warning + actions */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                    {/* Subscription warning */}
                    {v.subscription_status !== 'active' && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-800">Abonnement non actif</p>
                          <p className="text-amber-700 text-xs mt-0.5">
                            Ce vendeur n&apos;a pas encore payé son abonnement.{' '}
                            {v.subscription_status === 'trial' ? 'Un paiement est en attente de vérification.' : 'Aucun paiement reçu.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      {!v.is_approved && (
                        <button
                          onClick={() => handleApprove(v.id)}
                          disabled={isWorking}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                        >
                          {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Approuver la boutique
                        </button>
                      )}

                      {!isDeclined && (
                        <button
                          onClick={() => { setDeclineId(v.id); setDeclineNote('') }}
                          disabled={isWorking}
                          className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-5 py-2.5 rounded-xl text-sm border border-red-200 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          {v.is_approved ? 'Révoquer' : 'Refuser'}
                        </button>
                      )}

                      {isDeclined && (
                        <button
                          onClick={() => handleApprove(v.id)}
                          disabled={isWorking}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                        >
                          {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Réactiver
                        </button>
                      )}

                      {v.is_approved && (
                        <button
                          onClick={() => handleToggleActive(v)}
                          disabled={isWorking}
                          title={v.is_active ? 'Suspendre' : 'Activer'}
                          className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors px-3 py-2 rounded-xl hover:bg-gray-100"
                        >
                          {v.is_active
                            ? <><ToggleRight className="w-5 h-5 text-indigo-500" /> Suspendre</>
                            : <><ToggleLeft className="w-5 h-5" /> Activer</>
                          }
                        </button>
                      )}
                    </div>

                    {/* Decline reason input */}
                    {isDeclining && (
                      <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
                        <p className="text-sm font-bold text-red-700">Motif du refus (visible par le vendeur)</p>
                        <textarea
                          value={declineNote}
                          onChange={(e) => setDeclineNote(e.target.value)}
                          placeholder="Ex : Paiement non reçu. Veuillez soumettre votre preuve de virement et réessayer."
                          rows={3}
                          className="w-full border border-red-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 bg-white resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecline(v.id)}
                            disabled={isWorking || !declineNote.trim()}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors"
                          >
                            {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Confirmer le refus
                          </button>
                          <button
                            onClick={() => { setDeclineId(null); setDeclineNote('') }}
                            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
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
