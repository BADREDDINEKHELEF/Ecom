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
  title: { default: 'StoreDz — Ouvrez votre boutique en ligne', template: '%s | StoreDz' },
  description: 'Créez votre boutique en ligne en Algérie. Livraison vers les 58 wilayas. 0% de commission.',
  keywords: ['algerie', 'algérie', 'الجزائر', 'boutique en ligne', 'vendeur', 'e-commerce'],
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'StoreDz',
    locale: 'fr_DZ',
    type: 'website',
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
