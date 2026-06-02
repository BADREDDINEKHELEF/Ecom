import Link from 'next/link'
import { Store, TrendingUp, Shield, Truck, DollarSign, Users, Package, BarChart3, ArrowRight, CheckCircle } from 'lucide-react'

const FEATURES = [
  { icon: Store, title: 'Your Own Storefront', desc: 'Get a dedicated store page at shopdz.dz/shop/your-store. Customize your brand and showcase your products.' },
  { icon: Truck, title: '58 Wilayas Coverage', desc: 'Reach customers across all of Algeria. We handle COD logistics so you can focus on selling.' },
  { icon: BarChart3, title: 'Sales Dashboard', desc: 'Track your orders, revenue, and top products in real time from your seller dashboard.' },
  { icon: Shield, title: 'Secure Payments', desc: 'COD collection handled seamlessly. Payouts to your account after successful delivery.' },
  { icon: DollarSign, title: 'Low Commission', desc: 'Only 10% commission per sale — keep 90% of your revenue. No monthly fees to start.' },
  { icon: Users, title: '200K+ Shoppers', desc: 'Instantly access ShopDZ\'s growing customer base across Algeria without building your own audience.' },
]

const STEPS = [
  { n: '1', title: 'Create your account', desc: 'Fill in your store details and register in under 5 minutes.' },
  { n: '2', title: 'List your products', desc: 'Add products with photos, prices, and descriptions from your dashboard.' },
  { n: '3', title: 'Start receiving orders', desc: 'Customers find your products and order. You get notified instantly.' },
  { n: '4', title: 'Get paid', desc: 'We collect COD and transfer your earnings after delivery confirmation.' },
]

export default function BecomeSellerPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Algeria&apos;s fastest-growing marketplace
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4">
            Sell to all of Algeria<br />from one platform
          </h1>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            Join 200+ sellers already growing their business on ShopDZ. List products, manage orders, and get paid — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/seller/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 font-black px-8 py-4 rounded-2xl hover:bg-emerald-50 transition-colors text-base">
              <Store className="w-5 h-5" /> Start Selling Free
            </Link>
            <Link href="/seller/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors text-base border border-white/20">
              Sign in to dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '200+', label: 'Active Sellers' },
            { value: '58', label: 'Wilayas Covered' },
            { value: '10%', label: 'Commission Rate' },
            { value: '0 DZD', label: 'Monthly Fee' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-black text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-gray-900 mb-3">Everything you need to sell online</h2>
          <p className="text-gray-500 max-w-xl mx-auto">We&apos;ve built the tools Algerian sellers actually need. No tech knowledge required.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">How it works</h2>
            <p className="text-gray-500">From registration to first sale in under 24 hours</p>
          </div>
          <div className="space-y-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex items-start gap-5 bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-lg">{n}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What you need */}
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-900 mb-3">What you need to get started</h2>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-sm space-y-4">
          {[
            'A valid email address',
            'Products to sell (photos + descriptions)',
            'Algerian phone number for order notifications',
            'That\'s it — no legal registration required to start',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-emerald-600 py-20 px-4 text-center text-white">
        <h2 className="text-3xl font-black mb-4">Ready to start selling?</h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">Join thousands of Algerian entrepreneurs building their business on ShopDZ.</p>
        <Link href="/seller/register"
          className="inline-flex items-center gap-2 bg-white text-emerald-700 font-black px-10 py-4 rounded-2xl hover:bg-emerald-50 transition-colors text-base">
          Create my store <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-white/60 text-sm mt-4">Free to start · 10% commission · No monthly fees</p>
      </div>

      {/* Footer nav */}
      <div className="py-6 px-4 text-center border-t border-gray-100">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          <Package className="inline w-4 h-4 mr-1" /> Back to ShopDZ
        </Link>
      </div>
    </div>
  )
}
