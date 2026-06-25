import { TrendingDown, TrendingUp, Package, DollarSign, AlertTriangle } from 'lucide-react'
import { getCodWilayaStats, getCodProviderStats } from '@/lib/supabase/analytics'
import { formatPrice } from '@/lib/utils'
import CodExportButton from './CodExportButton'

export const revalidate = 300

export default async function CodAnalyticsPage() {
  const [wilayaStats, providerStats] = await Promise.all([
    getCodWilayaStats().catch(() => []),
    getCodProviderStats().catch(() => []),
  ])

  const totalCod       = wilayaStats.reduce((s, r) => s + Number(r.total_cod_orders), 0)
  const totalCollected = wilayaStats.reduce((s, r) => s + Number(r.collected), 0)
  const totalLost      = wilayaStats.reduce((s, r) => s + Number(r.lost_amount_dzd), 0)
  const totalGained    = wilayaStats.reduce((s, r) => s + Number(r.collected_amount_dzd), 0)
  const overallRate    = totalCod > 0 ? Math.round((totalCollected / totalCod) * 100) : 0

  // Sort by failure rate (worst first) for the risk table
  const sorted = [...wilayaStats].sort((a, b) => {
    const rateA = a.collection_rate_pct ?? 100
    const rateB = b.collection_rate_pct ?? 100
    return rateA - rateB
  })

  // Top 10 worst wilayas for the bar chart data
  const worstWilayas = sorted.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Analytiques COD</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Taux de collecte par wilaya et par transporteur
            </p>
          </div>
          <CodExportButton data={wilayaStats} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:   'Total commandes COD',
              value:   totalCod.toLocaleString('fr-DZ'),
              sub:     'toutes wilayas confondues',
              icon:    Package,
              color:   'text-indigo-600 bg-indigo-50',
            },
            {
              label:   'Taux de collecte global',
              value:   `${overallRate}%`,
              sub:     overallRate >= 70 ? 'Bonne performance' : overallRate >= 50 ? 'À améliorer' : 'Critique',
              icon:    overallRate >= 70 ? TrendingUp : TrendingDown,
              color:   overallRate >= 70 ? 'text-green-600 bg-green-50' : overallRate >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
            },
            {
              label:   'Montant collecté',
              value:   formatPrice(totalGained),
              sub:     `${totalCollected.toLocaleString()} livraisons`,
              icon:    DollarSign,
              color:   'text-emerald-600 bg-emerald-50',
            },
            {
              label:   'Montant perdu (refus/retour)',
              value:   formatPrice(totalLost),
              sub:     'frais de retour inclus',
              icon:    AlertTriangle,
              color:   'text-red-600 bg-red-50',
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Provider Comparison ── */}
        {providerStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Comparaison par transporteur</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Transporteur</th>
                    <th className="pb-3 font-semibold text-right">Commandes COD</th>
                    <th className="pb-3 font-semibold text-right">Collectées</th>
                    <th className="pb-3 font-semibold text-right">Refusées</th>
                    <th className="pb-3 font-semibold text-right">Retournées</th>
                    <th className="pb-3 font-semibold text-right">Taux collecte</th>
                    <th className="pb-3 font-semibold text-right">Montant collecté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {providerStats.map((row) => {
                    const rate = row.collection_rate_pct ?? 0
                    return (
                      <tr key={row.delivery_provider} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-900 capitalize">{row.delivery_provider}</td>
                        <td className="py-3 text-right text-gray-600">{Number(row.total_cod_orders).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-emerald-600 font-medium">{Number(row.collected).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-red-500">{Number(row.refused).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-amber-500">{Number(row.returned).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right">
                          <RateBadge rate={rate} />
                        </td>
                        <td className="py-3 text-right text-gray-700 font-medium">
                          {formatPrice(Number(row.collected_amount_dzd))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Worst 10 Wilayas Bar Chart ── */}
        {worstWilayas.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">10 wilayas avec le plus fort taux d&apos;échec</h2>
            <p className="text-sm text-gray-500 mb-5">Cibles prioritaires pour améliorer la collecte COD</p>
            <div className="space-y-3">
              {worstWilayas.map((row) => {
                const rate    = row.collection_rate_pct ?? 0
                const failure = 100 - rate
                const barColor = rate >= 70 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={row.wilaya}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800 w-32 truncate">{row.wilaya}</span>
                      <span className="text-gray-400 text-xs">
                        {Number(row.total_cod_orders)} cmd · {failure.toFixed(0)}% échec
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Full Wilaya Table ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Toutes les wilayas</h2>
          {wilayaStats.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">
              Aucune donnée COD disponible.
              <br />
              <span className="text-xs">Les données apparaîtront une fois les premières livraisons COD complétées.</span>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Wilaya</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3 font-semibold text-right">Collectées</th>
                    <th className="pb-3 font-semibold text-right">Refusées</th>
                    <th className="pb-3 font-semibold text-right">Retournées</th>
                    <th className="pb-3 font-semibold text-right">Non joignables</th>
                    <th className="pb-3 font-semibold text-right">Taux collecte</th>
                    <th className="pb-3 font-semibold text-right">Montant perdu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((row) => {
                    const rate = row.collection_rate_pct ?? 0
                    return (
                      <tr key={row.wilaya} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-900">{row.wilaya}</td>
                        <td className="py-3 text-right text-gray-600">{Number(row.total_cod_orders).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-emerald-600 font-medium">{Number(row.collected).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-red-500">{Number(row.refused).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-amber-500">{Number(row.returned).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right text-gray-400">{Number(row.unreachable).toLocaleString('fr-DZ')}</td>
                        <td className="py-3 text-right">
                          <RateBadge rate={rate} />
                        </td>
                        <td className="py-3 text-right text-red-600 font-medium">
                          {row.lost_amount_dzd > 0 ? formatPrice(Number(row.lost_amount_dzd)) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function RateBadge({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-gray-400 text-xs">N/A</span>
  const color = rate >= 70 ? 'bg-green-100 text-green-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {rate.toFixed(1)}%
    </span>
  )
}
