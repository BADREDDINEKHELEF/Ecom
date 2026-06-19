'use client'

import { useState, useEffect } from 'react'
import { Save, Store, Truck, CreditCard, Loader2, CheckCircle, ExternalLink, Zap, Circle, Banknote, Megaphone } from 'lucide-react'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { getStoreSettings, saveStoreSettings, StoreSettings } from '@/lib/supabase/queries'
import { useT } from '@/lib/store/langStore'

const ANNOUNCEMENT_COLORS = ['amber', 'green', 'red', 'blue', 'indigo'] as const

const DEFAULTS: StoreSettings = {
  storeName: 'StoreDz',
  storeEmail: 'storedz321123@gmail.com',
  phone: '+213 555 000 000',
  whatsappNumber: '213555000000',
  freeShippingThreshold: 5000,
  zone1Cost: 350,
  zone2Cost: 450,
  zone3Cost: 600,
  zone4Cost: 850,
  cashOnDelivery: true,
  cardPayment: false,
  paymentCcp: '',
  paymentBaridimob: '',
  paymentNote: '',
  announcementText: '',
  announcementActive: false,
  announcementColor: 'amber',
}

export default function AdminSettingsPage() {
  const t = useT()
  const a = t.admin

  const [form, setForm] = useState<StoreSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStoreSettings()
      .then(setForm)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveStoreSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError(a.settingsError)
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof StoreSettings, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
        <Icon className="w-5 h-5 text-indigo-600" />
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )

  const Input = ({
    value,
    onChange,
    type = 'text',
    placeholder,
  }: {
    value: string | number
    onChange: (v: string) => void
    type?: string
    placeholder?: string
  }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
    />
  )

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        {a.loadingSettings}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">{a.settingsTitle}</h1>
        <p className="text-gray-500 text-sm mt-1">{a.settingsSubtitle}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Store Info */}
        <Section icon={Store} title={a.storeInfoTitle}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={a.storeNameLabel}>
              <Input value={form.storeName} onChange={(v) => set('storeName', v)} />
            </Field>
            <Field label={a.storeEmailLabel}>
              <Input value={form.storeEmail} onChange={(v) => set('storeEmail', v)} type="email" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={a.phoneLabel} hint={a.phoneHint}>
              <Input value={form.phone} onChange={(v) => set('phone', v)} placeholder="+213 5XX XX XX XX" />
            </Field>
            <Field label={a.whatsappLabel} hint={a.whatsappHint}>
              <Input value={form.whatsappNumber} onChange={(v) => set('whatsappNumber', v)} placeholder="213XXXXXXXXX" />
            </Field>
          </div>
        </Section>

        {/* Delivery */}
        <Section icon={Truck} title={a.deliveryShippingTitle}>
          <Field label={a.freeShippingFromLabel} hint={a.freeShippingHint}>
            <Input value={form.freeShippingThreshold} onChange={(v) => set('freeShippingThreshold', Number(v))} type="number" />
          </Field>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">{a.shippingByZone}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { key: 'zone1Cost', label: 'Zone 1', hint: 'Alger region' },
                { key: 'zone2Cost', label: 'Zone 2', hint: 'Northern cities' },
                { key: 'zone3Cost', label: 'Zone 3', hint: 'Centre/interior' },
                { key: 'zone4Cost', label: 'Zone 4', hint: 'South/remote' },
              ] as const).map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Payment */}
        <Section icon={CreditCard} title={a.paymentMethodsTitle}>
          <Toggle value={form.cashOnDelivery} onChange={(v) => set('cashOnDelivery', v)} label={t.checkout.cash} />
          <Toggle value={form.cardPayment} onChange={(v) => set('cardPayment', v)} label={t.checkout.card} />
        </Section>

        {/* Payment Accounts */}
        <Section icon={Banknote} title={a.paymentAccountsTitle}>
          <Field label={a.ccpLabel} hint={a.ccpHint}>
            <Input value={form.paymentCcp} onChange={(v) => set('paymentCcp', v)} placeholder="Ex: 00012345678 CC" />
          </Field>
          <Field label={a.baridimobLabel} hint={a.baridimobHint}>
            <Input value={form.paymentBaridimob} onChange={(v) => set('paymentBaridimob', v)} placeholder="Ex: 00799999000123456789" />
          </Field>
          <Field label={a.paymentInstructionsLabel} hint={a.paymentInstructionsHint}>
            <textarea
              value={form.paymentNote}
              onChange={(e) => set('paymentNote', e.target.value)}
              placeholder="Ex: Au nom de StoreDz SARL — inclure votre ID boutique en référence"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 transition-colors resize-none"
            />
          </Field>
        </Section>

        {/* Announcement Banner */}
        <Section icon={Megaphone} title={a.announcementBannerTitle}>
          <Toggle
            value={form.announcementActive}
            onChange={(v) => set('announcementActive', v)}
            label={a.showBanner}
          />
          <Field label={a.announcement}>
            <Input
              value={form.announcementText}
              onChange={(v) => set('announcementText', v)}
              placeholder={a.announcementPlaceholder}
            />
          </Field>
          <Field label={a.announcementColor}>
            <div className="flex gap-2">
              {ANNOUNCEMENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('announcementColor', color)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border-2 transition-colors ${
                    form.announcementColor === color ? 'border-indigo-500' : 'border-transparent'
                  } ${
                    color === 'amber'  ? 'bg-amber-400 text-amber-950' :
                    color === 'green'  ? 'bg-emerald-500 text-white' :
                    color === 'red'    ? 'bg-red-500 text-white' :
                    color === 'blue'   ? 'bg-blue-500 text-white' :
                    'bg-indigo-600 text-white'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all ${
            saved ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
          } disabled:opacity-60`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? a.savingSettingsBtn : saved ? a.savedSettingsBtn : a.saveSettingsBtn}
        </button>
      </form>

      {/* Delivery Integrations */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-gray-900">{a.deliveryIntegrations}</h2>
        </div>

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
          <EnvVar name="YALIDINE_API_ID" description={a.apiId} />
          <EnvVar name="YALIDINE_API_TOKEN" description={a.apiToken} />
          <p className="text-xs text-orange-700 mt-3 bg-orange-100 px-3 py-2 rounded-lg">
            Set these in Vercel → Settings → Environment Variables, then redeploy.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {DELIVERY_PROVIDERS.filter((p) => p.id !== 'yalidine').map((provider) => (
            <div key={provider.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                <p className="text-xs text-gray-400">{a.manualTracking}</p>
              </div>
              <a href={provider.dashboardUrl} target="_blank" rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-700 flex-shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EnvVar({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-2.5 mt-2">
      <Circle className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />
      <div>
        <code className="text-xs font-mono font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">{name}</code>
        <p className="text-xs text-orange-700 mt-0.5">{description}</p>
      </div>
    </div>
  )
}
