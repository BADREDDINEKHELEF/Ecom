'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Loader2, RefreshCw, Layers, AlertCircle } from 'lucide-react'
import { Niche } from '@/types'
import { niches as staticNiches } from '@/lib/data/niches'

// Tailwind-safe preset classes (purge-safe: all used elsewhere in the project)
const GRADIENT_PRESETS = [
  { label: 'Dark Slate', value: 'from-slate-900 via-slate-800 to-zinc-800' },
  { label: 'Emerald Forest', value: 'from-emerald-950 via-emerald-900 to-teal-900' },
  { label: 'Deep Purple', value: 'from-purple-950 via-violet-900 to-purple-800' },
  { label: 'Warm Stone', value: 'from-stone-900 via-amber-950 to-stone-800' },
  { label: 'Ocean Blue', value: 'from-blue-950 via-blue-900 to-cyan-900' },
  { label: 'Rose Pink', value: 'from-rose-950 via-rose-900 to-pink-900' },
  { label: 'Dark Indigo', value: 'from-indigo-950 via-indigo-900 to-violet-900' },
  { label: 'Deep Red', value: 'from-red-950 via-red-900 to-orange-950' },
  { label: 'Night Sky', value: 'from-gray-950 via-gray-900 to-slate-900' },
  { label: 'Forest Green', value: 'from-green-950 via-green-900 to-emerald-900' },
]

