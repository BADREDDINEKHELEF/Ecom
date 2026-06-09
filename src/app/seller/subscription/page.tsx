'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Crown, Zap, Star, AlertCircle, Clock, CreditCard, Upload, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { SubscriptionPlan, VendorSubscription } from '@/lib/supabase/vendors'

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  trial:        { label: 'Trial',        color: 'bg-blue-100 text-blue-700',   icon: Clock },
  active:       { label: 'Active',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  grace_period: { label: 'Grace Period', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  expired:      { label: 'Expired',      color: 'bg-red-100 text-red-700',     icon: AlertCircle },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-600',   icon: AlertCircle },
} as const

const PLAN_ICONS: Record<string, React.ElementType> = {
  basic: Zap,
  professional: Star,
  enterprise: Crown,
}

const PLAN_COLORS: Record<string, string> = {
  basic: 'border-blue-200 bg-blue-50',
  professional: 'border-violet-200 bg-violet-50',
  enterprise: 'border-amber-200 bg-amber-50',
}

const PLAN_BADGE: Record<string, string> = {
  basic: 'bg-blue-600',
  professional: 'bg-violet-600',
  enterprise: 'bg-amber-500',
}

// lang is kept as a variable to allow future dynamic language support
type Lang = 'fr' | 'en' | 'ar'

const PAYMENT_METHODS = [
  { id: 'baridi_mob', label: 'BaridiMob', desc: 'Virement via l\'appli BaridiMob' },
  { id: 'ccp', label: 'CCP / Virement Postal', desc: 'Virement depuis un bureau de poste' },
  { id: 'manual', label: 'Autre', desc: 'Paiement manuel — contactez le support' },
]

export default function SellerSubscriptionPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null)
  const [fetching, setFetching] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('baridi_mob')
  const [paymentRef, setPaymentRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const lang = 'fr' as Lang

  useEffect(() => {
    if (!vendor) return
    fetch('/api/seller/subscription')
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? [])
        setSubscription(d.subscription ?? null)
      })
      .finally(() => setFetching(false))
  }, [vendor])

  const handleSubmit = async () => {
    if (!selectedPlan || !paymentMethod) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/seller/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan,
          payment_method: paymentMethod,
          payment_reference: paymentRef || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Une erreur est survenue')
      } else {
        const d = await res.json()
        setSubscription(d.subscription)
        setSuccess(true)
        setShowForm(false)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const planName = (p: SubscriptionPlan) =>
    lang === 'ar' ? p.name_ar : lang === 'fr' ? p.name_fr : p.name_en

  const planFeatures = (p: SubscriptionPlan) =>
    lang === 'ar' ? p.features_ar : lang === 'fr' ? p.features_fr : p.features_en

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!vendor) return null

  const currentStatus = subscription?.status ?? 'trial'
  const statusCfg = STATUS_CFG[currentStatus] ?? STATUS_CFG.trial
  const StatusIcon = statusCfg.icon

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />

      <main className="flex-1 ml-60 p-8">
        <div className="max-w-4xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900">Abonnement</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez votre plan et vos paiements</p>
          </div>

          {/* Current subscription banner */}
          {!fetching && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Plan actuel</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-gray-900">
                      {subscription ? plans.find((p) => p.id === subscription.plan_id)
                        ? planName(plans.find((p) => p.id === subscription.plan_id)!)
                        : subscription.plan_id
                      : 'Aucun plan'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusCfg.label}
                    </span>
                  </div>
                  {subscription && (
                    <p className="text-xs text-gray-400 mt-1">
                      Expire le {new Date(subscription.expires_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  {!subscription && (
                    <p className="text-xs text-gray-400 mt-1">Souscrivez à un plan pour accéder à toutes les fonctionnalités.</p>
                  )}
                </div>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
                  <CreditCard className="w-4 h-4" />
                  {subscription ? 'Renouveler / Changer de plan' : 'Souscrire maintenant'}
                  {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-800">Demande envoyée avec succès !</p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Notre équipe va vérifier votre paiement et activer votre abonnement sous 24h.
                  Vous recevrez une confirmation par email.
                </p>
              </div>
            </div>
          )}

          {/* Subscription form */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <h2 className="font-bold text-gray-900 mb-5">Choisissez votre plan</h2>

              {/* Plans grid */}
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {fetching ? (
                  [1,2,3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)
                ) : plans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id] ?? Zap
                  const isSelected = selectedPlan === plan.id
                  return (
                    <button key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? `border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200`
                          : `${PLAN_COLORS[plan.id] ?? 'border-gray-200 bg-white'} hover:border-gray-300`
                      }`}>
                      {plan.id === 'professional' && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full">
                          POPULAIRE
                        </span>
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${PLAN_BADGE[plan.id] ?? 'bg-gray-600'}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-black text-gray-900 text-lg">{planName(plan)}</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">
                        {plan.price_dzd.toLocaleString()} <span className="text-sm font-bold text-gray-500">DZD/mois</span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {planFeatures(plan).slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {selectedPlan && (
                <>
                  {/* Payment instructions */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
                    <p className="font-bold text-amber-800 text-sm mb-2">Comment payer ?</p>
                    <p className="text-sm text-amber-700">
                      Envoyez le montant de{' '}
                      <strong>{plans.find((p) => p.id === selectedPlan)?.price_dzd.toLocaleString()} DZD</strong>{' '}
                      via BaridiMob ou virement CCP à notre compte. Entrez ensuite la référence de transaction ci-dessous.
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      Numéro CCP : <strong>00012345678 CC</strong> (exemple — remplacez par le vrai numéro dans les paramètres)
                    </p>
                  </div>

                  {/* Payment method */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mode de paiement</label>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          className={`text-left p-3 rounded-xl border-2 transition-all ${
                            paymentMethod === m.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <p className="font-bold text-sm text-gray-900">{m.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Référence de transaction <span className="font-normal text-gray-400">(optionnel mais recommandé)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="Ex: TXN20240115XXXX"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                    {submitting ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Soumettre ma demande d'abonnement</>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Plans overview (read-only) */}
          {!showForm && (
            <div>
              <h2 className="font-bold text-gray-900 mb-4">Nos plans</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {fetching ? (
                  [1,2,3].map((i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)
                ) : plans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.id] ?? Zap
                  const isCurrent = subscription?.plan_id === plan.id
                  return (
                    <div key={plan.id}
                      className={`relative p-5 rounded-2xl border-2 ${
                        isCurrent ? 'border-emerald-500 bg-emerald-50' : `${PLAN_COLORS[plan.id] ?? 'border-gray-200 bg-white'}`
                      }`}>
                      {isCurrent && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full">
                          PLAN ACTUEL
                        </span>
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${PLAN_BADGE[plan.id] ?? 'bg-gray-600'}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-black text-gray-900 text-lg">{planName(plan)}</p>
                      <p className="text-2xl font-black text-emerald-600 mt-1">
                        {plan.price_dzd.toLocaleString()} <span className="text-sm font-bold text-gray-500">DZD/mois</span>
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {planFeatures(plan).map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
