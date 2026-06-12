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
  confirmedOrders:  number
  shippedOrders:    number
  deliveredOrders:  number
  returnedOrders:   number
  cancelledOrders:  number
  avgOrderValue:    number
  returnRate:       number
  deliveryRate:     number
  // Prior-period comparison
  priorRevenue:     number
  priorOrders:      number
  revenueGrowth:    number
  ordersGrowth:     number
  projectedRevenue: number
  // Charts
  monthly:          { month: string; revenue: number; orders: number }[]
  byDay:            { date: string; revenue: number; orders: number }[]
  byWilaya:         { wilaya: string; orders: number; revenue: number }[]
  byProvider:       { provider: string; count: number }[]
  topProducts:      { name: string; units: number; revenue: number }[]
  worstProducts:    { name: string; id: string; image?: string }[]
  byDayOfWeek:      { day: string; orders: number; revenue: number }[]
}

export interface AdminStats {
  // Revenue
  totalRevenue:        number
  revenueGrowth:       number
  totalOrders:         number
  ordersGrowth:        number
  avgOrderValue:       number
  deliveryRate:        number
  returnRate:          number
  // Vendors
  totalVendors:        number
  activeVendors:       number
  newVendorsThisMonth: number
  // Products
  totalProducts:       number
  // Subscriptions
  activeSubscriptions: number
  mrr:                 number
  // Charts
  monthly:    { month: string; revenue: number; orders: number }[]
  byWilaya:   { wilaya: string; orders: number; revenue: number }[]
  topVendors: {
    id:           string
    name:         string
    slug:         string
    orders:       number
    revenue:      number
    deliveryRate: number
  }[]
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

  const totalRevenue = monthly.reduce((s: number, m: { revenue: number }) => s + m.revenue, 0)
  const totalOrders  = monthly.reduce((s: number, m: { orders: number }) => s + m.orders, 0)

  return { totalRevenue, totalOrders, monthly, topProducts }
}

// ── COD per-wilaya analytics (admin — migration_006) ───────────

export interface CodWilayaRow {
  wilaya:               string
  total_cod_orders:     number
  collected:            number
  refused:              number
  returned:             number
  unreachable:          number
  pending_cod_orders:   number
  collection_rate_pct:  number | null
  avg_attempts:         number | null
  collected_amount_dzd: number
  lost_amount_dzd:      number
}

export interface CodProviderRow {
  delivery_provider:    string
  total_cod_orders:     number
  collected:            number
  refused:              number
  returned:             number
  collection_rate_pct:  number | null
  collected_amount_dzd: number
  lost_amount_dzd:      number
}

export async function getCodWilayaStats(): Promise<CodWilayaRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_cod_wilaya_stats')
  if (error) throw error
  return (data ?? []) as CodWilayaRow[]
}

export async function getCodProviderStats(): Promise<CodProviderRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_cod_provider_stats')
  if (error) throw error
  return (data ?? []) as CodProviderRow[]
}

// ── Admin dashboard stats ─────────────────────────────────────

