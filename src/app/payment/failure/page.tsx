'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { XCircle, RefreshCw, ShoppingCart } from 'lucide-react'

function FailureContent() {
  const params = useSearchParams()
  const reason = params.get('reason')

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-3">Paiement échoué</h1>
      <p className="text-gray-500 mb-8">
        {reason === 'missing_order'
          ? 'La commande est introuvable. Veuillez recommencer.'
          : 'Votre paiement n\'a pas pu être traité. Aucun montant n\'a été débité.'}
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800 text-left">
        <p className="font-bold mb-1">Que faire maintenant ?</p>
        <ul className="space-y-1 list-disc list-inside text-amber-700">
          <li>Vérifiez les informations de votre carte</li>
          <li>Assurez-vous d&apos;avoir suffisamment de solde</li>
          <li>Essayez une autre méthode de paiement</li>
          <li>Vous pouvez passer une commande avec paiement à la livraison</li>
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/checkout" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Réessayer
        </Link>
        <Link href="/cart" className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
          <ShoppingCart className="w-4 h-4" /> Mon panier
        </Link>
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <FailureContent />
    </Suspense>
  )
}
