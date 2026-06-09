'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

export default function SellerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error('[Seller] Page error', { error: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Une erreur est survenue</h2>
      <p className="text-gray-500 mb-6 max-w-sm text-sm">
        Impossible de charger cette page. Réessayez ou retournez au tableau de bord.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Réessayer
        </button>
        <Link
          href="/seller/dashboard"
          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <Home className="w-4 h-4" /> Tableau de bord
        </Link>
      </div>
    </div>
  )
}
