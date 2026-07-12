'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Store, Mail, Lock, User, Phone, MapPin, Eye, EyeOff,
  Loader2, TrendingUp, Shield, Zap, Users,
} from 'lucide-react'
import { ALL_WILAYAS } from '@/lib/data/wilayas'
import { useT } from '@/lib/store/langStore'

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)
}

function buildQuery(form: Record<string, string>): string {
  const params = new URLSearchParams()
  Object.entries(form).forEach(([key, val]) => {
    if (val) params.set(key, val)
  })
  return params.toString()
}

export default function SellerSignupSection() {
  const t = useT()
  const router = useRouter()
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    storeName: '', storeSlug: '', phone: '', wilaya: '',
  })

  const PERKS = [
    { icon: TrendingUp, title: t.seller.perk1Title, text: t.seller.perk1Text },
    { icon: Zap,        title: t.seller.perk2Title, text: t.seller.perk2Text },
    { icon: Shield,     title: t.seller.perk3Title, text: t.seller.perk3Text },
    { icon: Users,      title: t.seller.perk4Title, text: t.seller.perk4Text },
  ]

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    if (key === 'storeName') next.storeSlug = slugify(val)
    setForm(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.storeName || !form.storeSlug) { setError(t.seller.storeNameRequired); return }
    if (!form.email || !form.password) { setError(t.seller.registrationFailed); return }
    setLoading(true); setError('')

    // The full seller registration requires email OTP verification. Redirect to
    // the dedicated registration page, prefilling the data collected here.
    const query = buildQuery(form)
    router.push(`/seller/register${query ? `?${query}` : ''}`)
  }

  return (
    <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Store className="w-4 h-4" /> {t.seller.sellOnStoreDz}
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            {t.seller.startStoreToday}
          </h2>
          <p className="text-emerald-200 text-lg max-w-xl mx-auto">
            {t.seller.joinMerchants}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* Left — perks */}
          <div className="space-y-6">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">{title}</p>
                  <p className="text-emerald-300 text-sm leading-relaxed">{text}</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4">
              {[
                { value: '58',       label: t.seller.wilayasCovered },
                { value: '2 000 DA', label: t.seller.commissionOnly },
                { value: '24h',      label: t.seller.goesLive },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white/10 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs text-emerald-300 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900">{t.seller.createYourStore}</h3>
                    <p className="text-xs text-gray-400">{t.seller.freeToJoin}</p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label htmlFor="ss-fullName" className="sr-only">{t.seller.fullNamePH}</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="ss-fullName" required type="text" value={form.fullName} onChange={(e) => f('fullName', e.target.value)}
                        placeholder={t.seller.fullNamePH}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ss-email" className="sr-only">{t.seller.emailPH}</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="ss-email" required type="email" value={form.email} onChange={(e) => f('email', e.target.value)}
                        placeholder={t.seller.emailPH}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ss-password" className="sr-only">{t.seller.passwordPH}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="ss-password" required type={showPwd ? 'text' : 'password'} minLength={6}
                        value={form.password} onChange={(e) => f('password', e.target.value)}
                        placeholder={t.seller.passwordPH}
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.seller.storeInfo}</p>
                  </div>

                  <div>
                    <label htmlFor="ss-storeName" className="sr-only">{t.seller.storeNamePH}</label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input id="ss-storeName" required type="text" value={form.storeName} onChange={(e) => f('storeName', e.target.value)}
                        placeholder={t.seller.storeNamePH}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ss-storeSlug" className="sr-only">{t.seller.myStorePH}</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                      <span className="px-3 py-3 bg-gray-50 text-gray-400 text-xs border-r border-gray-200 whitespace-nowrap">storedz.dz/shop/</span>
                      <input id="ss-storeSlug" required type="text" value={form.storeSlug}
                        onChange={(e) => f('storeSlug', slugify(e.target.value))}
                        placeholder={t.seller.myStorePH}
                        className="flex-1 px-3 py-3 text-sm focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="ss-phone" className="sr-only">{t.seller.phonePH}</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input id="ss-phone" type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)}
                          placeholder={t.seller.phonePH}
                          pattern="^(0[5-7][0-9]{8})$"
                          title="Format: 05XXXXXXXX ou 06XXXXXXXX ou 07XXXXXXXX"
                          className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ss-wilaya" className="sr-only">{t.seller.wilayaPH}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select id="ss-wilaya" value={form.wilaya} onChange={(e) => f('wilaya', e.target.value)}
                          className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white">
                          <option value="">{t.seller.wilayaPH}</option>
                          {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 mt-1">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
                    {loading ? t.seller.creating : t.seller.createFree}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    {t.seller.alreadySeller}{' '}
                    <Link href="/seller/login" className="text-emerald-600 font-semibold hover:underline">
                      {t.seller.signIn}
                    </Link>
                    {' · '}{t.seller.commissionNote}
                  </p>
                </form>
          </div>
        </div>
      </div>
    </section>
  )
}
