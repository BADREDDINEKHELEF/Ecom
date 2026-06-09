'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/logger'

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error('[Admin] Page error', { error: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-500 mb-2 max-w-sm text-sm">An error occurred loading this admin page.</p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono mb-6">Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  )
}
