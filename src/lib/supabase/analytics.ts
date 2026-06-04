import { createAdminClient } from './admin'

export interface AnalyticsData {
  totalRevenue: number
  totalOrders:  number
  monthly:      { month: string; revenue: number; orders: number }[]
  topProducts:  { name: string; sales: number; revenue: number }[]
}

export interface CodStats {
  total:     number
  delivered: number
  failed:    number
  returned:  number
  pending:   number
}

export interface SellerAnalytics {
  totalRevenue:     number
  totalOrders:      number
  pendingOrders:    number
  deliveredOrders:  number
  returnedOrders:   number
  avgOrderValue:    number
  returnRate:       number
  monthly:          { month: string; revenue: number; orders: number }[]
  byWilaya:         { wilaya: string; orders: number; revenue: number }[]
  byProvider:       { provider: string; count: number }[]
  topProducts:      { name: string; units: number; revenue: number }[]
  worstProducts:    { name: string; id: string; image?: string }[]
}

// ── Platform-wide analytics (admin dashboard) ──────────────────

export async function getCodStats(): Promise<CodStats> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_cod_stats')
  if (error) throw error
  const d = data as Record<string, number>
  return {
    total:     d.total     ?? 0,
    delivered: d.delivered ?? 0,
    failed:    d.failed    ?? 0,
    returned:  d.returned  ?? 0,
    pending:   d.pending   ?? 0,
  }
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = createAdminClient()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [revenueRes, topProductsRes] = await Promise.all([
    supabase.rpc('get_monthly_revenue', { months_back: 6 }),
    supabase.rpc('get_top_products', {
      since_date:   sixMonthsAgo.toISOString(),
      result_limit: 5,
    }),
  ])

  if (revenueRes.error) throw revenueRes.error

  const monthly = (revenueRes.data ?? []).map(
    (row: { month_label: string; revenue: number; orders: number }) => ({
      month:   row.month_label,
      revenue: row.revenue,
      orders:  Number(row.orders),
    })
  )

  const topProducts = (topProductsRes.data ?? []).map(
    (row: { product_name: string; total_units: number; total_revenue: number }) => ({
      name:    row.product_name,
      sales:   Number(row.total_units),
      revenue: row.total_revenue,
    })
  )

  const totalRevenue = monthly.reduce((s: number, m: { revenue: number; orders: number; month: string }) => s + m.revenue, 0)
  const totalOrders  = monthly.reduce((s: number, m: { revenue: number; orders: number; month: string }) => s + m.orders, 0)

  return { totalRevenue, totalOrders, monthly, topProducts }
}

// ── Per-vendor analytics (seller dashboard) ────────────────────

export async function getSellerAnalytics(
  vendorId: string,
  daysBack = 30
): Promise<SellerAnalytics> {
  const supabase = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  // Fetch order items with joined order data for this vendor
  const { data: items, error } = await supabase
    .from('order_items')
    .select('quantity, subtotal, product_name, orders(id, status, wilaya, delivery_outcome, delivery_provider, created_at)')
    .eq('vendor_id', vendorId)
    .gte('orders.created_at', since.toISOString())

  if (error) throw error

  type ItemRow = {
    quantity: number
    subtotal: number
    product_name: string
    orders: {
      id: string
      status: string
      wilaya: string | null
      delivery_outcome: string | null
      delivery_provider: string | null
      created_at: string
    } | null
  }

  const rows = (items ?? []) as unknown as ItemRow[]

  const orderMap   = new Map<string, { order: ItemRow['orders']; vendorTotal: number }>()
  const productMap: Record<string, { units: number; revenue: number }> = {}
  const wilayaMap:  Record<string, { orders: number; revenue: number }> = {}
  const providerMap: Record<string, number> = {}

  for (const row of rows) {
    const order = row.orders
    if (!order) continue

    if (!orderMap.has(order.id)) {
      orderMap.set(order.id, { order, vendorTotal: 0 })
    }
    orderMap.get(order.id)!.vendorTotal += row.subtotal

    const pk = row.product_name
    if (!productMap[pk]) productMap[pk] = { units: 0, revenue: 0 }
    productMap[pk].units   += row.quantity
    productMap[pk].revenue += row.subtotal

    if (order.wilaya) {
      if (!wilayaMap[order.wilaya]) wilayaMap[order.wilaya] = { orders: 0, revenue: 0 }
      wilayaMap[order.wilaya].orders++
      wilayaMap[order.wilaya].revenue += row.subtotal
    }

    const prov = order.delivery_provider ?? 'direct'
    providerMap[prov] = (providerMap[prov] ?? 0) + 1
  }

  const allOrders      = Array.from(orderMap.values())
  const totalRevenue   = allOrders.reduce((s, o) => s + o.vendorTotal, 0)
  const totalOrders    = allOrders.length
  const deliveredOrders = allOrders.filter((o) => o.order?.delivery_outcome === 'delivered').length
  const returnedOrders  = allOrders.filter((o) => o.order?.delivery_outcome === 'returned').length
  const pendingOrders   = allOrders.filter(
    (o) => !o.order?.delivery_outcome && o.order?.status !== 'cancelled'
  ).length

  const months = daysBack <= 31 ? 1 : daysBack <= 93 ? 3 : 6
  const monthlyMap: Record<string, { revenue: number; orders: number }> = {}
  for (const { order, vendorTotal } of allOrders) {
    if (!order) continue
    const key = new Date(order.created_at).toLocaleString('en', {
      month: 'short', year: '2-digit',
    })
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, orders: 0 }
    monthlyMap[key].revenue += vendorTotal
    monthlyMap[key].orders++
  }

  const monthly = Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' })
    return {
      month: d.toLocaleString('en', { month: 'short' }),
      ...(monthlyMap[key] ?? { revenue: 0, orders: 0 }),
    }
  })

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    returnedOrders,
    avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    returnRate:    totalOrders ? Math.round((returnedOrders / totalOrders) * 100) : 0,
    monthly,
    byWilaya: Object.entries(wilayaMap)
      .map(([wilaya, d]) => ({ wilaya, ...d }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10),
    byProvider: Object.entries(providerMap)
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count),
    topProducts: Object.entries(productMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    worstProducts: [],
  }
}
