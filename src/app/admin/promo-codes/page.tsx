'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Tag, CheckCircle, XCircle, Loader2, X, RefreshCw } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface PromoCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  free_shipping: boolean
  one_per_buyer: boolean
  is_active: boolean
  vendor_id: string | null
  created_at: string
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 10,
  min_order: 0,
  max_uses: '',
  expires_at: '',
  free_shipping: false,
  one_per_buyer: false,
  is_active: true,
  vendor_id: '',
}

export default function AdminPromoCodesPage() {
  const [codes, setCodes]         = useState<PromoCode[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<PromoCode | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      if (res.ok) setCodes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  const openEdit = (c: PromoCode) => {
    setEditing(c)
    setForm({
      code:           c.code,
      discount_type:  c.discount_type,
      discount_value: c.discount_value,
      min_order:      c.min_order,
      max_uses:       c.max_uses?.toString() ?? '',
      expires_at:     c.expires_at ? c.expires_at.slice(0, 16) : '',
      free_shipping:  c.free_shipping,
      one_per_buyer:  c.one_per_buyer,
      is_active:      c.is_active,
      vendor_id:      c.vendor_id ?? '',
    })
    setError('')
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim()) { setError('Code required'); return }
    if (form.discount_value <= 0) { setError('Discount value must be > 0'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        code:           form.code.toUpperCase().trim(),
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        min_order:      Number(form.min_order) || 0,
        max_uses:       form.max_uses ? Number(form.max_uses) : null,
        expires_at:     form.expires_at ? new Date(form.expires_at).toISOString() : null,
        free_shipping:  form.free_shipping,
        one_per_buyer:  form.one_per_buyer,
        is_active:      form.is_active,
        vendor_id:      form.vendor_id || null,
      }
      const res = await fetch('/api/admin/promo-codes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Save failed')
      }
      await load()
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return
    await fetch('/api/admin/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCodes((prev) => prev.filter((c) => c.id !== id))
  }

  const toggleActive = async (c: PromoCode) => {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
    })
    setCodes((prev) => prev.map((p) => p.id === c.id ? { ...p, is_active: !p.is_active } : p))
  }

  const filtered = codes.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  const f = (k: keyof typeof form, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-600" /> Codes Promo
          </h1>
          <p className="text-sm text-gray-500 mt-1">{codes.length} code{codes.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau code
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun code promo</p>
            <p className="text-sm mt-1">Créez votre premier code promo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Réduction</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Min. commande</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisations</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Expiration</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Options</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs tracking-widest">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">
                      {c.discount_type === 'percentage'
                        ? `-${c.discount_value}%`
                        : `-${formatPrice(c.discount_value)}`}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {c.min_order > 0 ? formatPrice(c.min_order) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      <span className="font-semibold text-gray-900">{c.uses_count}</span>
                      {c.max_uses && <span className="text-gray-400"> / {c.max_uses}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs">
                      {c.expires_at
                        ? new Date(c.expires_at) < new Date()
                          ? <span className="text-red-500 font-semibold">Expiré</span>
                          : new Date(c.expires_at).toLocaleDateString('fr-DZ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {c.free_shipping && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-md">Livraison</span>
                        )}
                        {c.one_per_buyer && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded-md">1/acheteur</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleActive(c)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                          c.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {c.is_active
                          ? <><CheckCircle className="w-3 h-3" /> Actif</>
                          : <><XCircle className="w-3 h-3" /> Inactif</>}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          aria-label={`Modifier ${c.code}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.code)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Supprimer ${c.code}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900">
                {editing ? 'Modifier le code' : 'Nouveau code promo'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {/* Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code *</label>
                <input
                  required
                  type="text"
                  value={form.code}
                  onChange={(e) => f('code', e.target.value.toUpperCase())}
                  placeholder="PROMO20"
                  maxLength={50}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-indigo-400 uppercase"
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => f('discount_type', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (DA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Valeur {form.discount_type === 'percentage' ? '(%)' : '(DA)'}
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={form.discount_type === 'percentage' ? 100 : 100000}
                    value={form.discount_value}
                    onChange={(e) => f('discount_value', Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Min order + max uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Commande min (DA)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.min_order}
                    onChange={(e) => f('min_order', Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Utilisations max</label>
                  <input
                    type="number"
                    min={1}
                    value={form.max_uses}
                    onChange={(e) => f('max_uses', e.target.value)}
                    placeholder="Illimité"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Expiry date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date d&apos;expiration</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => f('expires_at', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              {/* Vendor (optional — leave blank for global) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Vendeur ID <span className="text-gray-400 font-normal">(laisser vide = global)</span>
                </label>
                <input
                  type="text"
                  value={form.vendor_id}
                  onChange={(e) => f('vendor_id', e.target.value)}
                  placeholder="UUID du vendeur"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.free_shipping}
                    onChange={(e) => f('free_shipping', e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Livraison gratuite incluse</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.one_per_buyer}
                    onChange={(e) => f('one_per_buyer', e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">1 utilisation par acheteur</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => f('is_active', e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Actif (visible aux acheteurs)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Enregistrer' : 'Créer le code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
