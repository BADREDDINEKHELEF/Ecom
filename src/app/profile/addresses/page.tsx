'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, Pencil, Trash2, CheckCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_WILAYAS } from '@/lib/data/wilayas'

interface SavedAddress {
  id: string
  label: string
  full_name: string
  phone: string
  address: string
  city: string
  wilaya: string
  is_default: boolean
}

const EMPTY_FORM = { label: 'Domicile', full_name: '', phone: '', address: '', city: '', wilaya: '', is_default: false }

export default function AddressesPage() {
  const router = useRouter()
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<SavedAddress | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<string | null>(null)

  const fetchAddresses = useCallback(async () => {
    const res = await fetch('/api/addresses')
    if (res.ok) setAddresses(await res.json())
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/auth'); return }
      fetchAddresses().finally(() => setLoading(false))
    })
  }, [router, fetchAddresses])

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr)
    setForm({ label: addr.label, full_name: addr.full_name, phone: addr.phone, address: addr.address, city: addr.city, wilaya: addr.wilaya, is_default: addr.is_default })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const url    = editing ? `/api/addresses/${editing.id}` : '/api/addresses'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) return
      await fetchAddresses()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette adresse ?')) return
    setDeleting(id)
    await fetch(`/api/addresses/${id}`, { method: 'DELETE' })
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setDeleting(null)
  }

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-indigo-600" /> Mes adresses
        </h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">Aucune adresse enregistrée</p>
          <button onClick={openNew} className="text-indigo-600 font-semibold text-sm hover:underline">Ajouter une adresse</button>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {addresses.map((addr) => (
          <div key={addr.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-gray-900 text-sm">{addr.label}</span>
                {addr.is_default && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Par défaut
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700">{addr.full_name} · {addr.phone}</p>
              <p className="text-sm text-gray-500 truncate">{addr.address}, {addr.city}, {addr.wilaya}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(addr)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Pencil className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => handleDelete(addr.id)} disabled={deleting === addr.id} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                {deleting === addr.id ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">{editing ? 'Modifier l\'adresse' : 'Nouvelle adresse'}</h2>
            <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Libellé</label>
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" placeholder="Domicile, Bureau…" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom complet</label>
                <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Téléphone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" placeholder="0555 00 00 00" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Adresse</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ville</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Wilaya</label>
                <select value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" required>
                  <option value="">Choisir…</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="rounded" />
              <span className="text-sm text-gray-700">Définir comme adresse par défaut</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Annuler</button>
              <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
