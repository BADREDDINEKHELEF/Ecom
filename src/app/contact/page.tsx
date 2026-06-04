'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin } from 'lucide-react'
import { useT } from '@/lib/store/langStore'

export default function ContactPage() {
  const t = useT()
  const c = t.contact

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t.cart.continueShopping}
      </Link>
      <h1 className="text-3xl font-black text-gray-900 mb-2">{t.footer.contactUs}</h1>
      <p className="text-gray-500 mb-10">{c.subtitle}</p>

      <div className="grid gap-4">
        <a
          href="https://wa.me/213555000000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-5 hover:bg-green-100 transition-colors"
        >
          <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">WhatsApp</p>
            <p className="text-sm text-gray-600">+213 555 000 000 · {c.whatsappDesc}</p>
          </div>
        </a>

        <a
          href="tel:+213555000000"
          className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-5 hover:bg-blue-100 transition-colors"
        >
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{t.footer.contactUs}</p>
            <p className="text-sm text-gray-600">+213 555 000 000 · {c.phoneHours}</p>
          </div>
        </a>

        <a
          href="mailto:support@casbahstore.dz"
          className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 hover:bg-indigo-100 transition-colors"
        >
          <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{c.emailLabel}</p>
            <p className="text-sm text-gray-600">support@casbahstore.dz</p>
          </div>
        </a>

        <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{t.footer.location}</p>
            <p className="text-sm text-gray-600">{c.locationName}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
