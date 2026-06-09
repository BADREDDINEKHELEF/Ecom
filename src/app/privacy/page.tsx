import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — ShopDZ',
  description: 'How ShopDZ collects, uses and protects your personal data.',
}

const LAST_UPDATED = 'June 2025'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to ShopDZ
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Information We Collect</h2>
              <p>When you place an order on ShopDZ, we collect the following personal data:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Your full name and phone number (required to process and deliver your order)</li>
                <li>Your delivery address including wilaya and city</li>
                <li>Order details: product names, quantities, and amounts paid</li>
              </ul>
              <p className="mt-2">
                If you create a seller account, we additionally collect your email address and store information.
              </p>
              <p className="mt-2">
                We do <strong>not</strong> collect credit card numbers directly — online payments are
                processed by third-party gateways (Satim, BaridiMob) under their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Your Data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To fulfill and deliver your order</li>
                <li>To contact you about your order status (WhatsApp or phone call)</li>
                <li>To resolve disputes or process returns</li>
                <li>To improve our services and detect fraud</li>
                <li>To send you newsletters <em>only if you explicitly opted in</em></li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Data Sharing</h2>
              <p>We share your personal data only with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  <strong>Delivery partners</strong> (Yalidine, ZR Express, Procolis) —
                  only the information needed to arrange delivery (name, phone, address)
                </li>
                <li>
                  <strong>Sellers</strong> — sellers on ShopDZ see your name, phone number, wilaya,
                  and the items you ordered so they can prepare and ship your order
                </li>
                <li>
                  <strong>Payment processors</strong> — only when you choose an online payment method
                </li>
              </ul>
              <p className="mt-2">We do not sell your personal data to advertisers or data brokers.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data Retention</h2>
              <p>
                Order data is retained for 3 years to comply with Algerian commercial record-keeping
                requirements. Newsletter subscriptions are retained until you unsubscribe.
                You may request deletion of your data by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Security</h2>
              <p>
                We protect your data using industry-standard measures: HTTPS encryption in transit,
                AES-256-GCM encryption for sensitive stored credentials, and Row-Level Security on
                our database so each seller can only access their own customers&apos; data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Your Rights</h2>
              <p>Under Algerian law (Law 18-07) and general data protection principles, you have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Unsubscribe from marketing at any time</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@shopdz.dz" className="text-indigo-600 hover:underline">
                  privacy@shopdz.dz
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Cookies</h2>
              <p>
                ShopDZ uses only <strong>functional cookies</strong> — specifically an httpOnly session
                cookie for seller and admin authentication. We do not use advertising or tracking cookies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Contact</h2>
              <p>
                For privacy questions or data requests:{' '}
                <a href="mailto:privacy@shopdz.dz" className="text-indigo-600 hover:underline">
                  privacy@shopdz.dz
                </a>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
