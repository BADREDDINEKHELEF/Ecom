'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, Store, CheckCircle, KeyRound } from 'lucide-react'
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
  const [resetEmail, setResetEmail] = useState('')
  const [otp, setOtp]           = useState('')
  const [newPwd, setNewPwd]     = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const reset = (v: View) => { setView(v); setError(''); setSuccess(''); setResetEmail(''); setOtp('') }

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

  // ── Step 1 ? Send OTP to email ─────────────────────────────────────────────
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Impossible d\'envoyer le code.'); return }
      if (body._devOtp) {
        const hint = body._emailError ? ` ? SMTP: ${body._emailError.slice(0, 120)}` : ' (email non envoyé)'
        setError(`Code OTP : ${body._devOtp}${hint}`)
      }
      setView('forgot_otp')
      setSuccess('Code envoyé par e-mail ✓')
    } catch {
      setError('Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2 ? Verify OTP + set new password ─────────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, otp, newPassword: newPwd }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Code incorrect.'); return }
      setSuccess('Mot de passe mis à  jour ! Connectez-vous.')
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
                 <Mail className="w-6 h-6 text-white" />}
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">
               {view === 'login'       ? t.seller.loginTitle :
                view === 'forgot_otp' ? 'Entrez le code' :
                'Mot de passe oublié ?'}
             </h1>
             <p className="text-gray-500 text-sm mt-1">
               {view === 'login'       ? t.seller.loginSub :
                 view === 'forgot_otp' ? `Code envoyé à  ${resetEmail}` :
                'Entrez votre adresse e-mail enregistrée'}
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
                    placeholder="•¢•¢•¢•¢"
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

          {/* ── Step 1: Enter email ── */}
          {view === 'forgot_phone' && (
            <form className="space-y-4" onSubmit={handleSendOTP}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse e-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" required value={resetEmail} autoComplete="email"
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="vendeur@exemple.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Adresse e-mail enregistrée sur votre compte vendeur</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-5 h-5" />}
                Envoyer le code par e-mail
              </button>
              <button type="button" onClick={() => reset('login')}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center">
                ← Retour à  la connexion
              </button>
            </form>
          )}

          {/* ── Step 2: Enter OTP + new password ── */}
          {view === 'forgot_otp' && (
            <form className="space-y-4" onSubmit={handleVerifyOTP}>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code de vérification (6 chiffres)</label>
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
                  ← Changer d&apos;e-mail
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
