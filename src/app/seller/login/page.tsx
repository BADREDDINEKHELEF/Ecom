'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries'
import { useT } from '@/lib/store/langStore'

export default function SellerLoginPage() {
  const router = useRouter()
  const t = useT()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    if (err) { setError(err.message); setLoading(false); return }

    const vendor = await getVendorByUserId(data.user.id)
    if (!vendor) {
      setError(t.seller.noSellerFound)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    if (!vendor.is_active) {
      setError(t.seller.suspended)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    router.push('/seller/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.seller.backToStore}
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">{t.seller.loginTitle}</h1>
            <p className="text-gray-500 text-sm mt-1">{t.seller.loginSub}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.passwordLabel}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'} required minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.seller.loginBtn}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t.seller.noSellerAccount}{' '}
            <Link href="/become-seller" className="text-emerald-600 font-bold hover:underline">
              {t.seller.applyNow}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
