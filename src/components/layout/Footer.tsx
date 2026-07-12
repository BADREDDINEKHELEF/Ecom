'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, MapPin, CheckCircle, Loader2 } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useT } from '@/lib/store/langStore'

const WA_NUMBER = '213779528330' // +213 779 528 330 (WhatsApp format)

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0 text-green-400">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function Footer() {
  const t = useT()
  const [email, setEmail]       = useState('')
  const [subState, setSubState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setSubState('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) { setSubState('done'); setEmail('') }
      else setSubState('error')
    } catch {
      setSubState('error')
    }
  }

  const sellerLinks = [
    { label: 'Créer ma boutique', href: '/become-seller' },
    { label: 'Se connecter vendeur', href: '/seller/login' },
    { label: 'Tarifs & abonnements', href: '/pricing' },
    { label: 'Tableau de bord', href: '/seller/dashboard' },
  ]

  const serviceLinks = [
    { label: t.footer.trackOrder, href: '/track' },
    { label: t.footer.faq,        href: '/faq' },
    { label: t.footer.contactUs,  href: '/contact' },
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
              <a
                href={`https://wa.me/${WA_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Contacter sur WhatsApp (s'ouvre dans une nouvelle fenêtre)"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                {WA_SVG}
                <span>07 79 52 83 30</span>
                <span className="sr-only">(nouvelle fenêtre)</span>
              </a>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>07 79 52 83 30</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <a href="mailto:storedz321123@gmail.com" className="hover:text-white transition-colors">
                  storedz321123@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>{t.footer.location}</span>
              </div>
            </div>
          </div>

          {/* Vendeurs */}
          <div>
            <h3 className="text-white font-bold mb-4">Vendeurs</h3>
            <ul className="space-y-2.5 text-sm">
              {sellerLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white transition-colors">
                    {label}
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
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold" role="status" aria-live="polite">
                <CheckCircle className="w-4 h-4" aria-hidden="true" /> {t.footer.subscribeSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2" noValidate aria-label={t.footer.stayUpdated}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.footer.emailPlaceholder}
                  required
                  aria-label={t.footer.emailAriaLabel}
                  disabled={subState === 'loading'}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/30 disabled:opacity-60"
                />
                {subState === 'error' && (
                  <p className="text-red-400 text-xs" role="alert">{t.footer.subscribeError}</p>
                )}
                <button
                  type="submit"
                  disabled={subState === 'loading'}
                  className="bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-indigo-500/30 focus-visible:outline-none"
                >
                  {subState === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t.footer.subscribe}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} StoreDz · {t.footer.allRights}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">{t.footer.privacyPolicy}</Link>
            <Link href="/terms" className="hover:text-white transition-colors">{t.footer.termsOfService}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
