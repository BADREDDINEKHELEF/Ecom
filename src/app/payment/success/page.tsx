'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, Home, Package } from 'lucide-react'

function SuccessContent() {
  const params = useSearchParams()
  const orderId = params.get('orderId')

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-3">Paiement réussi !</h1>
      <p className="text-gray-500 mb-2">Votre paiement a été confirmé et votre commande est en cours de traitement.</p>
      {orderId && (
        <p className="text-sm text-gray-400 mb-8">Référence : <span className="font-mono font-bold text-gray-600">{orderId.slice(0, 8).toUpperCase()}</span></p>
      )}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Paiement confirmé</p>
        <p className="flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500 flex-shrink-0" /> Votre commande sera préparée sous 24h</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <Link href="/orders" className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            <Package className="w-4 h-4" /> Mes commandes
          </Link>
        )}
        <Link href="/" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
          <Home className="w-4 h-4" /> Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
