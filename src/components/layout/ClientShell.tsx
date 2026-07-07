'use client'

import dynamic from 'next/dynamic'
import HideOnStore from './HideOnStore'

// Lazy-load heavy client-only shell components so the root layout stays small.
const CartSidebar = dynamic(() => import('@/components/shop/CartSidebar'), { ssr: false })
const Toaster = dynamic(() => import('@/components/ui/Toast'), { ssr: false })
const ScrollToTop = dynamic(() => import('@/components/ui/ScrollToTop'), { ssr: false })
const BottomNav = dynamic(() => import('@/components/layout/BottomNav'), { ssr: false })
const Footer = dynamic(() => import('@/components/layout/Footer'), { ssr: false })
const PageViewTracker = dynamic(() => import('@/components/analytics/PageViewTracker'), { ssr: false })
const PixelLoadingBar = dynamic(() => import('@/components/effects/PixelLoadingBar'), { ssr: false })
const NavigationEvents = dynamic(() => import('@/components/effects/NavigationEvents'), { ssr: false })

export default function ClientShell() {
  return (
    <>
      <CartSidebar />
      <Toaster />
      <HideOnStore>
        <Footer />
      </HideOnStore>
      <ScrollToTop />
      <BottomNav />
      <PageViewTracker />
      <PixelLoadingBar />
      <NavigationEvents />
    </>
  )
}
