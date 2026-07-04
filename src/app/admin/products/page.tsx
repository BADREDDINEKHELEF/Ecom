'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Plus, Search, Edit2, Trash2, Package, Loader2, RefreshCw } from 'lucide-react'
import { niches } from '@/lib/data/niches'
import { formatPrice } from '@/lib/utils'
import { Product } from '@/types'
import { getProducts } from '@/lib/supabase/queries-server'
import { upsertProduct, deleteProduct } from '@/lib/supabase/mutations'


type FormState = {
  name: string
  price: string
  comparePrice: string
  stock: string
  nicheId: string
  category: string
  description: string
  images: string
  tags: string
  isNew: boolean
  isFeatured: boolean
}

const EMPTY_FORM: FormState = {
  name: '', price: '', comparePrice: '', stock: '',
  nicheId: 'cars', category: '', description: '',
  images: '', tags: '', isNew: false, isFeatured: false,
}

export default function AdminProductsPage() {
  const [productList, setProductList] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterNiche, setFilterNiche] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setProductList(await getProducts())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = productList.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchNiche = !filterNiche || p.nicheId === filterNiche
    return matchSearch && matchNiche
  })

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      price: String(p.price),
      comparePrice: p.comparePrice ? String(p.comparePrice) : '',
      stock: String(p.stock),
      nicheId: p.nicheId,
      category: p.category,
      description: p.description,
      images: (p.images ?? []).join('\n'),
      tags: p.tags.join(', '),
      isNew: p.isNew ?? false,
      isFeatured: p.isFeatured ?? false,
    })
    setSaveError('')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteProduct(id, { isAdmin: true })
      setProductList((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Delete failed:', error)
      let errorMessage = 'Failed to delete product.'
      // Check for a common database constraint violation error
      if (error instanceof Error && error.message.includes('violates foreign key constraint')) {
        errorMessage = 'Cannot delete product as it is part of existing orders. Consider deactivating it instead.'
      }
      // For better UX, consider replacing alert() with a toast notification library
      alert(errorMessage)
    } finally {
      setDeleting(null)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    setSaveError('')
    const images = form.images.split('\n').map((s) => s.trim()).filter(Boolean)
    const product: Omit<Product, 'rating' | 'reviewCount'> = {
      id: editing?.id ?? `prod-${Date.now()}`,
      nicheId: form.nicheId,
      category: form.category || 'General',
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      images: images.length ? images : ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'],
      stock: Number(form.stock) || 0,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isNew: form.isNew,
      isFeatured: form.isFeatured,
    }
    try {
      // Assume upsertProduct returns the saved product from the database
      const savedProduct = await upsertProduct(product, { isAdmin: true })
      if (editing) {
        setProductList((prev) => prev.map((p) =>
          p.id === editing.id ? { ...p, ...savedProduct } : p
        ))
      } else {
        // Add the product returned from the database to the list
        setProductList((prev) => [savedProduct, ...prev])
      }
      setShowModal(false)
    } catch {
      setSaveError('Failed to save. Check your Supabase connection.')
    } finally {
      setSaving(false)
    }
  }

  const f = (key: keyof FormState, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} products</p>
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
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterNiche('')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${!filterNiche ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All
          </button>
          {niches.map((n) => (
            <button
              key={n.id}
              onClick={() => setFilterNiche(n.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${filterNiche === n.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {n.emoji} {n.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading products…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Product', 'Niche', 'Category', 'Price', 'Stock', 'Rating', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((product) => {
                  const niche = niches.find((n) => n.id === product.nicheId)
                  const hasDiscount = product.comparePrice && product.comparePrice > product.price
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                            {(product.images?.[0]) ? (
                              <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="48px" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-300 m-auto" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 max-w-[200px] truncate">{product.name}</p>
                            <div className="flex gap-1 mt-0.5 text-[10px]">
                              {product.isNew && <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">New</span>}
                              {product.isFeatured && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Featured</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-gray-700">
                          <span>{niche?.emoji}</span> {niche?.name.split(' ')[0] ?? product.nicheId}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{product.category}</td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="font-bold text-gray-900">{formatPrice(product.price)}</p>
                          {hasDiscount && (
                            <p className="text-xs text-red-500 line-through">{formatPrice(product.comparePrice!)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-bold ${product.stock === 0 ? 'text-red-500' : product.stock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <span className="font-semibold">{product.rating}</span>
                        <span className="text-gray-400 text-xs"> ({product.reviewCount})</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleting === product.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />}
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
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No products yet. Add your first product.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 py-8 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-gray-900 text-lg mb-6">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name *</label>
                <input type="text" value={form.name} onChange={(e) => f('name', e.target.value)}
                  placeholder="e.g. LED Headlight Kit"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Niche</label>
                  <select value={form.nicheId} onChange={(e) => f('nicheId', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white">
                    {niches.map((n) => <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <input type="text" value={form.category} onChange={(e) => f('category', e.target.value)}
                    placeholder="e.g. Electronics"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (DZD) *</label>
                  <input type="number" value={form.price} onChange={(e) => f('price', e.target.value)}
                    placeholder="5000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Compare Price</label>
                  <input type="number" value={form.comparePrice} onChange={(e) => f('comparePrice', e.target.value)}
                    placeholder="6000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => f('stock', e.target.value)}
                    placeholder="100"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image URLs (one per line)</label>
                <textarea value={form.images} onChange={(e) => f('images', e.target.value)} rows={2}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => f('description', e.target.value)} rows={2}
                  placeholder="Product description…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => f('tags', e.target.value)}
                  placeholder="led, car, accessories"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isNew} onChange={(e) => f('isNew', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">New badge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => f('isFeatured', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">Featured</span>
                </label>
              </div>
            </div>

            {saveError && <p className="text-red-500 text-sm mt-3">{saveError}</p>}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.price}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
