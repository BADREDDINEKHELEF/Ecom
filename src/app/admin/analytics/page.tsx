import Link from 'next/link'
import { TrendingUp, ShoppingBag, DollarSign, Truck, XCircle, RotateCcw, Clock, Package, ArrowRight, Download } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getCodStats, getAnalyticsData } from '@/lib/supabase/analytics'

export const revalidate = 120

export default async function AnalyticsPage() {
  const [analytics, cod] = await Promise.all([
    getAnalyticsData().catch(() => ({
      totalRevenue: 0,
      totalOrders: 0,
      monthly: [],
      topProducts: [],
    })),
    getCodStats().catch(() => ({ total: 0, delivered: 0, failed: 0, returned: 0, pending: 0 })),
  ])

  const deliveryRate = cod.total > 0 ? Math.round((cod.delivered / cod.total) * 100) : 0
  const failureRate  = cod.total > 0 ? Math.round((cod.failed  / cod.total) * 100) : 0
  const returnRate   = cod.total > 0 ? Math.round((cod.returned / cod.total) * 100) : 0
  const maxRevenue   = Math.max(...analytics.monthly.map((m) => m.revenue), 1)

  const kpis = [
    {
      label: 'Revenue (6 months)',
      value: formatPrice(analytics.totalRevenue),
      icon: DollarSign,
      color: 'text-indigo-600 bg-indigo-50',
      sub: analytics.totalRevenue === 0 ? 'No orders yet' : 'All time in period',
    },
    {
      label: 'Total Orders',
      value: analytics.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      color: 'text-emerald-600 bg-emerald-50',
      sub: 'Last 6 months',
    },
    {
      label: 'COD Orders',
      value: cod.total.toLocaleString(),
      icon: Truck,
      color: 'text-violet-600 bg-violet-50',
      sub: `${deliveryRate}% delivery rate`,
    },
    {
      label: 'Avg. Order Value',
      value: analytics.totalOrders > 0 ? formatPrice(Math.round(analytics.totalRevenue / analytics.totalOrders)) : '—',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
      sub: 'Last 6 months',
    },
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Last 6 months — live data from your orders</p>
        </div>
        <a
          href="/api/admin/analytics/export"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-bold text-gray-900 mb-6">Monthly Revenue</h2>
        {analytics.monthly.every((m) => m.revenue === 0) ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No orders yet — revenue will appear here once you start selling.
          </div>
        ) : (
          <div className="flex items-end gap-3 h-48">
            {analytics.monthly.map((m) => {
              const height = Math.max(Math.round((m.revenue / maxRevenue) * 100), m.revenue > 0 ? 4 : 0)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  {m.revenue > 0 && (
                    <span className="text-xs text-gray-500 font-medium">
                      {m.revenue >= 1000 ? `${Math.round(m.revenue / 1000)}k` : m.revenue}
                    </span>
                  )}
                  <div className="w-full flex-1 flex items-end">
                    <div className="w-full relative group">
                      <div
                        className="w-full bg-indigo-500 rounded-t-lg hover:bg-indigo-600 transition-colors cursor-default"
                        style={{ height: `${height * 1.5}px` }}
                      />
                      {m.orders > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {m.orders} order{m.orders !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{m.month}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* COD Performance */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Truck className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-gray-900">COD Performance</h2>
          <span className="text-xs text-gray-400 ml-auto">{cod.total} total COD orders</span>
        </div>
        {cod.total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Mark orders as delivered / failed in the Orders page to see COD analytics.
          </p>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Delivered', value: cod.delivered, rate: deliveryRate, icon: Truck,       color: 'text-green-600 bg-green-50',  bar: 'bg-green-500' },
              { label: 'Failed',    value: cod.failed,    rate: failureRate,  icon: XCircle,     color: 'text-red-600 bg-red-50',      bar: 'bg-red-500' },
              { label: 'Returned',  value: cod.returned,  rate: returnRate,   icon: RotateCcw,   color: 'text-amber-600 bg-amber-50',  bar: 'bg-amber-500' },
              { label: 'Pending',   value: cod.pending,   rate: cod.total > 0 ? Math.round((cod.pending / cod.total) * 100) : 0, icon: Clock, color: 'text-gray-600 bg-gray-100', bar: 'bg-gray-400' },
            ].map(({ label, value, rate, icon: Icon, color, bar }) => (
              <div key={label} className="space-y-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${rate}%` }} />
                </div>
                <p className="text-xs font-bold text-gray-500">{rate}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-gray-900">Top Selling Products</h2>
        </div>
        {analytics.topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Top products will appear here once orders come in.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['#', 'Product', 'Units Sold', 'Revenue'].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide pb-3 pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analytics.topProducts.map((p, i) => (
                  <tr key={p.name} className="hover:bg-gray-50">
                    <td className="py-3 pr-6 font-bold text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 pr-6 font-semibold text-gray-900 max-w-[200px] truncate">{p.name}</td>
                    <td className="py-3 pr-6 font-bold text-gray-900">{p.sales}</td>
                    <td className="py-3 font-bold text-indigo-600">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COD deep-dive link */}
      <Link
        href="/admin/analytics/cod"
        className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-5 hover:bg-indigo-100 transition-colors group"
      >
        <div>
          <p className="font-bold text-indigo-900">Analytiques COD détaillées →</p>
          <p className="text-sm text-indigo-600 mt-0.5">
            Taux de collecte par wilaya et transporteur · Export CSV
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}
