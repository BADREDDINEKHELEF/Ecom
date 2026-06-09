import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — ShopDZ',
  description: 'Terms and conditions for using the ShopDZ marketplace.',
}

const LAST_UPDATED = 'June 2025'

export default function TermsPage() {
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
          <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of Terms</h2>
              <p>
                By accessing or using ShopDZ (&quot;the Platform&quot;), you agree to be bound by these Terms
                of Service. If you do not agree, you may not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">2. The Platform</h2>
              <p>
                ShopDZ is an online marketplace that connects buyers with independent sellers based in
                Algeria. ShopDZ itself is not the seller of the products listed — each product is sold
                by the individual seller whose store page it appears on.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">3. Buyer Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide accurate delivery information when placing an order</li>
                <li>Be available to receive your order and make payment on delivery (for COD orders)</li>
                <li>Contact the seller or ShopDZ support within 7 days of delivery for any issues</li>
                <li>Not attempt to defraud sellers through false returns or chargebacks</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">4. Seller Responsibilities</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Only list products that you are legally permitted to sell in Algeria</li>
                <li>Provide accurate product descriptions, images, and pricing</li>
                <li>Fulfil orders promptly and as described</li>
                <li>Not list counterfeit, prohibited, or dangerous goods</li>
                <li>Pay the agreed platform commission (10% of each sale) as per your seller agreement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">5. Prohibited Products</h2>
              <p>The following are strictly prohibited on ShopDZ:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Weapons, ammunition, or explosive materials</li>
                <li>Counterfeit goods or trademark-infringing products</li>
                <li>Controlled substances or medication requiring a prescription</li>
                <li>Adult or pornographic content</li>
                <li>Products that violate any Algerian law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">6. Returns & Refunds</h2>
              <p>
                Buyers may request a return within <strong>7 days</strong> of delivery for defective,
                damaged, or incorrectly described products. Sellers are responsible for arranging
                return logistics. ShopDZ may mediate disputes at its discretion.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">7. Liability Limitation</h2>
              <p>
                ShopDZ provides the Platform &quot;as is&quot; and does not warrant uninterrupted or
                error-free service. To the extent permitted by Algerian law, ShopDZ&apos;s liability for
                any claim arising from use of the Platform is limited to the value of the order in dispute.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">8. Intellectual Property</h2>
              <p>
                ShopDZ&apos;s brand, logo, and Platform design are the property of ShopDZ. Sellers retain
                ownership of their product content. By listing on ShopDZ, sellers grant ShopDZ a
                non-exclusive licence to display and promote their products on the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the People&apos;s Democratic Republic of Algeria.
                Any disputes will be resolved in the competent courts of Algiers.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">10. Changes to Terms</h2>
              <p>
                ShopDZ may update these Terms at any time. Continued use of the Platform after changes
                are posted constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-2">11. Contact</h2>
              <p>
                For questions about these Terms:{' '}
                <a href="mailto:legal@shopdz.dz" className="text-indigo-600 hover:underline">
                  legal@shopdz.dz
                </a>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
