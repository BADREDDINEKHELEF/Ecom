'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Shield, Truck, RefreshCw, Star } from 'lucide-react'
import { niches } from '@/lib/data/niches'
import { getFeaturedProducts } from '@/lib/data/products'
import ProductCard from '@/components/shop/ProductCard'
import { useT } from '@/lib/store/langStore'
import SellerSignupSection from '@/components/home/SellerSignupSection'

const nicheAccentStyles: Record<string, { btn: string; badge: string }> = {
  cars:    { btn: 'bg-orange-500 hover:bg-orange-400',               badge: 'bg-orange-500/20 text-orange-300' },
  animals: { btn: 'bg-amber-400 hover:bg-amber-300 text-gray-900',   badge: 'bg-amber-400/20 text-amber-300' },
  kids:    { btn: 'bg-pink-400 hover:bg-pink-300',                   badge: 'bg-pink-400/20 text-pink-300' },
  deco:    { btn: 'bg-amber-600 hover:bg-amber-500',                 badge: 'bg-amber-600/20 text-amber-400' },
}

export default function HomePage() {
  const featured = getFeaturedProducts()
  const t = useT()

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gray-950 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 text-indigo-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Star className="w-4 h-4 fill-current" />
            {t.home.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-tight">
            {t.home.title}<br />
            <span className="text-indigo-400">{t.home.accent}</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.home.sub}</p>
        </div>

        {/* Niche Cards */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {niches.map((niche) => {
            const styles = nicheAccentStyles[niche.id]
            return (
              <Link
                key={niche.id}
                href={`/${niche.id}`}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${niche.gradient} p-7 flex flex-col gap-4 group cursor-pointer`}
              >
                <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                  <Image
                    src={niche.banner}
                    alt={niche.name}
                    fill
                    className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-5xl">{niche.emoji}</span>
                </div>

                <div>
                  <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-2 ${styles.badge}`}>
                    {niche.categories.length} {t.home.categories}
                  </span>
                  <h2 className="text-xl font-black text-white mb-1">{t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.name ?? niche.name}</h2>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">{t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.description ?? niche.description}</p>
                  <span className={`inline-flex items-center gap-2 ${styles.btn} text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors`}>
                    {t.home.shopNow} <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <Truck className="w-6 h-6 text-indigo-600" />, title: t.trust.delivery, text: t.trust.deliveryText },
            { icon: <Shield className="w-6 h-6 text-indigo-600" />, title: t.trust.secure, text: t.trust.secureText },
            { icon: <RefreshCw className="w-6 h-6 text-indigo-600" />, title: t.trust.returns, text: t.trust.returnsText },
            { icon: <Star className="w-6 h-6 text-indigo-600" />, title: t.trust.quality, text: t.trust.qualityText },
          ].map(({ icon, title, text }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-indigo-600 font-semibold text-sm mb-1">{t.home.trendingBadge}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{t.home.trendingTitle}</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ── Niche Spotlights ─────────────────────────────────────────────── */}
      {niches.map((niche) => {
        const nicheProducts = getFeaturedProducts(niche.id).slice(0, 4)
        const styles = nicheAccentStyles[niche.id]
        if (nicheProducts.length === 0) return null
        return (
          <section key={niche.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-end justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{niche.emoji}</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">{t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.name ?? niche.name}</h2>
                  <p className="text-sm text-gray-500">{t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.description ?? niche.description}</p>
                </div>
              </div>
              <Link
                href={`/${niche.id}`}
                className={`hidden sm:inline-flex items-center gap-1.5 ${styles.btn} text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors`}
              >
                {t.common.viewAll} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {nicheProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-5 sm:hidden">
              <Link
                href={`/${niche.id}`}
                className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-sm hover:underline"
              >
                {t.common.viewAll} {t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.name ?? niche.name} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )
      })}

      {/* ── Seller Signup ────────────────────────────────────────────────── */}
      <SellerSignupSection />

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="bg-indigo-600 text-white mx-4 sm:mx-6 lg:mx-8 rounded-2xl mb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-8 py-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            {t.home.shopNow}
          </h2>
          <p className="text-indigo-200 mb-8">{t.home.sub}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {niches.map((niche) => {
              const styles = nicheAccentStyles[niche.id]
              return (
                <Link
                  key={niche.id}
                  href={`/${niche.id}`}
                  className={`${styles.btn} font-bold px-7 py-3 rounded-xl transition-colors w-full sm:w-auto text-center`}
                >
                  {niche.emoji} {t.niches[niche.id as 'cars'|'animals'|'kids'|'deco']?.name ?? niche.name}
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
