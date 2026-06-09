'use client'

import { useState } from 'react'
import Link from 'next/link'
import { niches } from '@/lib/data/niches'
import { Mail, Phone, MapPin, CheckCircle, Loader2 } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useT } from '@/lib/store/langStore'

type NicheKey = 'cars' | 'animals' | 'kids' | 'deco'

export default function Footer() {
  const t = useT()
  const [email, setEmail]         = useState('')
  const [subState, setSubState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setSubState('loading')
    try {
      // Store in Supabase — table can be created later; graceful fail here
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubState(res.ok ? 'done' : 'error')
    } catch {
      setSubState('error')
    }
  }

  const serviceLinks = [
    { label: t.footer.trackOrder,    href: '/orders' },
    { label: t.footer.returnsRefunds, href: '/faq' },
    { label: t.footer.shippingInfo,  href: '/faq' },
    { label: t.footer.faq,           href: '/faq' },
    { label: t.footer.contactUs,     href: '/contact' },
  ]

  return (
    <footer className="bg-gray-950 text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Logo size="sm" dark />
            <p className="text-sm leading-relaxed">{t.footer.tagline}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>+213 555 000 000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>support@casbahstore.dz</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>{t.footer.location}</span>
              </div>
            </div>
          </div>

          {/* Niches */}
          <div>
            <h3 className="text-white font-bold mb-4">{t.footer.shopByNiche}</h3>
            <ul className="space-y-2.5 text-sm">
              {niches.map((niche) => (
                <li key={niche.id}>
                  <Link
                    href={`/${niche.id}`}
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span>{niche.emoji}</span>
                    {t.niches[niche.id as NicheKey]?.name ?? niche.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer service */}
          <div>
            <h3 className="text-white font-bold mb-4">{t.footer.customerService}</h3>
            <ul className="space-y-2.5 text-sm">
              {serviceLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-bold mb-4">{t.footer.stayUpdated}</h3>
            <p className="text-sm mb-4">{t.footer.newsletter}</p>
            {subState === 'done' ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <CheckCircle className="w-4 h-4" /> Inscrit avec succès !
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2" noValidate>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.footer.emailPlaceholder}
                  required
                  aria-label="Adresse email newsletter"
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                {subState === 'error' && (
                  <p className="text-red-400 text-xs">Erreur. Réessayez.</p>
                )}
                <button
                  type="submit"
                  disabled={subState === 'loading'}
                  className="bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {subState === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t.footer.subscribe}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>{t.footer.allRights}</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-white transition-colors">{t.footer.privacyPolicy}</Link>
            <Link href="#" className="hover:text-white transition-colors">{t.footer.termsOfService}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
