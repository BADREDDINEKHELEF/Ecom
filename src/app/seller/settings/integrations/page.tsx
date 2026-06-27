'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Check, X, Zap, Play, Gauge, Code, Menu, RefreshCw } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { ALL_WILAYAS } from '@/lib/data/wilayas'

interface HealthRecord {
  integration_name: string
  health_status: 'connected' | 'needs_configuration' | 'failed'
  last_success_at: string | null
  last_failure_at: string | null
  last_error_message: string | null
  last_http_status: number | null
  last_account_name: string | null
  last_quote_fee: number | null
  last_quote_duration: string | null
  last_quote_response: unknown | null
}

const INTEGRATION_KEYS = [
  { name: 'yalidine', type: 'delivery', label: 'Yalidine Express' },
  { name: 'zr', type: 'delivery', label: 'ZR Express' },
  { name: 'maystro', type: 'delivery', label: 'Maystro Delivery' },
  { name: 'procolis', type: 'delivery', label: 'Procolis' },
  { name: 'colivraison', type: 'delivery', label: 'Colivraison' },
  { name: 'rex', type: 'delivery', label: 'Rex Livraison' },
  { name: 'yassir', type: 'delivery', label: 'Yassir Express (No Quotes)' },
  { name: 'ecom', type: 'delivery', label: 'Ecom Delivery' },
  { name: 'apec', type: 'delivery', label: 'APEC Delivery' },
  { name: 'meta_capi', type: 'analytics', label: 'Meta Pixel / CAPI' },
  { name: 'tiktok_capi', type: 'analytics', label: 'TikTok Events API' },
  { name: 'google_capi', type: 'analytics', label: 'Google GA4 Measurement' },
]

