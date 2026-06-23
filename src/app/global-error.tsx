'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Erreur — StoreDz</title>
      </head>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Une erreur est survenue</h2>
          <p className="text-gray-500 text-sm mb-6">Nous avons été informés et allons corriger ça rapidement.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
