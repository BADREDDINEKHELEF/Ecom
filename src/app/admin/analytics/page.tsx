import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Eye } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { niches } from '@/lib/data/niches'

const MONTHLY = [
  { month: 'Jul', revenue: 185000, orders: 72 },
  { month: 'Aug', revenue: 220000, orders: 89 },
  { month: 'Sep', revenue: 198000, orders: 81 },
  { month: 'Oct', revenue: 267000, orders: 104 },
  { month: 'Nov', revenue: 312000, orders: 128 },
  { month: 'Dec', revenue: 389000, orders: 156 },
]

const maxRevenue = Math.max(...MONTHLY.map((m) => m.revenue))

const TOP_PRODUCTS = [
  { name: 'Baby Stroller Travel System', niche: 'kids', sales: 43, revenue: 1032000 },
  { name: 'Kids Learning Tablet 7"', niche: 'kids', sales: 38, revenue: 456000 },
  { name: 'Portable Jump Starter 2000A', niche: 'cars', sales: 31, revenue: 356500 },
  { name: 'Multi-Level Cat Tree Tower', niche: 'animals', sales: 28, revenue: 249200 },
  { name: 'HD Dash Cam 4K WiFi', niche: 'cars', sales: 24, revenue: 213600 },
]

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Last 6 months performance overview</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {[
          { label: 'Total Revenue', value: formatPrice(389000), change: '+24.7%', up: true, icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Total Orders', value: '1,041', change: '+18.3%', up: true, icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Unique Visitors', value: '14,238', change: '+9.1%', up: true, icon: Eye, color: 'text-violet-600 bg-violet-50' },
          { label: 'Conversion Rate', value: '7.3%', change: '-0.4%', up: false, icon: Users, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, change, up, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {change} vs last period
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6">Monthly Revenue</h2>
          <div className="flex items-end gap-3 h-48">
            {MONTHLY.map((m) => {
              const height = Math.round((m.revenue / maxRevenue) * 100)
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">{formatPrice(m.revenue / 1000)}k</span>
                  <div className="w-full relative group">
                    <div
                      className="w-full bg-indigo-500 rounded-t-lg hover:bg-indigo-600 transition-colors cursor-default"
                      style={{ height: `${height * 1.5}px` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {m.orders} orders
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{m.month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Niche Breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6">Traffic by Niche</h2>
          <div className="space-y-4">
            {[
              { niche: 'kids', visits: 5842, pct: 41 },
              { niche: 'cars', visits: 4721, pct: 33 },
              { niche: 'animals', visits: 3675, pct: 26 },
            ].map(({ niche, visits, pct }) => {
              const n = niches.find((x) => x.id === niche)!
              const barColors: Record<string, string> = { cars: 'bg-orange-400', animals: 'bg-amber-400', kids: 'bg-pink-400' }
              return (
                <div key={niche}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="font-medium text-gray-700">{n.emoji} {n.name.split(' ')[0]}</span>
                    <span className="text-gray-500">{visits.toLocaleString()} visits · {pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColors[niche]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-5">Top Selling Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['#', 'Product', 'Niche', 'Sales', 'Revenue'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide pb-3 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {TOP_PRODUCTS.map((p, i) => {
                const n = niches.find((x) => x.id === p.niche)!
                return (
                  <tr key={p.name} className="hover:bg-gray-50">
                    <td className="py-3 pr-6 font-bold text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 pr-6 font-semibold text-gray-900">{p.name}</td>
                    <td className="py-3 pr-6 text-gray-600">{n.emoji} {n.name.split(' ')[0]}</td>
                    <td className="py-3 pr-6 font-bold text-gray-900">{p.sales}</td>
                    <td className="py-3 font-bold text-indigo-600">{formatPrice(p.revenue)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
