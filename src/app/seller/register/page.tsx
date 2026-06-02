'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, User, Store, Phone, MapPin, FileText, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createVendor } from '@/lib/supabase/queries'
import { ALL_WILAYAS } from '@/lib/data/wilayas'

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)
}

export default function SellerRegisterPage() {
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    storeName: '', storeSlug: '', phone: '', wilaya: '', description: '',
  })

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    if (key === 'storeName') next.storeSlug = slugify(val)
    setForm(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.storeName || !form.storeSlug) { setError('Store name is required.'); return }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // 1. Create Supabase auth user
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
    if (!authData.user) { setError('Registration failed. Try again.'); setLoading(false); return }

    // 2. Create vendor record
    try {
      await createVendor({
        user_id: authData.user.id,
        store_name: form.storeName,
        store_slug: form.storeSlug,
        logo_url: null,
        description: form.description || null,
        phone: form.phone || null,
        wilaya: form.wilaya || null,
      })
      setDone(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create store'
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('That store URL is already taken. Try a different store name.')
      } else {
        setError(msg)
      }
      // Clean up auth user on failure
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Store Created!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Check your email to confirm your account, then sign in to start selling.
          </p>
          <Link href="/seller/login"
            className="block w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-center">
            Go to Seller Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/become-seller" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Create your store</h1>
            <p className="text-gray-500 text-sm mt-1">Start selling on ShopDZ in minutes</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Info</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="text" value={form.fullName} onChange={(e) => f('fullName', e.target.value)}
                  placeholder="Mohammed Amiri"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type={showPwd ? 'text' : 'password'} minLength={6}
                  value={form.password} onChange={(e) => f('password', e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Store Info</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Name</label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="text" value={form.storeName} onChange={(e) => f('storeName', e.target.value)}
                  placeholder="My Algerian Shop"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store URL</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">shopdz.dz/shop/</span>
                <input required type="text" value={form.storeSlug}
                  onChange={(e) => f('storeSlug', slugify(e.target.value))}
                  placeholder="my-shop"
                  className="flex-1 px-3 py-3 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)}
                    placeholder="05xx xxx xxx"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wilaya</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={form.wilaya} onChange={(e) => f('wilaya', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white">
                    <option value="">Select…</option>
                    {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Description</label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <textarea value={form.description} onChange={(e) => f('description', e.target.value)}
                  rows={3} maxLength={300} placeholder="What do you sell?"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
              {loading ? 'Creating Store…' : 'Create My Store'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              By registering you agree to our seller terms. Commission: 10% per sale.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
