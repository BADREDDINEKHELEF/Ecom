'use client'

import { useState } from 'react'
import { Save, Store, Truck, CreditCard, Bell, Zap, ExternalLink, CheckCircle, Circle } from 'lucide-react'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? 'Casbah Store',
    storeEmail: 'support@shopdz.dz',
    phone: '+213 555 000 000',
    whatsappNumber: '',
    freeShippingThreshold: '5000',
    shippingCost: '500',
    cashOnDelivery: true,
    cardPayment: true,
    orderNotifications: true,
    lowStockAlert: true,
    lowStockThreshold: '10',
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )

  const Input = ({ field, type = 'text', placeholder }: { field: keyof typeof form; type?: string; placeholder?: string }) => (
    <input
      type={type}
      value={form[field] as string}
      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
    />
  )

  const Toggle = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => setForm({ ...form, [field]: !form[field] })}
        className={`relative w-11 h-6 rounded-full transition-colors ${form[field] ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your store preferences and integrations</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Section icon={Store} title="Store Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Store Name"><Input field="storeName" /></Field>
            <Field label="Support Email"><Input field="storeEmail" type="email" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone Number"><Input field="phone" /></Field>
            <Field label="WhatsApp Number (for notifications)">
              <Input field="whatsappNumber" placeholder="213XXXXXXXXX" />
            </Field>
          </div>
        </Section>

        <Section icon={Truck} title="Shipping">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Default Shipping Cost (DZD)"><Input field="shippingCost" type="number" /></Field>
            <Field label="Free Shipping From (DZD)"><Input field="freeShippingThreshold" type="number" /></Field>
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">
            Orders above the threshold qualify for free shipping automatically.
          </p>
        </Section>

        <Section icon={CreditCard} title="Payment Methods">
          <Toggle field="cashOnDelivery" label="Cash on Delivery" />
          <Toggle field="cardPayment" label="Credit / Debit Card" />
        </Section>

        <Section icon={Bell} title="Notifications">
          <Toggle field="orderNotifications" label="New order email notifications" />
          <Toggle field="lowStockAlert" label="Low stock alerts" />
          {form.lowStockAlert && (
            <Field label="Low Stock Threshold (units)">
              <Input field="lowStockThreshold" type="number" />
            </Field>
          )}
        </Section>

        <button
          type="submit"
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all ${
            saved ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </form>

      {/* Integrations — read-only config guide */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-gray-900">Delivery Integrations</h2>
        </div>

        <p className="text-sm text-gray-500">
          Configure delivery providers via environment variables on your hosting platform (Vercel, Railway, etc.).
          All providers support manual tracking entry. Yalidine also supports auto-shipment creation via API.
        </p>

        {/* Yalidine */}
        <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="font-bold text-gray-900">Yalidine</span>
              <span className="text-xs text-orange-600 font-semibold px-2 py-0.5 rounded-full bg-orange-100">API Auto-Create</span>
            </div>
            <a href="https://yalidine.app" target="_blank" rel="noopener noreferrer"
              className="text-xs text-orange-600 hover:underline flex items-center gap-1">
              Website <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="space-y-2">
            <EnvVar name="YALIDINE_API_ID" description="Your Yalidine API ID (from account settings)" />
            <EnvVar name="YALIDINE_API_TOKEN" description="Your Yalidine API token" />
          </div>
          <p className="text-xs text-orange-700 mt-3 bg-orange-100 px-3 py-2 rounded-lg">
            Once set, the Ship modal will offer to auto-create parcels and fetch tracking numbers directly from Yalidine.
          </p>
        </div>

        {/* Other providers */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Other Providers (Manual Tracking)</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {DELIVERY_PROVIDERS.filter((p) => p.id !== 'yalidine').map((provider) => (
              <div key={provider.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                  <p className="text-xs text-gray-400 truncate">Manual tracking entry</p>
                </div>
                <a href={provider.dashboardUrl} target="_blank" rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Create shipments on each provider&apos;s dashboard, then paste the tracking number when shipping an order in the Orders page.
          </p>
        </div>
      </div>
    </div>
  )
}

function EnvVar({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Circle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
      <div>
        <code className="text-xs font-mono font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">{name}</code>
        <p className="text-xs text-orange-700 mt-0.5">{description}</p>
      </div>
    </div>
  )
}