export default function IntegrationsHealthPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [healthData, setHealthData] = useState<Record<string, HealthRecord>>({})
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [devMode, setDevMode] = useState(false)

  // Local tester states
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [selectedWilaya, setSelectedWilaya] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; raw?: unknown; message?: string; rate?: { homeDelivery?: number; deskDelivery?: number; provider?: string } }>>({})

  const loadHealth = useCallback(async () => {
    if (!vendor) return
    setLoadingHealth(true)
    try {
      const res = await fetch('/api/seller/integration-health')
      if (res.ok) {
        const data = await res.json()
        const lookup: Record<string, HealthRecord> = {}
        data.health.forEach((r: HealthRecord) => {
          lookup[r.integration_name] = r
        })
        setHealthData(lookup)
      }
    } catch {} finally {
      setLoadingHealth(false)
    }
  }, [vendor])

  useEffect(() => {
    loadHealth()
  }, [loadHealth])

  const runTest = async (integrationName: string, action: string, extraParams?: unknown) => {
    setTesting((prev) => ({ ...prev, [`${integrationName}-${action}`]: true }))
    try {
      const res = await fetch('/api/seller/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationName,
          action,
          params: extraParams,
        }),
      })
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [`${integrationName}-${action}`]: {
          ok: res.ok && data.ok !== false,
          raw: data.raw || data,
          message: data.message || data.error || (res.ok ? 'Vérification réussie' : 'Échec de la vérification'),
          rate: data.rate || null,
        },
      }))
      loadHealth()
    } catch (err: unknown) {
      setTestResults((prev) => ({
        ...prev,
        [`${integrationName}-${action}`]: {
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        },
      }))
    } finally {
      setTesting((prev) => ({ ...prev, [`${integrationName}-${action}`]: false }))
    }
  }

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            {isRTL ? 'متصل' : 'Connecté'}
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
            {isRTL ? 'فشل الاتصال' : 'Échec d\'authentification'}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {isRTL ? 'بحاجة إلى تهيئة' : 'Configuration requise'}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Gauge className="w-6 h-6 text-indigo-600" /> {isRTL ? 'التحقق من الإعدادات' : 'Vérification des Intégrations'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{isRTL ? 'تحقق من ربط شركات الشحن والبكسل في الوقت الفعلي' : 'Testez et validez vos API de livraison et tracking publicitaire en temps réel.'}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setDevMode(!devMode)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
                devMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>{isRTL ? 'وضع المطور' : 'Mode Développeur'}</span>
            </button>
            <button
              onClick={loadHealth}
              disabled={loadingHealth}
              className="flex items-center justify-center p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              title="Recharger"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingHealth ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Summary Widget */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isRTL ? 'نشط' : 'Connectés'}</p>
                  <p className="text-xl font-black text-gray-900">
                    {INTEGRATION_KEYS.filter((k) => healthData[k.name]?.health_status === 'connected').length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-gray-100 sm:pl-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isRTL ? 'فشل الربط' : 'Erreurs Authentification'}</p>
                  <p className="text-xl font-black text-gray-900">
                    {INTEGRATION_KEYS.filter((k) => healthData[k.name]?.health_status === 'failed').length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-gray-100 sm:pl-4">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isRTL ? 'لم تتم تهيئته' : 'Non Configurés'}</p>
                  <p className="text-xl font-black text-gray-900">
                    {INTEGRATION_KEYS.filter((k) => !healthData[k.name] || healthData[k.name]?.health_status === 'needs_configuration').length}
                  </p>
                </div>
              </div>
            </div>

            {/* List of Integrations */}
            <div className="space-y-4">
              {INTEGRATION_KEYS.map((integration) => {
                const health = healthData[integration.name]
                const connTesting = testing[`${integration.name}-test_connection`] || testing[`${integration.name}-send_test_event`]
                const quoteTesting = testing[`${integration.name}-test_quote`]
                const connResult = testResults[`${integration.name}-test_connection`] || testResults[`${integration.name}-send_test_event`]
                const quoteResult = testResults[`${integration.name}-test_quote`]
                
                return (
                  <div key={integration.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-gray-900 text-base">{integration.label}</h3>
                          {getStatusBadge(health?.health_status)}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">{integration.type === 'delivery' ? 'Logistique' : 'Analytics & Conversion API'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {integration.type === 'delivery' ? (
                          <button
                            onClick={() => runTest(integration.name, 'test_connection')}
                            disabled={connTesting}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-950 text-white font-bold rounded-xl text-xs hover:bg-gray-800 disabled:opacity-60 transition-colors"
                          >
                            {connTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            <span>{isRTL ? 'فحص الاتصال' : 'Tester la Connexion'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => runTest(integration.name, 'send_test_event')}
                            disabled={connTesting}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                          >
                            {connTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{integration.name === 'google_capi' ? 'Tester GA4 Event' : 'Tester Purchase Event'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Historical Health Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                      <div>
                        <p className="text-gray-400 font-bold uppercase">{isRTL ? 'آخر نجاح' : 'Dernier succès'}</p>
                        <p className="text-gray-700 font-semibold mt-0.5">
                          {health?.last_success_at ? new Date(health.last_success_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase">{isRTL ? 'آخر فشل' : 'Dernier échec'}</p>
                        <p className="text-gray-700 font-semibold mt-0.5">
                          {health?.last_failure_at ? new Date(health.last_failure_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="sm:col-span-2 md:col-span-1">
                        <p className="text-gray-400 font-bold uppercase">{isRTL ? 'آخر خطأ' : 'Dernier message d\'erreur'}</p>
                        <p className="text-red-600 font-semibold mt-0.5 truncate" title={health?.last_error_message || ''}>
                          {health?.last_error_message || 'Aucun'}
                        </p>
                      </div>
                    </div>

                    {/* Quote testing actions for delivery */}
                    {integration.type === 'delivery' && integration.name !== 'yassir' && (
                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isRTL ? 'تجربة حساب التسعيرة' : 'Test de Tarification Temps Réel'}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <select
                            value={selectedWilaya[integration.name] || ''}
                            onChange={(e) => setSelectedWilaya({ ...selectedWilaya, [integration.name]: e.target.value })}
                            className="border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-400 bg-white"
                          >
                            <option value="">Choisir une wilaya…</option>
                            {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                          </select>
                          <button
                            onClick={() => runTest(integration.name, 'test_quote', { wilaya: selectedWilaya[integration.name] })}
                            disabled={quoteTesting || !selectedWilaya[integration.name]}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                          >
                            {quoteTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            <span>{isRTL ? 'حساب السعر' : 'Calculer le tarif'}</span>
                          </button>
                        </div>

                        {quoteResult && (
                          <div className={`rounded-xl p-3 border text-xs ${quoteResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            {quoteResult.ok ? (
                              <div>
                                <span className="font-black">Tarif récupéré: </span>
                                <span className="font-mono bg-white px-2 py-0.5 rounded border border-green-100 font-bold ml-1">
                                  {quoteResult.rate?.homeDelivery} DZD (A domicile) {quoteResult.rate?.deskDelivery ? `/ ${quoteResult.rate.deskDelivery} DZD (Stop Desk)` : ''}
                                </span>
                              </div>
                            ) : (
                              <p className="font-semibold">{quoteResult.message || 'Impossible de récupérer la tarification'}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Connection/Event trigger results */}
                    {connResult && (
                      <div className={`rounded-xl p-4 border text-xs space-y-2 ${connResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <div className="flex items-center gap-1.5">
                          {connResult.ok ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                          <span className="font-bold">{connResult.message || (connResult.ok ? 'Succès' : 'Échec')}</span>
                        </div>
                        {devMode && !!connResult.raw && (
                          <div className="mt-2">
                            <p className="font-bold text-gray-500 uppercase text-[9px] mb-1">Réponse brute de l&apos;API (JSON)</p>
                            <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto font-mono text-[10px] whitespace-pre-wrap max-h-48 leading-relaxed">
                              {JSON.stringify(connResult.raw, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