export async function getAdminStats(daysBack = 30): Promise<AdminStats> {
  const supabase = createAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const priorStart = new Date()
  priorStart.setDate(priorStart.getDate() - daysBack * 2)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  type OrderRow = {
    id: string
    total: number
    wilaya: string | null
    status: string
    delivery_outcome: string | null
    created_at: string
    order_items: { vendor_id: string | null; subtotal: number }[]
  }

  const [ordersRes, priorOrdersRes, vendorsRes, productsRes, subsRes] =
    await Promise.all([
      supabase
        .from('orders')
        .select('id, total, wilaya, status, delivery_outcome, created_at, order_items(vendor_id, subtotal)')
        .gte('created_at', since.toISOString()),
      supabase
        .from('orders')
        .select('id, total')
        .gte('created_at', priorStart.toISOString())
        .lt('created_at', since.toISOString()),
      supabase
        .from('vendors')
        .select('id, store_name, store_slug, is_active, subscription_status, created_at'),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('vendors')
        .select('subscription_plan_id, subscription_plans(price_dzd)')
        .eq('subscription_status', 'active'),
    ])

  const orders     = (ordersRes.data   ?? []) as unknown as OrderRow[]
  const priorOrds  = (priorOrdersRes.data ?? []) as { id: string; total: number }[]
  const vendors    = (vendorsRes.data   ?? []) as {
    id: string; store_name: string; store_slug: string
    is_active: boolean; subscription_status: string | null; created_at: string
  }[]
  const subs = (subsRes.data ?? []) as unknown as { subscription_plan_id: string | null; subscription_plans: { price_dzd: number } | null }[]

  // Revenue & orders
  const totalRevenue  = orders.reduce((s, o) => s + (o.total ?? 0), 0)
  const totalOrders   = orders.length
  const priorRevenue  = priorOrds.reduce((s, o) => s + (o.total ?? 0), 0)
  const priorOrderCnt = priorOrds.length
  const revenueGrowth = priorRevenue  > 0 ? Math.round(((totalRevenue  - priorRevenue)  / priorRevenue)  * 100) : 0
  const ordersGrowth  = priorOrderCnt > 0 ? Math.round(((totalOrders   - priorOrderCnt) / priorOrderCnt) * 100) : 0
  const avgOrderValue = totalOrders   > 0 ? Math.round(totalRevenue / totalOrders) : 0

  // Delivery / return rates
  const delivered   = orders.filter((o) => o.delivery_outcome === 'delivered').length
  const returned    = orders.filter((o) => o.delivery_outcome === 'returned').length
  const deliveryRate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0
  const returnRate   = totalOrders > 0 ? Math.round((returned  / totalOrders) * 100) : 0

  // Vendors
  const totalVendors        = vendors.length
  const activeVendors       = vendors.filter((v) => v.is_active).length
  const newVendorsThisMonth = vendors.filter((v) => new Date(v.created_at) >= monthStart).length

  // Products
  const totalProducts = productsRes.count ?? 0

  // Subscriptions / MRR
  const activeSubscriptions = subs.length
  const mrr = subs.reduce((s, sub) => s + (sub.subscription_plans?.price_dzd ?? 0), 0)

  // Wilaya breakdown
  const wilayaMap: Record<string, { orders: number; revenue: number }> = {}
  for (const order of orders) {
    if (!order.wilaya) continue
    if (!wilayaMap[order.wilaya]) wilayaMap[order.wilaya] = { orders: 0, revenue: 0 }
    wilayaMap[order.wilaya].orders++
    wilayaMap[order.wilaya].revenue += order.total ?? 0
  }
  const byWilaya = Object.entries(wilayaMap)
    .map(([wilaya, d]) => ({ wilaya, ...d }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 15)

  // Top vendors
  const vendorMap: Record<string, { name: string; slug: string; orders: number; revenue: number; delivered: number }> = {}
  const vendorLookup = new Map(vendors.map((v) => [v.id, v]))
  for (const order of orders) {
    const seenVendors = new Set<string>()
    for (const item of order.order_items ?? []) {
      const vid = item.vendor_id
      if (!vid) continue
      if (!vendorMap[vid]) {
        const v = vendorLookup.get(vid)
        vendorMap[vid] = { name: v?.store_name ?? 'Inconnu', slug: v?.store_slug ?? '', orders: 0, revenue: 0, delivered: 0 }
      }
      vendorMap[vid].revenue += item.subtotal ?? 0
      if (!seenVendors.has(vid)) {
        seenVendors.add(vid)
        vendorMap[vid].orders++
        if (order.delivery_outcome === 'delivered') vendorMap[vid].delivered++
      }
    }
  }
  const topVendors = Object.entries(vendorMap)
    .map(([id, d]) => ({
      id, ...d,
      deliveryRate: d.orders > 0 ? Math.round((d.delivered / d.orders) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Monthly chart
  const months = daysBack <= 31 ? 1 : daysBack <= 93 ? 3 : daysBack <= 186 ? 6 : 12
  const monthlyMap: Record<string, { revenue: number; orders: number }> = {}
  for (const order of orders) {
    const key = new Date(order.created_at).toLocaleString('en', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, orders: 0 }
    monthlyMap[key].revenue += order.total ?? 0
    monthlyMap[key].orders++
  }
  const monthly = Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' })
    return { month: d.toLocaleString('en', { month: 'short' }), ...(monthlyMap[key] ?? { revenue: 0, orders: 0 }) }
  })

  return {
    totalRevenue, revenueGrowth,
    totalOrders, ordersGrowth,
    avgOrderValue, deliveryRate, returnRate,
    totalVendors, activeVendors, newVendorsThisMonth,
    totalProducts,
    activeSubscriptions, mrr,
    monthly, byWilaya, topVendors,
  }
}

// ── Per-vendor analytics (seller dashboard) ────────────────────

export async function getSellerAnalytics(
  vendorId: string,
  daysBack = 30
): Promise<SellerAnalytics> {
  const supabase = createAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const priorStart = new Date()
  priorStart.setDate(priorStart.getDate() - daysBack * 2)

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

  // Fetch current and prior period in parallel
  const [currentRes, priorRes] = await Promise.all([
    supabase
      .from('order_items')
      .select('quantity, subtotal, product_name, orders(id, status, wilaya, delivery_outcome, delivery_provider, created_at)')
      .eq('vendor_id', vendorId)
      .gte('orders.created_at', since.toISOString()),
    supabase
      .from('order_items')
      .select('subtotal, orders(id, created_at)')
      .eq('vendor_id', vendorId)
      .gte('orders.created_at', priorStart.toISOString())
      .lt('orders.created_at', since.toISOString()),
  ])

  const rows      = (currentRes.data ?? []) as unknown as ItemRow[]
  const priorRows = (priorRes.data   ?? []) as unknown as Pick<ItemRow, 'subtotal' | 'orders'>[]

  // ── Current period aggregation ──────────────────────────────
  const orderMap   = new Map<string, { order: ItemRow['orders']; vendorTotal: number }>()
  const productMap: Record<string, { units: number; revenue: number }> = {}
  const wilayaMap:  Record<string, { orders: number; revenue: number }> = {}
  const providerMap: Record<string, number> = {}
  const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const dowMap: Record<number, { orders: number; revenue: number }> = {}
  for (let i = 0; i < 7; i++) dowMap[i] = { orders: 0, revenue: 0 }

  for (const row of rows) {
    const order = row.orders
    if (!order) continue

    if (!orderMap.has(order.id)) orderMap.set(order.id, { order, vendorTotal: 0 })
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

  const allOrders       = Array.from(orderMap.values())
  const totalRevenue    = allOrders.reduce((s, o) => s + o.vendorTotal, 0)
  const totalOrders     = allOrders.length
  const deliveredOrders = allOrders.filter((o) => o.order?.delivery_outcome === 'delivered').length
  const returnedOrders  = allOrders.filter((o) => o.order?.delivery_outcome === 'returned').length
  const cancelledOrders = allOrders.filter((o) => o.order?.status === 'cancelled').length
  const confirmedOrders = allOrders.filter((o) => ['confirmed', 'shipped', 'delivered'].includes(o.order?.status ?? '')).length
  const shippedOrders   = allOrders.filter((o) => ['shipped', 'delivered'].includes(o.order?.status ?? '')).length
  const pendingOrders   = allOrders.filter(
    (o) => !o.order?.delivery_outcome && o.order?.status !== 'cancelled'
  ).length

  for (const { order, vendorTotal } of allOrders) {
    if (!order) continue
    const dow = new Date(order.created_at).getDay()
    dowMap[dow].orders++
    dowMap[dow].revenue += vendorTotal
  }

  // ── Prior period ────────────────────────────────────────────
  const priorOrderMap = new Map<string, number>()
  for (const row of priorRows) {
    const order = row.orders
    if (!order) continue
    priorOrderMap.set(order.id, (priorOrderMap.get(order.id) ?? 0) + row.subtotal)
  }
  const priorRevenue = Array.from(priorOrderMap.values()).reduce((s, v) => s + v, 0)
  const priorOrders  = priorOrderMap.size
  const revenueGrowth = priorRevenue > 0 ? Math.round(((totalRevenue - priorRevenue) / priorRevenue) * 100) : 0
  const ordersGrowth  = priorOrders  > 0 ? Math.round(((totalOrders  - priorOrders)  / priorOrders)  * 100) : 0

  // Projected 30-day revenue at current pace
  const projectedRevenue = daysBack > 0 ? Math.round((totalRevenue / daysBack) * 30) : 0

  // ── Monthly chart ───────────────────────────────────────────
  const months = daysBack <= 31 ? 1 : daysBack <= 93 ? 3 : 6
  const monthlyMap: Record<string, { revenue: number; orders: number }> = {}
  for (const { order, vendorTotal } of allOrders) {
    if (!order) continue
    const key = new Date(order.created_at).toLocaleString('en', { month: 'short', year: '2-digit' })
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, orders: 0 }
    monthlyMap[key].revenue += vendorTotal
    monthlyMap[key].orders++
  }
  const monthly = Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (months - 1 - i))
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' })
    return { month: d.toLocaleString('en', { month: 'short' }), ...(monthlyMap[key] ?? { revenue: 0, orders: 0 }) }
  })

  // ── Per-day chart ───────────────────────────────────────────
  const dayMap: Record<string, { revenue: number; orderIds: Set<string> }> = {}
  for (const { order, vendorTotal } of allOrders) {
    if (!order) continue
    const dateKey = order.created_at.slice(0, 10)
    if (!dayMap[dateKey]) dayMap[dateKey] = { revenue: 0, orderIds: new Set() }
    dayMap[dateKey].revenue += vendorTotal
    dayMap[dateKey].orderIds.add(order.id)
  }
  const byDay = Array.from({ length: Math.min(daysBack, 90) }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (Math.min(daysBack, 90) - 1 - i))
    const dateKey = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })
    const entry = dayMap[dateKey]
    return { date: label, revenue: entry?.revenue ?? 0, orders: entry?.orderIds.size ?? 0 }
  })

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    confirmedOrders,
    shippedOrders,
    deliveredOrders,
    returnedOrders,
    cancelledOrders,
    avgOrderValue: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
    returnRate:    totalOrders ? Math.round((returnedOrders  / totalOrders) * 100) : 0,
    deliveryRate:  totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
    priorRevenue,
    priorOrders,
    revenueGrowth,
    ordersGrowth,
    projectedRevenue,
    monthly,
    byDay,
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
    byDayOfWeek: Object.entries(dowMap).map(([dow, d]) => ({
      day: DAY_NAMES[Number(dow)],
      ...d,
    })),
  }
}
