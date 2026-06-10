'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check, Eye, EyeOff, Truck, Bell, Zap, Info, Menu } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'

export default function DeliverySettingsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [form, setForm] = useState({
    default_provider:     'yalidine',
    yalidine_api_id:      '',
    yalidine_api_token:   '',
    procolis_token:       '',
    zr_token:             '',
    auto_create_shipment: false,
    notify_whatsapp:      true,
    notify_sms:           false,
  })
  const [showToken, setShowToken]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  useEffect(() => {
    if (!vendor) return
    fetch('/api/seller/delivery-config')
      .then((r) => r.json())
      .then(({ config: cfg }) => {
        if (cfg) {
          setForm({
            default_provider:     cfg.default_provider,
            yalidine_api_id:      cfg.yalidine_api_id ?? '',
            yalidine_api_token:   cfg.yalidine_api_token ?? '',
            procolis_token:       cfg.procolis_token ?? '',
            zr_token:             cfg.zr_token ?? '',
            auto_create_shipment: cfg.auto_create_shipment,
            notify_whatsapp:      cfg.notify_whatsapp,
            notify_sms:           cfg.notify_sms,
          })
        }
        setLoadingConfig(false)
      })
      .catch(() => setLoadingConfig(false))
  }, [vendor])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/seller/delivery-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_provider:     form.default_provider,
          yalidine_api_id:      form.yalidine_api_id || null,
          yalidine_api_token:   form.yalidine_api_token || null,
          procolis_token:       form.procolis_token || null,
          zr_token:             form.zr_token || null,
          auto_create_shipment: form.auto_create_shipment,
          notify_whatsapp:      form.notify_whatsapp,
          notify_sms:           form.notify_sms,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Sauvegarde échouée')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sauvegarde échouée')
    } finally {
      setSaving(false)
    }
  }

  const testYalidineCredentials = async () => {
    if (!form.yalidine_api_id || !form.yalidine_api_token) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/seller/test-yalidine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiId: form.yalidine_api_id,
          apiToken: form.yalidine_api_token,
        }),
      })
      setTestResult(res.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> Paramètres de livraison
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configurez vos transporteurs et créez vos expéditions automatiquement.</p>
        </div>

        {loadingConfig ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">

            {/* Default provider */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">Transporteur par défaut</h2>
              <p className="text-sm text-gray-500 mb-4">Pré-sélectionné lors de la création d&apos;une expédition.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {DELIVERY_PROVIDERS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setForm({ ...form, default_provider: p.id })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      form.default_provider === p.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Yalidine API */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" /> Intégration Yalidine API
                </h2>
                <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">Optionnel</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Créez vos expéditions Yalidine automatiquement depuis ShopDZ. Obtenez vos identifiants API sur{' '}
                <a href="https://yalidine.app" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">yalidine.app</a>.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    API ID <span className="text-gray-400 font-normal">(identifiant publique)</span>
                  </label>
                  <input type="text" value={form.yalidine_api_id}
                    onChange={(e) => setForm({ ...form, yalidine_api_id: e.target.value })}
                    placeholder="ex: 12345"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    API Token <span className="text-gray-400 font-normal">(clé secrète — chiffrée)</span>
                  </label>
                  <div className="relative">
                    <input type={showToken ? 'text' : 'password'} value={form.yalidine_api_token}
                      onChange={(e) => setForm({ ...form, yalidine_api_token: e.target.value })}
                      placeholder="••••••••••••••••••••"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                    <button type="button" onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Votre token est chiffré (AES-256) avant stockage. ShopDZ ne le lit jamais en clair.
                  </p>
                </div>

                {/* Test connection */}
                {form.yalidine_api_id && form.yalidine_api_token && (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={testYalidineCredentials} disabled={testing}
                      className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-60">
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Tester la connexion
                    </button>
                    {testResult === 'ok' && (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                        <Check className="w-4 h-4" /> Connexion réussie
                      </span>
                    )}
                    {testResult === 'fail' && (
                      <span className="text-sm font-semibold text-red-500">Identifiants invalides</span>
                    )}
                  </div>
                )}

                {/* Auto-create toggle */}
                <label className="flex items-start gap-3 cursor-pointer bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <div className="mt-0.5">
                    <input type="checkbox" checked={form.auto_create_shipment}
                      onChange={(e) => setForm({ ...form, auto_create_shipment: e.target.checked })}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Créer les expéditions automatiquement</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Dès qu&apos;une commande est confirmée, une expédition Yalidine est créée automatiquement.
                      Un numéro de suivi vous est attribué instantanément.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Procolis API */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Intégration Procolis API
                </h2>
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Optionnel</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Créez vos expéditions Procolis automatiquement. Obtenez votre token API sur{' '}
                <a href="https://procolis.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">procolis.com</a>.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Token API Procolis</label>
                <input type="password" value={form.procolis_token}
                  onChange={(e) => setForm({ ...form, procolis_token: e.target.value })}
                  placeholder="••••••••••••••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Chiffré (AES-256) avant stockage.
                </p>
              </div>
            </div>

            {/* ZR Express API */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" /> Intégration ZR Express API
                </h2>
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">Optionnel</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Créez vos expéditions ZR Express automatiquement. Obtenez votre token sur{' '}
                <a href="https://zrexpress.dz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">zrexpress.dz</a>.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Token API ZR Express</label>
                <input type="password" value={form.zr_token}
                  onChange={(e) => setForm({ ...form, zr_token: e.target.value })}
                  placeholder="••••••••••••••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Chiffré (AES-256) avant stockage.
                </p>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                <Bell className="w-5 h-5 text-blue-500" /> Notifications acheteur
              </h2>
              <p className="text-sm text-gray-500 mb-4">Comment notifier vos clients lors des mises à jour de livraison.</p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notify_whatsapp}
                    onChange={(e) => setForm({ ...form, notify_whatsapp: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500">Confirmation de commande + numéro de suivi via WhatsApp</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notify_sms}
                    onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">SMS</p>
                    <p className="text-xs text-gray-500">Notification SMS en plus du WhatsApp (coût supplémentaire)</p>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {saved ? 'Sauvegardé !' : 'Enregistrer'}
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  )
}
