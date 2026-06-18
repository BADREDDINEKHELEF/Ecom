import { ShoppingBag, Users, DollarSign, Award, ArrowUp, ArrowDown, Store, CheckCircle2, XCircle, Crown } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getAnalyticsData } from '@/lib/supabase/analytics'
import { getAllOrders } from '@/lib/supabase/orders'
import { getAllVendors } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerT } from '@/lib/i18n/server'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

async function getDashboardData() {
  const supabase = createAdminClient()

  const [analytics, ordersResult, vendorsResult, totalOrders, uniqueCustomers] =
    await Promise.all([
      getAnalyticsData().catch(() => null),
      getAllOrders(0, 5, 'admin').catch(() => ({ orders: [], hasMore: false })),
      getAllVendors(0, 20).catch(() => ({ vendors: [], hasMore: false })),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .then(({ count }) => count ?? 0),
      supabase
        .from('orders')
        .select('phone')
        .then(({ data }) => new Set((data ?? []).map((r) => r.phone)).size),
    ])

  const monthly = analytics?.monthly ?? []
  const currentMonthRevenue = monthly[monthly.length - 1]?.revenue ?? 0
  const prevMonthRevenue    = monthly[monthly.length - 2]?.revenue ?? 0
  const revenueMoM =
    prevMonthRevenue > 0
      ? Number(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : null

  const currentMonthOrders = monthly[monthly.length - 1]?.orders ?? 0
  const prevMonthOrders    = monthly[monthly.length - 2]?.orders ?? 0
  const ordersMoM =
    prevMonthOrders > 0
      ? Number(((currentMonthOrders - prevMonthOrders) / prevMonthOrders) * 100)
      : null

  return {
    totalRevenue:    analytics?.totalRevenue ?? 0,
    revenueMoM,
    ordersMoM,
    totalOrders,
    uniqueCustomers,
    recentOrders:    ordersResult.orders,
    topProducts:     analytics?.topProducts ?? [],
    vendors:         vendorsResult.vendors,
  }
}

function MoMBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const up = pct >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export default async function AdminDashboard() {
  const t = await getServerT()
  const a = t.admin

  const {
    totalRevenue,
    revenueMoM,
    ordersMoM,
    totalOrders,
    uniqueCustomers,
    recentOrders,
    topProducts,
    vendors,
  } = await getDashboardData()

  const stats = [
    {
      label:     a.revenue,
      value:     formatPrice(totalRevenue),
      badge:     <MoMBadge pct={revenueMoM} />,
      icon:      DollarSign,
      bg:        'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      label:     a.orders,
      value:     totalOrders.toLocaleString('fr-DZ'),
      badge:     <MoMBadge pct={ordersMoM} />,
      icon:      ShoppingBag,
      bg:        'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label:     a.vendors,
      value:     vendors.length.toLocaleString('fr-DZ'),
      badge:     null,
      icon:      Store,
      bg:        'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label:     a.customers,
      value:     uniqueCustomers.toLocaleString('fr-DZ'),
      badge:     null,
      icon:      Users,
      bg:        'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">{a.dashboard}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, badge, icon: Icon, bg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              {badge}
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="xl:col-span-1 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">{a.topVendors}</h2>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{a.noOrders}</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-5 text-center text-xs font-black text-gray-400">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sales} units sold</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0">
                    {formatPrice(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-gray-900">{a.recentOrders}</h2>
            <a href="/admin/orders" className="text-sm text-indigo-600 font-semibold hover:underline">
              {a.viewAll}
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{a.noOrders}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Recent orders">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[a.colOrder, a.colCustomer, a.colWilaya, a.colTotal, a.colStatus, a.colDate].map((h) => (
                      <th key={h} scope="col" className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-semibold text-gray-900 text-xs">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-700 max-w-[120px] truncate">
                        {order.full_name}
                      </td>
                      <td className="py-3 pr-4 text-gray-600 text-xs">{order.wilaya}</td>
                      <td className="py-3 pr-4 font-bold text-gray-900">{formatPrice(order.total)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                            STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 text-xs">
                        {new Date(order.created_at).toLocaleDateString('fr-DZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Vendor List */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">{a.marketplaceVendors}</h2>
          </div>
          <a href="/admin/vendors" className="text-sm text-indigo-600 font-semibold hover:underline">
            {a.viewAll}
          </a>
        </div>
        {vendors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">{a.noVendors}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Vendor list">
              <thead>
                <tr className="border-b border-gray-100">
                  {[a.colStore, a.colWilaya, a.colSubscription, a.colApproval, a.colJoined].map((h) => (
                    <th key={h} scope="col" className="text-left text-xs font-semibold text-gray-500 px-6 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendors.map((v) => {
                  const subCfg: Record<string, { label: string; cls: string }> = {
                    trial:        { label: a.subTrial,   cls: 'bg-blue-100 text-blue-700' },
                    active:       { label: a.subActive,  cls: 'bg-emerald-100 text-emerald-700' },
                    grace_period: { label: a.subGrace,   cls: 'bg-amber-100 text-amber-700' },
                    expired:      { label: a.subExpired, cls: 'bg-red-100 text-red-700' },
                  }
                  const sub = subCfg[v.subscription_status ?? ''] ?? { label: a.subNone, cls: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{v.store_name}</span>
                          <a href={`/store/${v.store_slug}`} target="_blank" rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600 transition-colors">
                            <Crown className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <span className="text-xs text-gray-400">/{v.store_slug}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{v.wilaya ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sub.cls}`}>{sub.label}</span>
                      </td>
                      <td className="px-6 py-3">
                        {v.is_approved
                          ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> {a.approved}</span>
                          : <span className="flex items-center gap-1 text-red-500 text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> {a.pendingApproval}</span>
                        }
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {new Date(v.created_at).toLocaleDateString('fr-DZ')}
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
  )
}
