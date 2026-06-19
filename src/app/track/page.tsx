'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, Phone, ArrowLeft, ExternalLink } from 'lucide-react'
import { getTrackingUrl } from '@/lib/delivery/dispatch'

interface TrackingOrder {
  id:                string
  full_name:         string
  wilaya:            string
  city:              string
  status:            string
  total:             number
  delivery_outcome:  string | null
  yalidine_tracking: string | null
  delivery_provider: string | null
  created_at:        string
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending:   { label: 'En attente de confirmation', icon: <Clock className="w-5 h-5" />,        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmée',                  icon: <Package className="w-5 h-5" />,       color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  shipped:   { label: 'En livraison',               icon: <Truck className="w-5 h-5" />,         color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  delivered: { label: 'Livrée',                     icon: <CheckCircle2 className="w-5 h-5" />,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Annulée',                    icon: <XCircle className="w-5 h-5" />,       color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
}

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  delivered: { label: 'Livraison réussie',  color: 'text-emerald-600' },
  failed:    { label: 'Échec de livraison', color: 'text-red-600'     },
  returned:  { label: 'Retourné',           color: 'text-orange-600'  },
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-DZ', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 })
    .format(amount)
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
}

function validateAlgerianPhone(phone: string): boolean {
  return /^(213[5-7]|0[5-7])\d{8}$/.test(normalizePhone(phone))
}

export default function TrackOrderPage() {
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [orders, setOrders]     = useState<TrackingOrder[] | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!validateAlgerianPhone(normalized)) {
      setError('Veuillez entrer un numéro de téléphone algérien valide (05/06/07XXXXXXXX)')
      return
    }

    setLoading(true)
    setError('')
    setOrders(null)

    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(normalized)}`)
      if (!res.ok) throw new Error('Erreur de recherche')
      const data = await res.json()
      setOrders(data.orders ?? [])
      setSearched(true)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Suivre ma commande</h1>
            <p className="text-sm text-gray-500">Entrez votre numéro de téléphone</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Search Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Rechercher vos commandes</h2>
              <p className="text-sm text-gray-500">Utilisez le numéro de téléphone fourni lors de la commande</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Numéro de téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError('') }}
                  placeholder="0661 23 45 67"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                             placeholder:text-gray-400"
                  dir="ltr"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Rechercher mes commandes
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {searched && orders !== null && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Aucune commande trouvée</h3>
                <p className="text-sm text-gray-500">
                  Aucune commande n&apos;est associée à ce numéro de téléphone.
                  Vérifiez le numéro utilisé lors de la commande.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 font-medium">
                  {orders.length} commande{orders.length > 1 ? 's' : ''} trouvée{orders.length > 1 ? 's' : ''}
                </p>
                {orders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
                  const outcomeCfg = order.delivery_outcome
                    ? OUTCOME_CONFIG[order.delivery_outcome]
                    : null
                  const trackingUrl = order.yalidine_tracking && order.delivery_provider
                    ? getTrackingUrl(order.delivery_provider, order.yalidine_tracking)
                    : null

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                      {/* Status Banner */}
                      <div className={`px-5 py-3 border-b flex items-center gap-2 ${statusCfg.bg}`}>
                        <span className={statusCfg.color}>{statusCfg.icon}</span>
                        <span className={`text-sm font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                        {outcomeCfg && (
                          <span className={`ml-auto text-xs font-medium ${outcomeCfg.color}`}>
                            {outcomeCfg.label}
                          </span>
                        )}
                      </div>

                      <div className="p-5 space-y-4">
                        {/* Order meta */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                              Commande
                            </p>
                            <p className="font-mono text-sm font-semibold text-gray-900 mt-0.5">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                              Total
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-0.5">
                              {formatPrice(order.total)}
                            </p>
                          </div>
                        </div>

                        {/* Delivery address */}
                        <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                          <Truck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Adresse de livraison</p>
                            <p className="text-sm text-gray-900 mt-0.5">
                              {order.city}, {order.wilaya}
                            </p>
                          </div>
                        </div>

                        {/* Tracking number */}
                        {order.yalidine_tracking && (
                          <div className="flex items-center justify-between gap-3 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                            <div>
                              <p className="text-xs text-indigo-600 font-medium">
                                Numéro de suivi · {order.delivery_provider ?? 'Livreur'}
                              </p>
                              <p className="font-mono text-sm font-bold text-indigo-900 mt-0.5">
                                {order.yalidine_tracking}
                              </p>
                            </div>
                            {trackingUrl && trackingUrl !== '#' && (
                              <a
                                href={trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                Suivre
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Date */}
                        <p className="text-xs text-gray-400">
                          Commandé le {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* Help text */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>Vous avez besoin d&apos;aide ?</p>
          <Link href="/contact" className="text-indigo-600 hover:underline font-medium">
            Contactez notre support
          </Link>
        </div>

      </main>
    </div>
  )
}
