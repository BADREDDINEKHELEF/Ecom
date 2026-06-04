'use client'

import { useT } from '@/lib/store/langStore'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function FAQPage() {
  const t = useT()
  const f = t.faq
  const [open, setOpen] = useState<number | null>(null)

  const items = [
    { q: f.q1, a: f.a1 },
    { q: f.q2, a: f.a2 },
    { q: f.q3, a: f.a3 },
    { q: f.q4, a: f.a4 },
    { q: f.q5, a: f.a5 },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t.cart.continueShopping}
      </Link>
      <h1 className="text-3xl font-black text-gray-900 mb-2">{f.title}</h1>
      <p className="text-gray-500 mb-8">{f.subtitle}</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span>{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-3 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && (
              <div className="px-5 pb-4 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
