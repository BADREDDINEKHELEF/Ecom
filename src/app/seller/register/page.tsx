'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Lock, User, Store, Phone, MapPin, FileText, Eye, EyeOff, Loader2, CheckCircle, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_WILAYAS } from '@/lib/data/wilayas'
import { useT } from '@/lib/store/langStore'

const RESERVED_SLUGS = new Set(['admin', 'api', 'store', 'auth', 'seller', 'dashboard', 'search', 'deals', 'pricing', 'checkout', 'orders', 'profile', 'wishlist', 'compare', 'track', 'cart', 'offline', 'register', 'login'])

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)
}

type View = 'form' | 'otp'

export default function SellerRegisterPage() {
  const router = useRouter()
  const t = useT()
  const [view, setView]       = useState<View>('form')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [otp, setOtp]         = useState('')
  const [done, setDone]       = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    storeName: '', storeSlug: '', phone: '', wilaya: '', description: '',
  })

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    if (key === 'storeName') next.storeSlug = slugify(val)
    setForm(next)
  }

  // Step 1 — validate form + send OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.storeName || !form.storeSlug) { setError(t.seller.storeNameRequired); return }
    if (RESERVED_SLUGS.has(form.storeSlug)) { setError(t.seller.urlTaken); return }
    if (!form.phone) { setError('Numéro WhatsApp requis pour vérifier votre compte.'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/seller/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error ?? 'Impossible d\'envoyer le code.'); return }
      setView('otp')
    } catch {
      setError('Erreur de connexion. Vérifiez votre accès internet.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify OTP then create account
  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      // Verify OTP
      const verifyRes = await fetch('/api/seller/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, otp }),
      })
      const verifyBody = await verifyRes.json()
      if (!verifyRes.ok) { setError(verifyBody.error ?? 'Code incorrect.'); setLoading(false); return }

      // Create auth account
      const supabase = createClient()
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName } },
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      if (!authData.user) { setError(t.seller.registrationFailed); setLoading(false); return }

      // Create vendor record
      const res = await fetch('/api/seller/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name:  form.storeName,
          store_slug:  form.storeSlug,
          logo_url:    null,
          description: form.description || null,
          phone:       form.phone || null,
          wilaya:      form.wilaya || null,
        }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json()
        setError(res.status === 409 ? t.seller.urlTaken : (msg ?? t.seller.registrationFailed))
        await supabase.auth.signOut()
      } else {
        setDone(true)
      }
    } catch {
      setError(t.seller.registrationFailed)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(''); setLoading(true)
    try {
      await fetch('/api/seller/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone }),
      })
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
          <h1 className="text-2xl font-black text-gray-900 mb-2">{t.seller.storeCreated}</h1>
          <p className="text-gray-500 text-sm mb-6">{t.seller.storeCreatedMsg}</p>
          <Link href="/seller/login"
            className="block w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors text-center">
            {t.seller.goToLogin}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/become-seller" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t.common.back}
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              {view === 'otp' ? <KeyRound className="w-6 h-6 text-white" /> : <Store className="w-6 h-6 text-white" />}
            </div>
            <h1 className="text-2xl font-black text-gray-900">
              {view === 'otp' ? 'Vérifiez votre WhatsApp' : t.seller.registerTitle}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'otp' ? `Code envoyé au ${form.phone} via WhatsApp` : t.seller.registerSub}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
          )}

          {/* ── OTP verification step ── */}
          {view === 'otp' && (
            <form onSubmit={handleVerifyAndCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code WhatsApp (6 chiffres)</label>
                <input type="text" required maxLength={6} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456" autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-center tracking-[0.5em] font-bold text-lg focus:outline-none focus:border-emerald-400" />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Vérifier et créer mon compte
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setView('form'); setOtp(''); setError('') }}
                  className="text-gray-500 hover:text-gray-700">
                  ← Modifier mes infos
                </button>
                <button type="button" onClick={handleResend} disabled={loading}
                  className="text-emerald-600 hover:underline font-medium disabled:opacity-50">
                  Renvoyer le code
                </button>
              </div>
            </form>
          )}

          {/* ── Registration form ── */}
          {view === 'form' && <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.seller.accountInfo}</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.fullNameLabel}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="text" value={form.fullName} onChange={(e) => f('fullName', e.target.value)}
                  placeholder="Mohammed Amiri"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.emailLabel}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.passwordLabel}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type={showPwd ? 'text' : 'password'} minLength={8}
                  value={form.password} onChange={(e) => f('password', e.target.value)}
                  placeholder={t.seller.passwordMin}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">{t.seller.storeInfo}</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.storeNameLabel}</label>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input required type="text" value={form.storeName} onChange={(e) => f('storeName', e.target.value)}
                  placeholder={t.seller.myAlgerianShop}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.storeUrlLabel}</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.phoneLabel}</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="tel" required value={form.phone} onChange={(e) => f('phone', e.target.value)}
                    placeholder={t.seller.phonePHRegister}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.wilayaLabel}</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={form.wilaya} onChange={(e) => f('wilaya', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white">
                    <option value="">{t.seller.selectWilaya}</option>
                    {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.seller.descLabel}</label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                <textarea value={form.description} onChange={(e) => f('description', e.target.value)}
                  rows={3} maxLength={300} placeholder={t.seller.descPH}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-base">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
              {loading ? t.seller.creating : t.seller.createMyStore}
            </button>

            <p className="text-xs text-gray-400 text-center">{t.seller.terms}</p>
          </form>}
        </div>
      </div>
    </div>
  )
}
