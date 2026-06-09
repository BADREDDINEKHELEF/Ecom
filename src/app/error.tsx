'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useT } from '@/lib/store/langStore'
import { logger } from '@/lib/logger'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()

  useEffect(() => {
    logger.error('App error', { error: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">{t.error.title}</h1>
      <p className="text-gray-500 mb-8 max-w-sm text-sm">{t.error.message}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> {t.error.tryAgain}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {t.error.backToHome}
        </Link>
      </div>
    </div>
  )
}
