import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CartSidebar from '@/components/shop/CartSidebar'
import Toaster from '@/components/ui/Toast'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import RTLWrapper from '@/components/layout/RTLWrapper'
import LocaleBanner from '@/components/ui/LocaleBanner'
import MobileCartBar from '@/components/layout/MobileCartBar'
import ExitIntentPopup from '@/components/ui/ExitIntentPopup'
import SocialProofTicker from '@/components/ui/SocialProofTicker'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Casbah Store — متجر الجزائر الأول', template: '%s | Casbah Store' },
  description: 'تسوق إكسسوارات السيارات، مستلزمات الحيوانات، ومنتجات الأطفال. توصيل لجميع ولايات الجزائر.',
  keywords: ['algerie', 'algérie', 'الجزائر', 'shopping', 'livraison', 'cars', 'kids', 'animals'],
  openGraph: {
    siteName: 'Casbah Store',
    locale: 'fr_DZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${cairo.variable}`}>
      <body>
        <RTLWrapper>
          <Header />
          <CartSidebar />
          <Toaster />
          <WhatsAppButton />
          <LocaleBanner />
          <main>{children}</main>
          <MobileCartBar />
          <ExitIntentPopup />
          <SocialProofTicker />
          <Footer />
        </RTLWrapper>
      </body>
    </html>
  )
}
