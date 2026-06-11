import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AnnouncementBanner from '@/components/ui/AnnouncementBanner'
import CartSidebar from '@/components/shop/CartSidebar'
import Toaster from '@/components/ui/Toast'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import RTLWrapper from '@/components/layout/RTLWrapper'
import LocaleBanner from '@/components/ui/LocaleBanner'
import MobileCartBar from '@/components/layout/MobileCartBar'
import ExitIntentPopup from '@/components/ui/ExitIntentPopup'
import SocialProofTicker from '@/components/ui/SocialProofTicker'
import CompareBar from '@/components/shop/CompareBar'
import ScrollToTop from '@/components/ui/ScrollToTop'
import HideOnStore from '@/components/layout/HideOnStore'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'ShopDZ — Ouvrez votre boutique en ligne', template: '%s | ShopDZ' },
  description: 'Créez votre boutique en ligne en Algérie. Livraison vers les 58 wilayas. 0% de commission.',
  keywords: ['algerie', 'algérie', 'الجزائر', 'boutique en ligne', 'vendeur', 'e-commerce'],
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'ShopDZ',
    locale: 'fr_DZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${cairo.variable}`}>
      <head>
        <meta name="theme-color" content="#4f46e5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{ __html: `
          try{const t=JSON.parse(localStorage.getItem('theme-preference')||'{}').state?.theme;if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}
          if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}
        `}} />
      </head>
      <body>
        <RTLWrapper>
          <HideOnStore><AnnouncementBanner /></HideOnStore>
          <HideOnStore><Header /></HideOnStore>
          <HideOnStore><LocaleBanner /></HideOnStore>
          <CartSidebar />
          <Toaster />
          <WhatsAppButton />
          <main>{children}</main>
          <HideOnStore><MobileCartBar /></HideOnStore>
          <HideOnStore><ExitIntentPopup /></HideOnStore>
          <HideOnStore><SocialProofTicker /></HideOnStore>
          <HideOnStore><CompareBar /></HideOnStore>
          <ScrollToTop />
          <HideOnStore><Footer /></HideOnStore>
        </RTLWrapper>
      </body>
    </html>
  )
}
