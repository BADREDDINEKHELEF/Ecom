'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  Package,
  BarChart3,
  Truck,
  Clock,
  BadgeCheck,
  ArrowRight,
  Building2,
  Rocket,
  Lock,
  Users,
  CheckCircle,
} from 'lucide-react'
import { useT } from '@/lib/store/langStore'

export default function WholesalePage() {
  const t = useT()
  const w = t.wholesale
  const [email, setEmail] = useState('')
  const [waitlistState, setWaitlistState] = useState<'idle' | 'submitting' | 'done'>('idle')

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setWaitlistState('submitting')
    // Store in localStorage for now — in v2.0 this will call an API
    const existing = JSON.parse(localStorage.getItem('waitlist') ?? '[]')
    localStorage.setItem('waitlist', JSON.stringify([...existing, { email, ts: Date.now() }]))
    await new Promise((r) => setTimeout(r, 800))
    setWaitlistState('done')
  }

  const STATS = [
    { value: w.stat1Value, label: w.stat1Label },
    { value: w.stat2Value, label: w.stat2Label },
    { value: w.stat3Value, label: w.stat3Label },
    { value: w.stat4Value, label: w.stat4Label },
  ]

  const FEATURES = [
    { icon: ShieldCheck, title: w.feature1Title, desc: w.feature1Desc },
    { icon: Package,     title: w.feature2Title, desc: w.feature2Desc },
    { icon: BarChart3,   title: w.feature3Title, desc: w.feature3Desc },
    { icon: Truck,       title: w.feature4Title, desc: w.feature4Desc },
    { icon: Clock,       title: w.feature5Title, desc: w.feature5Desc },
    { icon: BadgeCheck,  title: w.feature6Title, desc: w.feature6Desc },
  ]

  const STEPS = [
    { n: '1', title: w.step1Title, desc: w.step1Desc },
    { n: '2', title: w.step2Title, desc: w.step2Desc },
    { n: '3', title: w.step3Title, desc: w.step3Desc },
  ]

  const BUYERS = [
    { title: w.buyer1Title, desc: w.buyer1Desc },
    { title: w.buyer2Title, desc: w.buyer2Desc },
    { title: w.buyer3Title, desc: w.buyer3Desc },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Building2 className="w-4 h-4 text-indigo-300" />
            {w.tagline}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            {w.heroTitle}<br />
            <span className="text-indigo-300">{w.heroTitleAccent}</span>
          </h1>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            {w.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#"
              onClick={(e) => { e.preventDefault(); alert('Fonctionnalité bientôt disponible. Inscrivez-vous sur la liste d\'attente !') }}
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-base"
            >
              <Package className="w-5 h-5" /> {w.postRfq}
            </Link>
            <Link
              href="/seller/register"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20"
            >
              {w.iAmSupplier}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-black text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-gray-900 mb-3">{w.featuresTitle}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{w.featuresSub}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">{w.howItWorks}</h2>
            <p className="text-gray-500">{w.howItWorksSub}</p>
          </div>
          <div className="space-y-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-lg">{n}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Buyers */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-gray-900 mb-3">{w.buyersTitle}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{w.buyersSub}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {BUYERS.map(({ title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow"
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Building2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Bottom */}
      <div className="bg-indigo-600 py-20 px-4 text-center text-white">
        <h2 className="text-3xl font-black mb-4">{w.ctaTitle}</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">{w.ctaSub}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/rfq"
            className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-black px-10 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-base"
          >
            {w.ctaPostRfq} <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/become-seller"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-bold px-10 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20"
          >
            {w.ctaSupplierDir}
          </Link>
        </div>
      </div>

      {/* B2B v2.0 Waitlist Section */}
      <div className="bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-sm font-bold px-4 py-2 rounded-full mb-6">
            <Rocket className="w-4 h-4" /> B2B Marketplace — Version 2.0
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            L&apos;Alibaba de l&apos;Algérie arrive.
          </h2>
          <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
            Une marketplace B2B complète connectant fournisseurs, grossistes et détaillants à travers toute l&apos;Algérie. Soyez parmi les premiers à l&apos;utiliser.
          </p>

          {/* Feature teasers */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: ShieldCheck, title: 'Trade Assurance', desc: 'Paiement sécurisé en escrow — personne ne fait ça en Algérie' },
              { icon: Users,       title: 'Fournisseurs vérifiés', desc: 'Badges de vérification pour les vrais fabricants et importateurs' },
              { icon: BarChart3,   title: 'Demandes de devis (RFQ)', desc: 'Envoyez une demande, recevez des offres de plusieurs fournisseurs' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-indigo-300" />
                </div>
                <p className="font-bold text-white text-sm mb-1">{title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Waitlist form */}
          {waitlistState === 'done' ? (
            <div className="flex items-center justify-center gap-3 bg-green-500/20 border border-green-400/30 rounded-2xl px-6 py-5">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div className="text-left">
                <p className="font-bold text-green-300">Vous êtes sur la liste !</p>
                <p className="text-green-400 text-sm">Nous vous contacterons en priorité lors du lancement de la v2.0.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={waitlistState === 'submitting'}
                className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {waitlistState === 'submitting' ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Rocket className="w-4 h-4" /> Rejoindre la liste</>
                )}
              </button>
            </form>
          )}

          <p className="text-gray-500 text-xs mt-4 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Aucun spam. Notification à l&apos;accès anticipé uniquement.
          </p>
        </div>
      </div>

      {/* Footer Nav */}
      <div className="py-6 px-4 text-center border-t border-gray-100">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          <Package className="inline w-4 h-4 mr-1" /> {w.backToStoreDz}
        </Link>
      </div>
    </div>
  )
}
