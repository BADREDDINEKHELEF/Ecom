'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useT } from '@/lib/store/langStore'

export default function NotFound() {
  const t = useT()

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl mb-4">🔍</p>
      <h1 className="text-4xl font-black text-gray-900 mb-2">404</h1>
      <p className="text-gray-500 mb-8 max-w-sm">
        {t.common.noProducts}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t.common.back}
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          {t.search.title}
        </Link>
      </div>
    </div>
  )
}