const ACCENT_PRESETS = [
  { label: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400' },
  { label: 'Amber', bg: 'bg-amber-400', text: 'text-amber-400' },
  { label: 'Pink', bg: 'bg-pink-400', text: 'text-pink-400' },
  { label: 'Amber Dark', bg: 'bg-amber-600', text: 'text-amber-500' },
  { label: 'Blue', bg: 'bg-blue-400', text: 'text-blue-400' },
  { label: 'Cyan', bg: 'bg-cyan-400', text: 'text-cyan-400' },
  { label: 'Green', bg: 'bg-green-400', text: 'text-green-400' },
  { label: 'Red', bg: 'bg-red-400', text: 'text-red-400' },
  { label: 'Violet', bg: 'bg-violet-400', text: 'text-violet-400' },
  { label: 'Yellow', bg: 'bg-yellow-400', text: 'text-yellow-400' },
  { label: 'Indigo', bg: 'bg-indigo-400', text: 'text-indigo-400' },
  { label: 'Teal', bg: 'bg-teal-400', text: 'text-teal-400' },
]

type FormState = {
  id: string
  name: string
  description: string
  emoji: string
  gradient: string
  accentBg: string
  accentText: string
  banner: string
  categories: string
}

const EMPTY_FORM: FormState = {
  id: '',
  name: '',
  description: '',
  emoji: '🛒',
  gradient: GRADIENT_PRESETS[0].value,
  accentBg: ACCENT_PRESETS[0].bg,
  accentText: ACCENT_PRESETS[0].text,
  banner: '',
  categories: '',
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminNichesPage() {
  const [nicheList, setNicheList] = useState<Niche[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Niche | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saveError, setSaveError] = useState('')
  const [dbError, setDbError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setDbError(false)
    try {
      const res = await fetch('/api/admin/niches')
      if (!res.ok) throw new Error('fetch failed')
      const { niches: data } = await res.json()
      setNicheList(data.length > 0 ? data : staticNiches)
    } catch {
      setNicheList(staticNiches)
      setDbError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowModal(true)
  }

  const openEdit = (n: Niche) => {
    setEditing(n)
    const accent = ACCENT_PRESETS.find((a) => a.bg === n.accentColor) ?? ACCENT_PRESETS[0]
    setForm({
      id: n.id,
      name: n.name,
      description: n.description,
      emoji: n.emoji,
      gradient: n.gradient,
      accentBg: accent.bg,
      accentText: accent.text,
      banner: n.banner,
      categories: n.categories.join('\n'),
    })
    setSaveError('')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete niche "${id}"? Products in this niche will lose their niche reference.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/niches?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete failed')
      setNicheList((prev) => prev.filter((n) => n.id !== id))
    } catch {
      alert('Failed to delete niche. Make sure the niches table exists in Supabase.')
    } finally {
      setDeleting(null)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.id.trim()) return
    setSaving(true)
    setSaveError('')

    const niche: Niche = {
      id: form.id.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      emoji: form.emoji.trim() || '🛒',
      gradient: form.gradient,
      accentColor: form.accentBg,
      textAccent: form.accentText,
      banner: form.banner.trim(),
      categories: form.categories.split('\n').map((c) => c.trim()).filter(Boolean),
    }

    try {
      const res = await fetch('/api/admin/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(niche),
      })
      if (!res.ok) throw new Error('save failed')
      if (editing) {
        setNicheList((prev) => prev.map((n) => (n.id === editing.id ? niche : n)))
      } else {
        setNicheList((prev) => [...prev, niche])
      }
      setShowModal(false)
    } catch {
      setSaveError('Failed to save. Make sure the niches table exists in Supabase (see SQL below).')
    } finally {
      setSaving(false)
    }
  }

  const f = (key: keyof FormState, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  const selectedAccent = ACCENT_PRESETS.find((a) => a.bg === form.accentBg) ?? ACCENT_PRESETS[0]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Niches</h1>
          <p className="text-gray-500 text-sm mt-1">{nicheList.length} niches configured</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Niche
          </button>
        </div>
      </div>

      {/* DB setup notice */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Niches table not found in Supabase</p>
            <p className="text-amber-700 text-xs mt-1">Showing static niches. Run this SQL in your Supabase SQL editor to enable niche management:</p>
            <pre className="bg-amber-100 text-amber-900 text-xs rounded-lg p-3 mt-2 overflow-x-auto whitespace-pre-wrap">{SQL_SETUP}</pre>
          </div>
        </div>
      )}

      {/* Niche grid */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading niches…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {nicheList.map((niche) => (
            <div key={niche.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              {/* Banner preview */}
              <div className={`bg-gradient-to-r ${niche.gradient} h-20 flex items-center px-5 gap-3`}>
                <span className="text-3xl">{niche.emoji}</span>
                <div>
                  <p className={`font-black text-white text-base`}>{niche.name}</p>
                  <p className="text-white/60 text-xs">{niche.id}</p>
                </div>
                <span className={`ml-auto w-3 h-3 rounded-full ${niche.accentColor}`} />
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-gray-500 text-sm mb-3 line-clamp-2">{niche.description}</p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {niche.categories.length === 0
                      ? <span className="text-xs text-gray-400 italic">No categories</span>
                      : niche.categories.map((cat) => (
                          <span key={cat} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{cat}</span>
                        ))
                    }
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEdit(niche)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(niche.id)}
                    disabled={deleting === niche.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {deleting === niche.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {nicheList.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">No niches yet. Add your first niche.</p>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-black text-gray-900 text-lg mb-6">
              {editing ? 'Edit Niche' : 'Add Niche'}
            </h2>

            {/* Live preview */}
            <div className={`bg-gradient-to-r ${form.gradient} rounded-xl h-16 flex items-center px-4 gap-3 mb-5`}>
              <span className="text-2xl">{form.emoji || '🛒'}</span>
              <div>
                <p className="font-black text-white text-sm">{form.name || 'Niche Name'}</p>
                <p className="text-white/50 text-xs">{form.id || 'niche-id'}</p>
              </div>
              <span className={`ml-auto w-3 h-3 rounded-full ${form.accentBg}`} />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      f('name', e.target.value)
                      if (!editing) f('id', slugify(e.target.value))
                    }}
                    placeholder="e.g. Electronics"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    ID (URL slug) *
                  </label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => f('id', slugify(e.target.value))}
                    placeholder="e.g. electronics"
                    disabled={!!editing}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  {!editing && <p className="text-xs text-gray-400 mt-1">Used in URLs: /electronics</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => f('description', e.target.value)}
                  placeholder="Short tagline for this niche"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Emoji</label>
                  <input
                    type="text"
                    value={form.emoji}
                    onChange={(e) => f('emoji', e.target.value)}
                    placeholder="🛒"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banner URL</label>
                  <input
                    type="text"
                    value={form.banner}
                    onChange={(e) => f('banner', e.target.value)}
                    placeholder="https://images.unsplash.com/…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Background Gradient</label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => f('gradient', preset.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                        form.gradient === preset.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md bg-gradient-to-r ${preset.value} flex-shrink-0`} />
                      <span className="text-xs font-medium text-gray-700 truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Accent Color</label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.bg}
                      type="button"
                      onClick={() => {
                        f('accentBg', preset.bg)
                        f('accentText', preset.text)
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all ${
                        form.accentBg === preset.bg
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full ${preset.bg} flex-shrink-0`} />
                      <span className="text-xs font-medium text-gray-700">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Selected: <code className="bg-gray-100 px-1 rounded">{selectedAccent.bg}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Categories <span className="text-gray-400 font-normal">(one per line)</span>
                </label>
                <textarea
                  value={form.categories}
                  onChange={(e) => f('categories', e.target.value)}
                  rows={4}
                  placeholder={'Accessories\nSpare Parts\nElectronics\nTools'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </div>

            {saveError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{saveError}</p>
                <pre className="text-red-500 text-xs mt-2 overflow-x-auto whitespace-pre-wrap">{SQL_SETUP}</pre>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.id.trim()}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Niche'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SQL_SETUP = `-- Run this in your Supabase SQL editor
create table if not exists niches (
  id           text primary key,
  name         text not null,
  description  text default '',
  emoji        text default '🛒',
  gradient     text default 'from-slate-900 via-slate-800 to-zinc-800',
  accent_color text default 'bg-indigo-500',
  text_accent  text default 'text-indigo-400',
  banner       text default '',
  categories   text[] default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Seed with the default 4 niches
insert into niches (id, name, description, emoji, gradient, accent_color, text_accent, banner, categories)
values
  ('cars',    'Auto & Cars',    'Everything your vehicle needs — parts, accessories & care',
   '🚗', 'from-slate-900 via-slate-800 to-zinc-800', 'bg-orange-500', 'text-orange-400',
   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80',
   array['Accessories','Spare Parts','Car Care','Electronics','Tires & Wheels']),
  ('animals', 'Pets & Animals', 'Spoil your furry, feathered & finned companions',
   '🐾', 'from-emerald-950 via-emerald-900 to-teal-900', 'bg-amber-400', 'text-amber-400',
   'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1400&q=80',
   array['Dog Supplies','Cat Supplies','Bird Supplies','Fish & Aquarium','Pet Food']),
  ('kids',    'Kids & Baby',    'Safe, fun & educational products for little ones',
   '🧸', 'from-purple-950 via-violet-900 to-purple-800', 'bg-pink-400', 'text-pink-400',
   'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=1400&q=80',
   array['Toys & Games','Baby Clothing','Educational','Baby Care','Nursery']),
  ('deco',    'Home Decor',     'Transform your home with trending furniture & accessories',
   '🛋️', 'from-stone-900 via-amber-950 to-stone-800', 'bg-amber-600', 'text-amber-500',
   'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1400&q=80',
   array['Meubles','Décoration Murale','Éclairage','Textiles','Rangement'])
on conflict (id) do nothing;`
