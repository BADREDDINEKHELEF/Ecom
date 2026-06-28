'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, Eye, EyeOff, Truck, Bell, Zap, Info, Menu, ExternalLink } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { useT, useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'

export default function DeliverySettingsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const t = useT()
  const a = t.admin
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [form, setForm] = useState({
    default_provider:     'yalidine',
    yalidine_api_id:      '',
    yalidine_api_token:   '',
    procolis_token:       '',
    zr_token:             '',
    maystro_token:        '',
    colivraison_token:    '',
    rex_token:            '',
    yassir_api_key:       '',
    ecom_api_key:         '',
    ecom_api_token:        '',
    apec_api_id:          '',
    apec_api_token:       '',
    auto_create_shipment: false,
    notify_whatsapp:      true,
    notify_sms:           false,
  })
  const [showToken, setShowToken]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [testing, setTesting]         = useState(false)
  const [testResult, setTestResult]   = useState<'ok' | 'fail' | 'unsaved' | null>(null)
  const [testingApec, setTestingApec] = useState(false)
  const [testResultApec, setTestResultApec] = useState<'ok' | 'fail' | 'unsaved' | null>(null)
  const [savedConfig, setSavedConfig] = useState<Record<string, unknown> | null>(null)

  const loadConfig = useCallback(() => {
    if (!vendor) return
    setLoadingConfig(true)
    fetch('/api/seller/delivery-config')
      .then((r) => r.json())
      .then(({ config: cfg }) => {
        if (cfg) {
          setForm({
            default_provider:     cfg.default_provider ?? 'yalidine',
            yalidine_api_id:      cfg.yalidine_api_id ?? '',
            yalidine_api_token:   cfg.yalidine_api_token ?? '',
            procolis_token:       cfg.procolis_token ?? '',
            zr_token:             cfg.zr_token ?? '',
            maystro_token:        cfg.maystro_token ?? '',
            colivraison_token:    cfg.colivraison_token ?? '',
            rex_token:            cfg.rex_token ?? '',
            yassir_api_key:       cfg.yassir_api_key ?? '',
            ecom_api_key:         cfg.ecom_api_key ?? '',
            ecom_api_token:        cfg.ecom_api_token ?? '',
            apec_api_id:          cfg.apec_api_id ?? '',
            apec_api_token:       cfg.apec_api_token ?? '',
            auto_create_shipment: cfg.auto_create_shipment ?? false,
            notify_whatsapp:      cfg.notify_whatsapp ?? true,
            notify_sms:           cfg.notify_sms ?? false,
          })
          setSavedConfig(cfg)
        }
        setLoadingConfig(false)
      })
      .catch((err) => { console.error('[seller/delivery] config load failed:', err instanceof Error ? err.message : String(err)); setLoadingConfig(false) })
  }, [vendor])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

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
          maystro_token:        form.maystro_token || null,
          colivraison_token:    form.colivraison_token || null,
          rex_token:            form.rex_token || null,
          yassir_api_key:       form.yassir_api_key || null,
          ecom_api_key:         form.ecom_api_key || null,
          ecom_api_token:        form.ecom_api_token || null,
          apec_api_id:          form.apec_api_id || null,
          apec_api_token:       form.apec_api_token || null,
          auto_create_shipment: form.auto_create_shipment,
          notify_whatsapp:      form.notify_whatsapp,
          notify_sms:           form.notify_sms,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? a.savedBtn)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      loadConfig()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : a.savedBtn)
    } finally {
      setSaving(false)
    }
  }

  const testYalidineCredentials = async () => {
    if (!form.yalidine_api_id || !form.yalidine_api_token) return
    const unsaved = savedConfig && (
      form.yalidine_api_id !== (savedConfig.yalidine_api_id ?? '') ||
      form.yalidine_api_token !== (savedConfig.yalidine_api_token ?? '')
    )
    if (unsaved) {
      setTestResult('unsaved')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/seller/test-yalidine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setTestResult(data.ok ? 'ok' : 'fail')
    } catch {
      setTestResult('fail')
    } finally {
      setTesting(false)
    }
  }

  const testApecCredentials = async () => {
    if (!form.apec_api_id || !form.apec_api_token) return
    const unsaved = savedConfig && (
      form.apec_api_id !== (savedConfig.apec_api_id ?? '') ||
      form.apec_api_token !== (savedConfig.apec_api_token ?? '')
    )
    if (unsaved) {
      setTestResultApec('unsaved')
      return
    }
    setTestingApec(true)
    setTestResultApec(null)
    try {
      const res = await fetch('/api/seller/test-apec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setTestResultApec(data.ok ? 'ok' : 'fail')
    } catch {
      setTestResultApec('fail')
    } finally {
      setTestingApec(false)
    }
  }

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const encNote = (
    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
      <Info className="w-3 h-3" /> {a.encryptedNote}
    </p>
  )

  const autoShipmentCheckbox = (
    <label className="flex items-start gap-3 cursor-pointer bg-emerald-50 rounded-xl p-4 border border-emerald-100 mt-4">
      <input type="checkbox" checked={form.auto_create_shipment}
        onChange={(e) => setForm({ ...form, auto_create_shipment: e.target.checked })}
        className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
      <div>
        <p className="text-sm font-bold text-gray-900">{a.autoShipment}</p>
        <p className="text-xs text-gray-500 mt-0.5">{a.autoShipmentDesc}</p>
      </div>
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name!} slug={vendor.store_slug!} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> {a.deliverySettings}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{a.deliverySettingsDesc}</p>
        </div>

        {loadingConfig ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">

            {/* Default provider */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1">{a.defaultProvider}</h2>
              <p className="text-sm text-gray-500 mb-4">{a.defaultProviderDesc}</p>
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

            {/* Yalidine */}
            {form.default_provider === 'yalidine' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-orange-500" /> {a.apiKeysYalidine}
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://yalidine.app" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">yalidine.app</a>.</span>
                  <a href="https://yalidine.app/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {a.apiId} <span className="text-gray-400 font-normal">{a.apiIdDesc}</span>
                    </label>
                    <input type="text" value={form.yalidine_api_id}
                      onChange={(e) => setForm({ ...form, yalidine_api_id: e.target.value })}
                      placeholder="ex: 12345"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {a.apiToken} <span className="text-gray-400 font-normal">{a.apiTokenDesc}</span>
                    </label>
                    <div className="relative">
                      <input type={showToken ? 'text' : 'password'} value={form.yalidine_api_token}
                        onChange={(e) => setForm({ ...form, yalidine_api_token: e.target.value })}
                        placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                      <button type="button" onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {encNote}
                  </div>
                  {form.yalidine_api_id && form.yalidine_api_token && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={testYalidineCredentials} disabled={testing}
                        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-60">
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {a.testConnection}
                      </button>
                      {testResult === 'ok' && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                          <Check className="w-4 h-4" /> {a.connectionOk}
                        </span>
                      )}
                      {testResult === 'fail' && (
                        <span className="text-sm font-semibold text-red-500">{a.connectionFail}</span>
                      )}
                      {testResult === 'unsaved' && (
                        <span className="text-sm font-semibold text-amber-500">
                          {isRTL ? 'Ã™Å Ã˜Â±Ã˜Â¬Ã™â€° Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹ Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¬Ã˜Â±Ã˜Â¨Ã˜Â©' : "Sauvegardez d'abord pour tester."}
                        </span>
                      )}
                    </div>
                  )}
                  {autoShipmentCheckbox}
                </div>
              </div>
            )}

            {/* Procolis */}
            {form.default_provider === 'procolis' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-amber-500" /> {a.tokenLabel} Procolis
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://procolis.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">procolis.com</a>.</span>
                  <a href="https://procolis.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.tokenLabel}</label>
                <input type="password" value={form.procolis_token}
                  onChange={(e) => setForm({ ...form, procolis_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* ZR Express */}
            {form.default_provider === 'zr' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-blue-500" /> {a.tokenLabel} ZR Express
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://zrexpress.dz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">zrexpress.dz</a>.</span>
                  <a href="https://zrexpress.dz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.tokenLabel}</label>
                <input type="password" value={form.zr_token}
                  onChange={(e) => setForm({ ...form, zr_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* Maystro */}
            {form.default_provider === 'maystro' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-emerald-500" /> {a.bearerToken} Maystro Delivery
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://maystro-delivery.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">maystro-delivery.com</a>.</span>
                  <a href="https://maystro-delivery.com/app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.bearerToken}</label>
                <input type="password" value={form.maystro_token}
                  onChange={(e) => setForm({ ...form, maystro_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* Colivraison */}
            {form.default_provider === 'colivraison' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-violet-500" /> {a.bearerToken} Colivraison
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://app.colivraison.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">app.colivraison.com</a>.</span>
                  <a href="https://app.colivraison.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.bearerToken}</label>
                <input type="password" value={form.colivraison_token}
                  onChange={(e) => setForm({ ...form, colivraison_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* Rex Livraison */}
            {form.default_provider === 'rex' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-red-500" /> {a.tokenLabel} Rex Livraison
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://rexlivraison.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">rexlivraison.com</a>.</span>
                  <a href="https://rexlivraison.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.tokenLabel}</label>
                <input type="password" value={form.rex_token}
                  onChange={(e) => setForm({ ...form, rex_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* Yassir Express */}
            {form.default_provider === 'yassir' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-sky-500" /> {a.apiKey} Yassir Express
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://yassir.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">yassir.com</a>.</span>
                  <a href="https://yassir.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{a.apiKey}</label>
                <input type="password" value={form.yassir_api_key}
                  onChange={(e) => setForm({ ...form, yassir_api_key: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* Ecom Delivery */}
            {form.default_provider === 'ecom' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-emerald-500" /> {a.tokenLabel} Ecom Delivery
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://ecom-dz.net" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">ecomdelivery.dz</a>.</span>
                  <a href="https://ecom-dz.net" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key</label>
                <input type="password" value={form.ecom_api_key}
                  onChange={(e) => setForm({ ...form, ecom_api_key: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono mb-3" />
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Token</label>
                <input type="password" value={form.ecom_api_token}
                  onChange={(e) => setForm({ ...form, ecom_api_token: e.target.value })}
                  placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                {encNote}
                {autoShipmentCheckbox}
              </div>
            )}

            {/* APEC Delivery */}
            {form.default_provider === 'apec' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <Zap className="w-5 h-5 text-indigo-500" /> {a.apiKeysApec}
                </h2>
                <p className="text-sm text-gray-500 mb-4 flex items-center gap-3 flex-wrap">
                  <span>{a.getCredentials}{' '}<a href="https://apec.dz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">apec.dz</a>.</span>
                  <a href="https://apec.dz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {a.openDashboard}
                  </a>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {a.apiId} <span className="text-gray-400 font-normal">{a.apiIdDesc}</span>
                    </label>
                    <input type="text" value={form.apec_api_id}
                      onChange={(e) => setForm({ ...form, apec_api_id: e.target.value })}
                      placeholder="ex: 12345"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      {a.apiToken} <span className="text-gray-400 font-normal">{a.apiTokenDesc}</span>
                    </label>
                    <input type="password" value={form.apec_api_token}
                      onChange={(e) => setForm({ ...form, apec_api_token: e.target.value })}
                      placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                    {encNote}
                  </div>
                  {form.apec_api_id && form.apec_api_token && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={testApecCredentials} disabled={testingApec}
                        className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm disabled:opacity-60">
                        {testingApec ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {a.testConnection}
                      </button>
                      {testResultApec === 'ok' && (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                          <Check className="w-4 h-4" /> {a.connectionOk}
                        </span>
                      )}
                      {testResultApec === 'fail' && (
                        <span className="text-sm font-semibold text-red-500">{a.connectionFail}</span>
                      )}
                      {testResultApec === 'unsaved' && (
                        <span className="text-sm font-semibold text-amber-500">
                          {isRTL ? 'Ã™Å Ã˜Â±Ã˜Â¬Ã™â€° Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜ÂºÃ™Å Ã™Å Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â£Ã™Ë†Ã™â€žÃ˜Â§Ã™â€¹ Ã™â€žÃ™â€žÃ˜ÂªÃ˜Â¬Ã˜Â±Ã˜Â¨Ã˜Â©' : "Sauvegardez d'abord pour tester."}
                        </span>
                      )}
                    </div>
                  )}
                  {autoShipmentCheckbox}
                </div>
              </div>
            )}

            {/* Buyer Notifications */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                <Bell className="w-5 h-5 text-blue-500" /> {a.notificationsBuyer}
              </h2>
              <p className="text-sm text-gray-500 mb-4">{a.notificationsDesc}</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notify_whatsapp}
                    onChange={(e) => setForm({ ...form, notify_whatsapp: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                    <p className="text-xs text-gray-500">{a.whatsappDesc}</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.notify_sms}
                    onChange={(e) => setForm({ ...form, notify_sms: e.target.checked })}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">SMS</p>
                    <p className="text-xs text-gray-500">{a.smsDesc}</p>
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
                {saved ? a.savedBtn : a.saveBtn}
              </button>
            </div>

          </form>
        )}
      </main>
    </div>
  )
}
