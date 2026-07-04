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
  byWilaya:         {
    wilaya:       string
    orders:       number
    revenue:      number
    delivered:    number
    returned:     number
    avgOrder:     number
    deliveryRate: number
    returnRate:   number
  }[]
  byProvider:       { provider: string; count: number }[]
  topProducts:      {
    name:     string
    units:    number
    revenue:  number
    orders:   number
    avgPrice: number
  }[]
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

  // Use the DB-side RPC to avoid fetching every order/order_item into memory.
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
    days_back: daysBack,
  })
  if (error) throw error

  const row = (data ?? [])[0] as Record<string, unknown> | undefined
  if (!row) {
    return {
      totalRevenue: 0, revenueGrowth: 0, totalOrders: 0, ordersGrowth: 0,
      avgOrderValue: 0, deliveryRate: 0, returnRate: 0,
      totalVendors: 0, activeVendors: 0, newVendorsThisMonth: 0,
      totalProducts: 0, activeSubscriptions: 0, mrr: 0,
      monthly: [], byWilaya: [], topVendors: [],
    }
  }

  return {
    totalRevenue:        Number(row.totalRevenue ?? 0),
    revenueGrowth:       Number(row.revenueGrowth ?? 0),
    totalOrders:         Number(row.totalOrders ?? 0),
    ordersGrowth:        Number(row.ordersGrowth ?? 0),
    avgOrderValue:       Number(row.avgOrderValue ?? 0),
    deliveryRate:        Number(row.deliveryRate ?? 0),
    returnRate:          Number(row.returnRate ?? 0),
    totalVendors:        Number(row.totalVendors ?? 0),
    activeVendors:       Number(row.activeVendors ?? 0),
    newVendorsThisMonth: Number(row.newVendorsThisMonth ?? 0),
    totalProducts:       Number(row.totalProducts ?? 0),
    activeSubscriptions: Number(row.activeSubscriptions ?? 0),
    mrr:                 Number(row.mrr ?? 0),
    monthly:             (row.monthly as AdminStats['monthly']) ?? [],
    byWilaya:            (row.byWilaya as AdminStats['byWilaya']) ?? [],
    topVendors:          (row.topVendors as AdminStats['topVendors']) ?? [],
  }
}

// ── Per-vendor analytics (seller dashboard) ────────────────────

export async function getSellerAnalytics(
  vendorId: string,
  daysBack = 30
): Promise<SellerAnalytics> {
  const supabase = createAdminClient()

  // Use the DB-side RPC to avoid fetching every order/order_item into memory.
  const { data, error } = await supabase.rpc('get_seller_analytics', {
    p_vendor_id: vendorId,
    p_days_back: daysBack,
  })
  if (error) throw error

  const result = (data ?? {}) as Record<string, unknown>

  return {
    totalRevenue:      Number(result.totalRevenue ?? 0),
    totalOrders:       Number(result.totalOrders ?? 0),
    pendingOrders:     Number(result.pendingOrders ?? 0),
    confirmedOrders:   Number(result.confirmedOrders ?? 0),
    shippedOrders:     Number(result.shippedOrders ?? 0),
    deliveredOrders:   Number(result.deliveredOrders ?? 0),
    returnedOrders:    Number(result.returnedOrders ?? 0),
    cancelledOrders:   Number(result.cancelledOrders ?? 0),
    avgOrderValue:     Number(result.avgOrderValue ?? 0),
    returnRate:        Number(result.returnRate ?? 0),
    deliveryRate:      Number(result.deliveryRate ?? 0),
    priorRevenue:      Number(result.priorRevenue ?? 0),
    priorOrders:       Number(result.priorOrders ?? 0),
    revenueGrowth:     Number(result.revenueGrowth ?? 0),
    ordersGrowth:      Number(result.ordersGrowth ?? 0),
    projectedRevenue:  Number(result.projectedRevenue ?? 0),
    monthly:           (result.monthly as SellerAnalytics['monthly']) ?? [],
    byDay:             (result.byDay as SellerAnalytics['byDay']) ?? [],
    byWilaya:          (result.byWilaya as SellerAnalytics['byWilaya']) ?? [],
    byProvider:        (result.byProvider as SellerAnalytics['byProvider']) ?? [],
    topProducts:       (result.topProducts as SellerAnalytics['topProducts']) ?? [],
    worstProducts:     (result.worstProducts as SellerAnalytics['worstProducts']) ?? [],
    byDayOfWeek:       (result.byDayOfWeek as SellerAnalytics['byDayOfWeek']) ?? [],
  }
}
