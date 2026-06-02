import { Package, ShoppingBag, Users, TrendingUp, ArrowUp, ArrowDown, DollarSign } from 'lucide-react'
import { products } from '@/lib/data/products'
import { niches } from '@/lib/data/niches'
import { formatPrice } from '@/lib/utils'

const MOCK_ORDERS = [
  { id: '#ORD-1041', customer: 'Mohammed A.', niche: 'cars', total: 18400, status: 'delivered', date: '2024-12-28' },
  { id: '#ORD-1040', customer: 'Samira K.', niche: 'kids', total: 34500, status: 'shipped', date: '2024-12-27' },
  { id: '#ORD-1039', customer: 'Youcef B.', niche: 'animals', total: 14300, status: 'confirmed', date: '2024-12-27' },
  { id: '#ORD-1038', customer: 'Fatima Z.', niche: 'kids', total: 9800, status: 'pending', date: '2024-12-26' },
  { id: '#ORD-1037', customer: 'Karim M.', niche: 'cars', total: 22100, status: 'delivered', date: '2024-12-25' },
]

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const NICHE_REVENUE: Record<string, number> = {
  cars:    245000,
  animals: 189000,
  kids:    312000,
}
const totalRevenue = Object.values(NICHE_REVENUE).reduce((a, b) => a + b, 0)

export default function AdminDashboard() {
  const stats = [
    {
      label: 'Total Revenue',
      value: formatPrice(totalRevenue),
      change: '+12.5%',
      up: true,
      icon: DollarSign,
      bg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Total Orders',
      value: '1,041',
      change: '+8.2%',
      up: true,
      icon: ShoppingBag,
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Total Products',
      value: products.length.toString(),
      change: '+3 this week',
      up: true,
      icon: Package,
      bg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Active Customers',
      value: '3,842',
      change: '-1.4%',
      up: false,
      icon: Users,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, change, up, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
                {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {change}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue by Niche */}
        <div className="xl:col-span-1 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Revenue by Niche</h2>
          </div>
          <div className="space-y-5">
            {niches.map((niche) => {
              const rev = NICHE_REVENUE[niche.id] || 0
              const pct = Math.round((rev / totalRevenue) * 100)
              const barColors: Record<string, string> = {
                cars: 'bg-orange-500',
                animals: 'bg-amber-400',
                kids: 'bg-pink-400',
              }
              return (
                <div key={niche.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{niche.emoji}</span>
                      <span className="text-sm font-semibold text-gray-700">{niche.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{formatPrice(rev)}</span>
                      <span className="text-xs text-gray-400 ml-2">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColors[niche.id]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <a href="/admin/orders" className="text-sm text-indigo-600 font-semibold hover:underline">
              View all
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Order', 'Customer', 'Niche', 'Total', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_ORDERS.map((order) => {
                  const niche = niches.find((n) => n.id === order.niche)
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-semibold text-gray-900">{order.id}</td>
                      <td className="py-3 pr-4 font-medium text-gray-700">{order.customer}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-1.5">
                          <span>{niche?.emoji}</span>
                          <span className="text-gray-600">{niche?.name.split(' ')[0]}</span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-bold text-gray-900">{formatPrice(order.total)}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${STATUS_STYLES[order.status]}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">{order.date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Products by niche quick view */}
      <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900">Inventory Overview</h2>
          <a href="/admin/products" className="text-sm text-indigo-600 font-semibold hover:underline">
            Manage products
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {niches.map((niche) => {
            const nicheProducts = products.filter((p) => p.nicheId === niche.id)
            const lowStock = nicheProducts.filter((p) => p.stock < 10).length
            return (
              <div key={niche.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{niche.emoji}</span>
                  <span className="font-bold text-gray-900">{niche.name}</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Total products</span>
                    <span className="font-bold text-gray-900">{nicheProducts.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Low stock</span>
                    <span className={`font-bold ${lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>{lowStock}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
