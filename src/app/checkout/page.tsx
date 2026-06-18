'use client'

import dynamic from 'next/dynamic'

const CheckoutContent = dynamic(() => import('./CheckoutContent'), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function CheckoutPage() {
  return <CheckoutContent />
}
