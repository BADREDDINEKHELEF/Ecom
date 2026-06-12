'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Store, TrendingUp, Shield, Truck, DollarSign,
  Users, BarChart3, ArrowRight, CheckCircle,
} from 'lucide-react'
import { niches } from '@/lib/data/niches'
import { useT } from '@/lib/store/langStore'
import SellerSignupSection from '@/components/home/SellerSignupSection'

const nicheAccent: Record<string, { btn: string }> = {
  cars:    { btn: 'bg-orange-500 hover:bg-orange-400' },
  animals: { btn: 'bg-amber-400 hover:bg-amber-300 text-gray-900' },
  kids:    { btn: 'bg-pink-500 hover:bg-pink-400' },
  deco:    { btn: 'bg-amber-700 hover:bg-amber-600' },
}

export default function HomepageContent() {
  const t = useT()

  const STEPS = [
    { n: '1', title: t.becomeSeller.step1Title, desc: t.becomeSeller.step1Desc },
    { n: '2', title: t.becomeSeller.step2Title, desc: t.becomeSeller.step2Desc },
    { n: '3', title: t.becomeSeller.step3Title, desc: t.becomeSeller.step3Desc },
    { n: '4', title: t.becomeSeller.step4Title, desc: t.becomeSeller.step4Desc },
  ]

  const REQUIREMENTS = [
    t.becomeSeller.req1,
    t.becomeSeller.req2,
    t.becomeSeller.req3,
    t.becomeSeller.req4,
  ]

  const FEATURES = [
    { icon: Store,      title: t.becomeSeller.feature1Title, desc: t.becomeSeller.feature1Desc },
    { icon: Truck,      title: t.becomeSeller.feature2Title, desc: t.becomeSeller.feature2Desc },
    { icon: BarChart3,  title: t.becomeSeller.feature3Title, desc: t.becomeSeller.feature3Desc },
    { icon: Shield,     title: t.becomeSeller.feature4Title, desc: t.becomeSeller.feature4Desc },
    { icon: DollarSign, title: t.becomeSeller.feature5Title, desc: t.becomeSeller.feature5Desc },
    { icon: Users,      title: t.becomeSeller.feature6Title, desc: t.becomeSeller.feature6Desc },
  ]

  const STATS = [
    { value: '200+',     label: t.becomeSeller.statSellers },
    { value: '58',       label: t.becomeSeller.statWilayas },
    { value: '2 000 DA', label: t.becomeSeller.statMonthlyFee },
    { value: '0%',       label: t.becomeSeller.statCommission },
  ]

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            {t.becomeSeller.tagline}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-5">
            {t.becomeSeller.heroTitle}<br />
            <span className="text-emerald-400">{t.becomeSeller.heroTitleAccent}</span>
          </h1>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            {t.becomeSeller.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/seller/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 font-black px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-colors text-base"
            >
              <Store className="w-5 h-5" /> {t.becomeSeller.startSelling}
            </Link>
            <Link
              href="/seller/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20"
            >
              {t.becomeSeller.signInDashboard}
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
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

      {/* ── Niche Selection ───────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-emerald-600 font-semibold text-sm mb-2">{t.becomeSeller.nicheSectionBadge}</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
              {t.becomeSeller.nicheSectionTitle}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              {t.becomeSeller.nicheSectionSub}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {niches.map((niche) => {
              const styles = nicheAccent[niche.id] ?? { btn: 'bg-indigo-600 hover:bg-indigo-500' }
              return (
                <Link
                  key={niche.id}
                  href={`/seller/register?niche=${niche.id}`}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${niche.gradient} p-6 flex flex-col gap-4 ring-2 ring-transparent hover:ring-white/20 transition-all duration-300 hover:scale-[1.02]`}
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <Image
                      src={niche.banner}
                      alt={niche.name}
                      fill
                      className="object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
                      sizes="(max-width: 640px) 100vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 left-3 text-4xl">{niche.emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white mb-1">{niche.name}</h3>
                    <p className="text-sm text-gray-300 mb-4 leading-relaxed">{niche.description}</p>
                    <span className={`inline-flex items-center gap-2 ${styles.btn} text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors`}>
                      {t.becomeSeller.nicheSellHere} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-gray-900 mb-3">{t.becomeSeller.featuresTitle}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t.becomeSeller.featuresSub}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">{t.becomeSeller.howItWorks}</h2>
            <p className="text-gray-500">{t.becomeSeller.howItWorksSub}</p>
          </div>
          <div className="space-y-5">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
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

      {/* ── Requirements ─────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 mb-3">{t.becomeSeller.requirementsTitle}</h2>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4">
          {REQUIREMENTS.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Signup Form ───────────────────────────────────────────────── */}
      <SellerSignupSection />

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <div className="bg-emerald-600 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-black mb-4">{t.becomeSeller.ctaTitle}</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">{t.becomeSeller.ctaSub}</p>
        <Link
          href="/seller/register"
          className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-10 py-4 rounded-2xl hover:bg-emerald-50 transition-colors text-base"
        >
          {t.becomeSeller.createMyStore} <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-white/60 text-sm mt-4">{t.becomeSeller.freeNote}</p>
      </div>
    </>
  )
}
