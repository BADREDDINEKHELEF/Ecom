'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Store, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries'
import { useT } from '@/lib/store/langStore'

type View = 'login' | 'forgot'

function friendlyAuthError(msg: string): string {
  if (/invalid.*credentials|invalid.*password|wrong.*password/i.test(msg))
    return 'E-mail ou mot de passe incorrect. Réessayez.'
  if (/email.*not.*confirmed/i.test(msg))
    return 'Confirmez votre e-mail avant de vous connecter.'
  if (/too.*many.*requests|rate.*limit/i.test(msg))
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  if (/user.*not.*found|no.*user/i.test(msg))
    return 'Aucun compte trouvé avec cet e-mail.'
  if (/network|fetch/i.test(msg))
    return 'Erreur de connexion. Vérifiez votre accès internet.'
  return msg
}

export default function SellerLoginPage() {
  const router = useRouter()
  const t = useT()
  const [view, setView] = useState<View>('login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    if (err) { setError(friendlyAuthError(err.message)); setLoading(false); return }

    const vendor = await getVendorByUserId(data.user.id)
    if (!vendor) {
      setError(t.seller.noSellerFound)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }
    if (!vendor.is_approved) {
      setLoading(false)
      router.push('/seller/pending')
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

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/seller/reset-password`,
    })
    setLoading(false)
    if (err) { setError(friendlyAuthError(err.message)); return }
    setForgotSent(true)
  }

  const switchView = (v: View) => { setView(v); setError(''); setForgotSent(false) }

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
            <h1 className="text-2xl font-black text-gray-900">
              {view === 'forgot' ? t.seller.forgotPassword : t.seller.loginTitle}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'forgot' ? t.seller.forgotPasswordEmail : t.seller.loginSub}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Forgot password view ── */}
          {view === 'forgot' && (
            forgotSent ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-sm text-green-700">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{t.seller.forgotPasswordSuccess}</span>
                </div>
                <button
                  onClick={() => switchView('login')}
                  className="w-full text-sm text-emerald-600 font-bold hover:underline"
                >
                  ← {t.seller.backToLogin}
                </button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleForgot}>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.seller.forgotPasswordBtn}
                </button>
                <button type="button" onClick={() => switchView('login')}
                  className="w-full text-sm text-gray-500 hover:text-gray-700">
                  ← {t.seller.backToLogin}
                </button>
              </form>
            )
          )}

          {/* ── Login view ── */}
          {view === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">{t.seller.passwordLabel}</label>
                  <button type="button" onClick={() => switchView('forgot')}
                    className="text-xs text-emerald-600 hover:underline font-medium">
                    {t.seller.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'} required minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? 'Masquer' : 'Afficher'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.seller.loginBtn}
              </button>
            </form>
          )}

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
