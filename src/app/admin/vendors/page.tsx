'use client'

import { useState, useEffect, useCallback } from 'react'
import { Store, CheckCircle, XCircle, ExternalLink, Loader2, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Vendor } from '@/lib/supabase/queries'

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    const { data } = await sb.from('vendors').select('*').order('created_at', { ascending: false })
    setVendors((data || []) as Vendor[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (id: string, approve: boolean) => {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    await sb.from('vendors').update({ is_approved: approve }).eq('id', id)
    setVendors((prev) => prev.map((v) => v.id === id ? { ...v, is_approved: approve } : v))
  }

  const handleToggleActive = async (v: Vendor) => {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    await sb.from('vendors').update({ is_active: !v.is_active }).eq('id', v.id)
    setVendors((prev) => prev.map((x) => x.id === v.id ? { ...x, is_active: !x.is_active } : x))
  }

  const filtered = vendors.filter((v) => {
    if (filter === 'approved') return v.is_approved
    if (filter === 'pending') return !v.is_approved
    return true
  })

  const stats = {
    total: vendors.length,
    approved: vendors.filter((v) => v.is_approved).length,
    pending: vendors.filter((v) => !v.is_approved).length,
    active: vendors.filter((v) => v.is_active).length,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Vendors</h1>
        <p className="text-gray-500 text-sm mt-1">Manage seller accounts and approvals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: stats.total, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Pending', value: stats.pending, icon: XCircle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Active', value: stats.active, icon: Store, color: 'text-blue-600 bg-blue-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'approved', 'pending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-100'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No vendors found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Store', 'Slug', 'Wilaya', 'Commission', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-emerald-700 font-bold text-sm">{v.store_name[0]}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{v.store_name}</p>
                          {v.phone && <p className="text-xs text-gray-400">{v.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <a href={`/shop/${v.store_slug}`} target="_blank"
                        className="flex items-center gap-1 text-indigo-600 hover:underline text-xs font-mono">
                        {v.store_slug} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{v.wilaya || '—'}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{v.commission_rate}%</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          v.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {v.is_approved ? 'Approved' : 'Pending'}
                        </span>
                        {!v.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">Suspended</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {!v.is_approved ? (
                          <button onClick={() => handleApprove(v.id, true)}
                            className="flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-800 transition-colors">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                        ) : (
                          <button onClick={() => handleApprove(v.id, false)}
                            className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-700 transition-colors">
                            <XCircle className="w-4 h-4" /> Revoke
                          </button>
                        )}
                        <button onClick={() => handleToggleActive(v)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title={v.is_active ? 'Suspend' : 'Activate'}>
                          {v.is_active ? <ToggleRight className="w-5 h-5 text-indigo-500" /> : <ToggleLeft className="w-5 h-5" />}
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
    </div>
  )
}
