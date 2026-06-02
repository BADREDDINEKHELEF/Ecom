'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Search, Edit2, Trash2, Package, ArrowUpDown } from 'lucide-react'
import { products as initialProducts } from '@/lib/data/products'
import { niches } from '@/lib/data/niches'
import { formatPrice, discount } from '@/lib/utils'
import { Product } from '@/types'
import Badge from '@/components/ui/Badge'

export default function AdminProductsPage() {
  const [productList, setProductList] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const [filterNiche, setFilterNiche] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', price: '', stock: '', nicheId: 'cars', category: '', description: '' })

  const filtered = productList.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchNiche = !filterNiche || p.nicheId === filterNiche
    return matchSearch && matchNiche
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', price: '', stock: '', nicheId: 'cars', category: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock), nicheId: p.nicheId, category: p.category, description: p.description })
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this product?')) {
      setProductList((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleSave = () => {
    if (!form.name || !form.price) return
    if (editing) {
      setProductList((prev) =>
        prev.map((p) =>
          p.id === editing.id
            ? { ...p, name: form.name, price: Number(form.price), stock: Number(form.stock), nicheId: form.nicheId, category: form.category, description: form.description }
            : p
        )
      )
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        nicheId: form.nicheId,
        category: form.category || 'Accessories',
        name: form.name,
        description: form.description,
        price: Number(form.price),
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'],
        stock: Number(form.stock) || 0,
        rating: 0,
        reviewCount: 0,
        tags: [],
        isNew: true,
      }
      setProductList((prev) => [newProduct, ...prev])
    }
    setShowModal(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} products</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
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
        <div className="flex gap-2">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Product', 'Niche', 'Category', 'Price', 'Stock', 'Rating', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">
                    <span className="flex items-center gap-1">
                      {h}
                      {['Price', 'Stock'].includes(h) && <ArrowUpDown className="w-3 h-3" />}
                    </span>
                  </th>
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
                          <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="48px" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 max-w-[200px] truncate">{product.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {product.isNew && <Badge variant="new" className="text-[10px] px-1.5 py-0">New</Badge>}
                            {product.isFeatured && <Badge variant="warning" className="text-[10px] px-1.5 py-0">Featured</Badge>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        <span>{niche?.emoji}</span> {niche?.name.split(' ')[0]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{product.category}</td>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-bold text-gray-900">{formatPrice(product.price)}</p>
                        {hasDiscount && (
                          <p className="text-xs text-red-500">-{discount(product.price, product.comparePrice!)}%</p>
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
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-gray-900 text-lg mb-6">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. LED Headlight Kit"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Niche</label>
                  <select
                    value={form.nicheId}
                    onChange={(e) => setForm({ ...form, nicheId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
                  >
                    {niches.map((n) => (
                      <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Electronics"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Price (DZD)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="5000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="100"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Product description…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                {editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
