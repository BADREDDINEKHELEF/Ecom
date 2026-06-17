'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Store, Phone, CheckCircle, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries'
import { useT } from '@/lib/store/langStore'

type View = 'login' | 'forgot_phone' | 'forgot_otp'

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

  const [view, setView]         = useState<View>('login')
  const [form, setForm]         = useState({ email: '', password: '' })
  const [phone, setPhone]       = useState('')
  const [otp, setOtp]           = useState('')
  const [newPwd, setNewPwd]     = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const reset = (v: View) => { setView(v); setError(''); setSuccess(''); setOtp('') }

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    if (err) { setError(friendlyAuthError(err.message)); setLoading(false); return }

    const vendor = await getVendorByUserId(data.user.id)
    if (!vendor) {
      setError(t.seller.noSellerFound)
      await supabase.auth.signOut(); setLoading(false); return
    }
    if (!vendor.is_approved) { setLoading(false); router.push('/seller/pending'); return }
    if (!vendor.is_active) {
      setError(t.seller.suspended)
      await supabase.auth.signOut(); setLoading(false); return
    }
    router.push('/seller/dashboard'); router.refresh()
  }

  // ── Step 1 — Send OTP to phone ─────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Impossible d\'envoyer le code.'); return }
      setView('forgot_otp')
      setSuccess('Code envoyé sur WhatsApp ✓')
    } catch {
      setError('Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 — Verify OTP + set new password ─────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, newPassword: newPwd }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Code incorrect.'); return }
      setSuccess('Mot de passe mis à jour ! Connectez-vous.')
      setTimeout(() => reset('login'), 2000)
    } catch {
      setError('Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.seller.backToStore}
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                {view === 'login' ? <Store className="w-6 h-6 text-white" /> :
                 view === 'forgot_otp' ? <KeyRound className="w-6 h-6 text-white" /> :
                 <Phone className="w-6 h-6 text-white" />}
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {view === 'login'       ? t.seller.loginTitle :
               view === 'forgot_otp' ? 'Entrez le code' :
               'Mot de passe oublié ?'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'login'       ? t.seller.loginSub :
               view === 'forgot_otp' ? `Code envoyé au ${phone} via WhatsApp` :
               'Entrez votre numéro WhatsApp enregistré'}
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}

          {/* ── Login form ── */}
          {view === 'login' && (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" required value={form.email} autoComplete="username"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">{t.seller.passwordLabel}</label>
                  <button type="button" onClick={() => reset('forgot_phone')}
                    className="text-xs text-emerald-600 hover:underline font-medium">
                    {t.seller.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} required minLength={8}
                    value={form.password} autoComplete="current-password"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
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

          {/* ── Step 1: Enter phone ── */}
          {view === 'forgot_phone' && (
            <form className="space-y-4" onSubmit={handleSendOTP}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Numéro WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" required value={phone} autoComplete="tel"
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xx xxx xxx"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Numéro enregistré sur votre compte vendeur</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#25D366] text-white font-bold py-3.5 rounded-xl hover:bg-[#20c35a] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                Envoyer le code via WhatsApp
              </button>
              <button type="button" onClick={() => reset('login')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center">
                ← Retour à la connexion
              </button>
            </form>
          )}

          {/* ── Step 2: Enter OTP + new password ── */}
          {view === 'forgot_otp' && (
            <form className="space-y-4" onSubmit={handleVerifyOTP}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code WhatsApp (6 chiffres)</label>
                <input type="text" required maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.5em] font-bold text-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showNew ? 'text' : 'password'} required minLength={8}
                    value={newPwd} autoComplete="new-password"
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Min. 8 caractères"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Réinitialiser le mot de passe
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => reset('forgot_phone')}
                  className="text-gray-500 hover:text-gray-700">
                  ← Changer de numéro
                </button>
                <button type="button" onClick={handleSendOTP} disabled={loading}
                  className="text-emerald-600 hover:underline font-medium disabled:opacity-50">
                  Renvoyer le code
                </button>
              </div>
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
