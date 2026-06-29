import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import CartSidebar from '@/components/shop/CartSidebar'
import Toaster from '@/components/ui/Toast'
import RTLWrapper from '@/components/layout/RTLWrapper'
import ScrollToTop from '@/components/ui/ScrollToTop'
import HideOnStore from '@/components/layout/HideOnStore'
import BottomNav from '@/components/layout/BottomNav'
import AnalyticsScripts from '@/components/analytics/AnalyticsScripts'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import PixelLoadingBar from '@/components/effects/PixelLoadingBar'
import NavigationEvents from '@/components/effects/NavigationEvents'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net'),
  title: { default: 'StoreDz — Ouvrez votre boutique en ligne', template: '%s | StoreDz' },
  description: 'Créez votre boutique en ligne en Algérie. Livraison vers les 58 wilayas. 0% de commission.',
  keywords: ['algerie', 'algérie', 'الجزائر', 'boutique en ligne', 'vendeur', 'e-commerce'],
  manifest: '/manifest.json',
  alternates: {
    languages: {
      'fr-DZ': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net',
      'ar-DZ': `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net'}?lang=ar`,
    },
  },
  openGraph: {
    siteName: 'StoreDz',
    locale: 'fr_DZ',
    type: 'website',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecom-dz.net',
    title: 'StoreDz — Ouvrez votre boutique en ligne',
    description: 'Créez votre boutique en ligne en Algérie. Livraison vers les 58 wilayas. 0% de commission.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'StoreDz' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@StoreDz',
    title: 'StoreDz — Ouvrez votre boutique en ligne',
    description: 'Créez votre boutique en ligne en Algérie. Livraison vers les 58 wilayas. 0% de commission.',
    images: ['/og-default.png'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // never 1 — blocks accessibility zoom
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${cairo.variable}`}>
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
        <AnalyticsScripts />
        <script dangerouslySetInnerHTML={{ __html: `
          try{const t=JSON.parse(localStorage.getItem('theme-preference')||'{}').state?.theme;if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}
          if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
        `}} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                '@id': 'https://ecom-dz.net/#organization',
                name: 'StoreDz',
                url: 'https://ecom-dz.net',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://ecom-dz.net/logo.png',
                },
                contactPoint: [
                  {
                    '@type': 'ContactPoint',
                    telephone: '+213-XXX-XXX-XXX',
                    contactType: 'customer service',
                    email: 'support@ecom-dz.net',
                    areaServed: 'DZ',
                    availableLanguage: ['French', 'Arabic'],
                  },
                ],
                sameAs: [
                  'https://www.facebook.com/StoreDz',
                  'https://www.instagram.com/StoreDz',
                  'https://twitter.com/StoreDz',
                ],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                '@id': 'https://ecom-dz.net/#website',
                url: 'https://ecom-dz.net',
                name: 'StoreDz',
                publisher: { '@id': 'https://ecom-dz.net/#organization' },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://ecom-dz.net/search?q={search_term_string}',
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
            ]),
          }}
        />
      </head>
      <body>
        <RTLWrapper>
          <CartSidebar />
          <Toaster />
          <HideOnStore><Header /></HideOnStore>
          <main className="pb-16 md:pb-0">{children}</main>
          <ScrollToTop />
          <HideOnStore><Footer /></HideOnStore>
          <BottomNav />
          <PageViewTracker />
          <PixelLoadingBar />
          <NavigationEvents />
        </RTLWrapper>
      </body>
    </html>
  )
}
