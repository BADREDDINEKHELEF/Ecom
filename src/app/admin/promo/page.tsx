'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, X, Check } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { PromoCode } from '@/lib/supabase/queries'

const EMPTY_FORM = {
  code: '', discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: 10, min_order: 0, max_uses: '', expires_at: '', is_active: true,
}

export default function PromoPage() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      if (res.ok) setPromos(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || form.discount_value <= 0) { setError('Code and value are required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          discount_type: form.discount_type,
          discount_value: form.discount_value,
          min_order: form.min_order || 0,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
          is_active: form.is_active,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch {
      setError('Failed to save. Code may already exist.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (promo: PromoCode) => {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: promo.id, is_active: !promo.is_active }),
    })
    setPromos((prev) => prev.map((p) => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code?')) return
    await fetch('/api/admin/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setPromos((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Tag className="w-4 h-4 text-indigo-600" /> New Promo Code</h2>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError('') }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Code</label>
              <input
                required type="text" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Discount Type</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (DZD)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                Value {form.discount_type === 'percentage' ? '(%)' : '(DZD)'}
              </label>
              <input
                required type="number" min="1" max={form.discount_type === 'percentage' ? 100 : undefined}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Min. Order (DZD)</label>
              <input
                type="number" min="0" value={form.min_order}
                onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Max Uses (blank = unlimited)</label>
              <input
                type="number" min="1" value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                placeholder="Unlimited"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Expires At</label>
              <input
                type="datetime-local" value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            {error && <p className="sm:col-span-2 text-sm text-red-500">{error}</p>}
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit" disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create Code
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promo Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No promo codes yet</p>
            <p className="text-sm mt-1">Click &quot;New Code&quot; to create your first one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Code', 'Discount', 'Min. Order', 'Uses', 'Expires', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {promos.map((promo) => {
                  const isExpired = promo.expires_at ? new Date(promo.expires_at) < new Date() : false
                  const isFull = promo.max_uses !== null && promo.uses_count >= promo.max_uses
                  return (
                    <tr key={promo.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">{promo.code}</span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-indigo-600">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}% OFF`
                          : `-${formatPrice(promo.discount_value)}`}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {promo.min_order > 0 ? formatPrice(promo.min_order) : '—'}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        <span className={isFull ? 'text-red-500 font-bold' : ''}>
                          {promo.uses_count}{promo.max_uses !== null ? `/${promo.max_uses}` : ''}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {promo.expires_at
                          ? <span className={isExpired ? 'text-red-500' : ''}>{new Date(promo.expires_at).toLocaleDateString()}</span>
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {isExpired || isFull ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                            {isExpired ? 'Expired' : 'Maxed'}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(promo)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                            title={promo.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {promo.is_active
                              ? <ToggleRight className="w-5 h-5 text-indigo-500" />
                              : <ToggleLeft className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
