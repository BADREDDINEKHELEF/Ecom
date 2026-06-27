'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, RotateCcw, ChevronDown, Check, Clipboard, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { useLangStore, useRTL } from '@/lib/store/langStore'

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

const STATUS_CONFIG: Record<ReturnStatus, { label: Record<string, string>; style: string }> = {
  requested: { 
    label: { fr: 'Demandé', en: 'Requested', ar: 'مطلوب' }, 
    style: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
  },
  approved:  { 
    label: { fr: 'Approuvé', en: 'Approved', ar: 'مقبول' }, 
    style: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
  },
  rejected:  { 
    label: { fr: 'Rejeté', en: 'Rejected', ar: 'مرفوض' }, 
    style: 'bg-red-500/20 text-red-400 border border-red-500/30' 
  },
  refunded:  { 
    label: { fr: 'Remboursé', en: 'Refunded', ar: 'مسترجع ماليا' }, 
    style: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
  },
  returned:  { 
    label: { fr: 'Retourné', en: 'Returned', ar: 'مسترجع كليا' }, 
    style: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
  },
}

export default function SellerReturnsPage() {
  const { vendor, loading: authLoading, signOut } = useSellerAuth()
  const { lang } = useLangStore()
  const isRTL = useRTL()

  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [refundAmounts, setRefundAmounts] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadReturns = useCallback(async () => {
    if (!vendor) return
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/seller/returns')
      if (!res.ok) throw new Error('Erreur de chargement')
      const data = await res.json()
      setReturns(data.returns ?? [])
      
      // Initialize states
      const initialNotes: Record<string, string> = {}
      const initialRefunds: Record<string, number> = {}
      for (const r of (data.returns ?? [])) {
        initialNotes[r.id] = r.admin_note ?? ''
        initialRefunds[r.id] = r.refund_amount ?? 0
      }
      setNotes(initialNotes)
      setRefundAmounts(initialRefunds)
    } catch {
      setLoadError(lang === 'ar' ? 'فشل تحميل طلبات المرتجعات' : (lang === 'fr' ? 'Impossible de charger les retours' : 'Could not load return requests'))
    } finally {
      setLoading(false)
    }
  }, [vendor, lang])

  useEffect(() => {
    if (vendor) {
      loadReturns()
    }
  }, [vendor, loadReturns])

  const handleUpdateStatus = async (id: string, status: ReturnStatus) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/seller/returns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNote: notes[id] || '',
          refundAmount: refundAmounts[id] || 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      setReturns((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                admin_note: notes[id] || null,
                refund_amount: refundAmounts[id] || 0,
              }
            : r
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status')
    } finally {
      setUpdating(null)
    }
  }

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (!vendor) return null

  // UI translations
  const ui = {
    title: lang === 'ar' ? 'المرتجعات والمستردات' : (lang === 'fr' ? 'Retours & Remboursements' : 'Returns & Refunds'),
    subtitle: lang === 'ar' ? `لديك ${returns.length} طلب مرتجع` : (lang === 'fr' ? `${returns.length} demande(s) de retour` : `${returns.length} return request(s)`),
    reason: lang === 'ar' ? 'السبب' : (lang === 'fr' ? 'Raison' : 'Reason'),
    sellerNote: lang === 'ar' ? 'ملاحظة البائع' : (lang === 'fr' ? 'Note du vendeur' : 'Seller Note'),
    sellerNotePlaceholder: lang === 'ar' ? 'أضف تعليق داخلي هنا...' : (lang === 'fr' ? 'Commentaire interne (visible uniquement par vous)...' : 'Internal comment (visible only to you)...'),
    refundAmountLabel: lang === 'ar' ? 'مبلغ الاسترداد (دج)' : (lang === 'fr' ? 'Montant à rembourser (DA)' : 'Refund Amount (DA)'),
    noReturns: lang === 'ar' ? 'لا توجد طلبات مرتجعات حالياً.' : (lang === 'fr' ? 'Aucune demande de retour pour le moment.' : 'No return requests found.'),
    actions: lang === 'ar' ? 'تحديث الحالة إلى' : (lang === 'fr' ? 'Changer le statut en' : 'Update status to'),
    saveNotes: lang === 'ar' ? 'حفظ التعديلات' : (lang === 'fr' ? 'Enregistrer les notes' : 'Save Notes'),
  }

  return (
    <div className="min-h-screen flex bg-gray-950 text-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
      <SellerSidebar
        storeName={vendor.store_name}
        slug={vendor.store_slug}
        logoUrl={vendor.logo_url}
        onLogout={signOut}
      />
      <main className="flex-1 lg:ps-64 min-w-0">
        <div className="p-8 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-5">
            <div>
              <h1 className="text-3xl font-black text-white flex items-center gap-3">
                <RotateCcw className="w-8 h-8 text-emerald-500" />
                {ui.title}
              </h1>
              <p className="text-gray-400 text-sm mt-1">{ui.subtitle}</p>
              {loadError && <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />{loadError}</p>}
            </div>
            <button onClick={loadReturns} className="p-2 rounded-xl hover:bg-gray-800 transition-colors text-gray-400 hover:text-white">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 py-24 justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span>Chargement…</span>
            </div>
          ) : returns.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center text-gray-400 shadow-lg">
              {ui.noReturns}
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((r) => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.requested
                const label = cfg.label[lang] || cfg.label.fr
                const isOpen = expanded === r.id

                return (
                  <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-md transition-all hover:border-gray-700">
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-850/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-black text-emerald-400 text-sm flex items-center gap-1">
                            #{r.order_id.slice(0, 8).toUpperCase()}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyOrderId(r.order_id)
                              }}
                              className="text-gray-500 hover:text-white p-0.5"
                              title="Copier ID commande"
                            >
                              {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                            </button>
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.style}`}>
                            {label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mt-1 truncate">{r.reason}</p>
                      </div>
                      {r.orders && (
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-white text-sm">{r.orders.full_name}</p>
                          <p className="text-xs text-gray-400">{r.orders.wilaya} · {formatPrice(r.orders.total)}</p>
                        </div>
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-800 px-6 py-6 space-y-5 bg-gray-900/50">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{ui.reason}</p>
                          <p className="text-sm text-gray-200 bg-gray-950 px-4 py-3 rounded-xl border border-gray-800">{r.reason}</p>
                        </div>

                        {/* Photos if any */}
                        {r.photos && r.photos.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Photos jointes</p>
                            <div className="flex gap-3 flex-wrap">
                              {r.photos.map((pUrl, idx) => (
                                <a key={idx} href={pUrl} target="_blank" rel="noopener noreferrer" className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors">
                                  <img src={pUrl} alt="Justificatif retour" className="w-full h-full object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Settings inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                              {ui.sellerNote}
                            </label>
                            <textarea
                              value={notes[r.id] ?? ''}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              rows={3}
                              className="w-full border border-gray-800 bg-gray-950 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none text-white placeholder-gray-600"
                              placeholder={ui.sellerNotePlaceholder}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                              {ui.refundAmountLabel}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={refundAmounts[r.id] ?? 0}
                              onChange={(e) => setRefundAmounts((prev) => ({ ...prev, [r.id]: Number(e.target.value) }))}
                              className="w-full border border-gray-800 bg-gray-950 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 text-white font-bold"
                            />
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className="pt-2 border-t border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <span className="text-xs text-gray-500 font-mono">ID: {r.id}</span>
                          
                          <div className="flex flex-wrap gap-2">
                            {/* Save changes without modifying status */}
                            <button
                              disabled={updating === r.id}
                              onClick={() => handleUpdateStatus(r.id, r.status)}
                              className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-800 hover:border-gray-700 bg-gray-950 hover:bg-gray-850 transition-colors disabled:opacity-50 text-gray-300"
                            >
                              {updating === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ui.saveNotes}
                            </button>

                            {/* Status transitions */}
                            {(['approved', 'rejected', 'refunded', 'returned'] as ReturnStatus[])
                              .filter((s) => s !== r.status)
                              .map((s) => {
                                const c = STATUS_CONFIG[s]
                                const statusLabel = c.label[lang] || c.label.fr
                                return (
                                  <button
                                    key={s}
                                    disabled={updating === r.id}
                                    onClick={() => handleUpdateStatus(r.id, s)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${c.style} hover:brightness-110`}
                                  >
                                    {updating === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `→ ${statusLabel}`}
                                  </button>
                                )
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
