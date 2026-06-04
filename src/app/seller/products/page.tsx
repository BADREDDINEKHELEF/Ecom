'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Plus, Edit2, Trash2, X, Check, Loader2, Search, Package } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts, upsertProduct, deleteProduct } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'
import { niches } from '@/lib/data/niches'
import { useT } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { Product } from '@/types'

const EMPTY_FORM = {
  id: '', nicheId: 'cars', category: '', name: '', description: '',
  price: 0, comparePrice: 0, stock: 1, tags: '', images: '',
  isNew: false, isFeatured: false,
}

export default function SellerProductsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const searchParams = useSearchParams()
  const t = useT()
  const sp = t.sellerProducts
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    if (!vendor) return
    setLoadingProds(true)
    const prods = await getVendorProducts(vendor.id)
    setProducts(prods)
    setLoadingProds(false)
  }, [vendor])

  useEffect(() => { load() }, [load])

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      id: p.id, nicheId: p.nicheId, category: p.category, name: p.name,
      description: p.description, price: p.price, comparePrice: p.comparePrice || 0,
      stock: p.stock, tags: p.tags.join(', '), images: p.images.join('\n'),
      isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false,
    })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setFormError('') }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    if (!form.name || form.price <= 0) { setFormError('Name and price are required'); return }
    setSaving(true)
    setFormError('')
    try {
      const productId = editing?.id || `v-${vendor.id.slice(0, 8)}-${Date.now()}`
      await upsertProduct({
        id: productId,
        nicheId: form.nicheId,
        category: form.category || form.nicheId,
        name: form.name,
        description: form.description,
        price: form.price,
        comparePrice: form.comparePrice || undefined,
        images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
        stock: form.stock,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        isNew: form.isNew,
        isFeatured: form.isFeatured,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ vendor_id: vendor.id } as any)),
      })
      const { createClient } = await import('@/lib/supabase/client')
      const sb = createClient()
      await sb.from('products').update({ vendor_id: vendor.id }).eq('id', productId)
      await load()
      closeForm()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(sp.deleteConfirm)) return
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{sp.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{sp.count.replace('{n}', String(products.length))}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> {sp.addBtn}
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{editing ? sp.editTitle : sp.newTitle}</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.nameLabel}</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={sp.nameLabel}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.nicheLabel}</label>
                <select value={form.nicheId} onChange={(e) => setForm({ ...form, nicheId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400">
                  {niches.map((n) => <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.categoryLabel}</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={sp.categoryPH}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.priceLabel}</label>
                <input required type="number" min="1" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.comparePriceLabel}</label>
                <input type="number" min="0" value={form.comparePrice || ''} onChange={(e) => setForm({ ...form, comparePrice: Number(e.target.value) })}
                  placeholder={sp.comparePricePH}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.stockLabel}</label>
                <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.tagsLabel}</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder={sp.tagsPH}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.descriptionLabel}</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder={sp.descriptionPH}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{sp.imagesLabel}</label>
                <textarea value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })}
                  rows={3} placeholder="https://example.com/image.jpg"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm font-medium text-gray-700">{sp.markNew}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm font-medium text-gray-700">{sp.markFeatured}</span>
                </label>
              </div>
              {formError && <p className="sm:col-span-2 text-sm text-red-500">{formError}</p>}
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors text-sm">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? sp.saveBtn : sp.addBtn}
                </button>
                <button type="button" onClick={closeForm}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">{sp.cancelBtn}</button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={sp.searchPH}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingProds ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> {sp.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{products.length === 0 ? sp.noProductsYet : sp.noResults}</p>
              {products.length === 0 && (
                <button onClick={() => setShowForm(true)}
                  className="mt-3 text-emerald-600 font-bold text-sm hover:underline">{sp.addFirstProduct}</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[sp.colProduct, sp.colCategory, sp.colPrice, sp.colStock, sp.colStatus, ''].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                          )}
                          <span className="font-semibold text-gray-900 truncate max-w-[200px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{p.category}</td>
                      <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(p.price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`font-medium ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-green-600'}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {p.isNew && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{sp.badgeNew}</span>}
                          {p.isFeatured && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{sp.badgeFeatured}</span>}
                          {p.stock === 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">{sp.outOfStock}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
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
      </main>
    </div>
  )
}
