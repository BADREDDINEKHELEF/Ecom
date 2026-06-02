'use client'

import { useState } from 'react'
import { Save, Store, Truck, CreditCard, Bell } from 'lucide-react'

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    storeName: 'ShopDZ',
    storeEmail: 'support@shopdz.dz',
    phone: '+213 555 000 000',
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
        <p className="text-gray-500 text-sm mt-1">Configure your store preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Section icon={Store} title="Store Information">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Store Name"><Input field="storeName" /></Field>
            <Field label="Support Email"><Input field="storeEmail" type="email" /></Field>
          </div>
          <Field label="Phone Number"><Input field="phone" /></Field>
        </Section>

        <Section icon={Truck} title="Shipping">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Shipping Cost (DZD)"><Input field="shippingCost" type="number" /></Field>
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
    </div>
  )
}
