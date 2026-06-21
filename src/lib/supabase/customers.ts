import { createHash } from 'crypto'
import { createAdminClient } from './admin'
import { maskPhone } from '@/lib/utils/mask'

export interface CustomerSummary {
  phoneHash:     string  // SHA-256 first 16 hex — stable opaque ID, never raw phone
  maskedPhone:   string  // 0555****78
  displayName:   string  // from most recent order full_name
  wilaya:        string | null
  orderCount:    number
  lifetimeValue: number
  deliveryRate:  number  // % orders delivered
  lastOrderAt:   string
}

export interface CustomerDetail extends CustomerSummary {
  orders: {
    id:        string
    total:     number
    status:    string
    createdAt: string
    wilaya:    string | null
    city:      string | null
  }[]
}

function phoneToHash(phone: string): string {
  return createHash('sha256')
    .update(phone.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16)
}

// Fetch all distinct order_ids that belong to this vendor, then return those full orders.
// Two-step to avoid the order_items fan-out bug where an order with N vendor items
// would be counted N times if we join order_items → orders directly.
async function getVendorOrders(
  vendorId: string,
  selectCols: string,
): Promise<Record<string, unknown>[]> {
  const admin = createAdminClient()

  const { data: itemRows, error: itemErr } = await admin
    .from('order_items')
    .select('order_id')
    .eq('vendor_id', vendorId)

  if (itemErr || !itemRows?.length) return []

  const orderIds = [...new Set(itemRows.map((r) => r.order_id as string))]

  // Supabase .in() supports up to ~1000 values; for very large vendors split into batches
  const BATCH = 800
  const results: Record<string, unknown>[] = []
  for (let i = 0; i < orderIds.length; i += BATCH) {
    const { data, error } = await admin
      .from('orders')
      .select(selectCols)
      .in('id', orderIds.slice(i, i + BATCH))
    if (!error && data) results.push(...(data as unknown as Record<string, unknown>[]))
  }
  return results
}

export async function getVendorCustomers(vendorId: string): Promise<CustomerSummary[]> {
  type OrderRow = {
    id: string; full_name: string; phone: string
    wilaya: string | null; total: number; status: string; created_at: string
  }

  const orders = (await getVendorOrders(
    vendorId, 'id, full_name, phone, wilaya, total, status, created_at',
  )) as OrderRow[]

  if (!orders.length) return []

  // Aggregate by phone — each order appears exactly once
  const map = new Map<string, { orders: OrderRow[]; name: string }>()
  for (const o of orders) {
    if (!o.phone) continue
    const key = o.phone.trim()
    const existing = map.get(key)
    if (existing) {
      existing.orders.push(o)
    } else {
      map.set(key, { orders: [o], name: o.full_name })
    }
  }

  const summaries: CustomerSummary[] = []
  for (const [phone, { orders: customerOrders, name }] of map) {
    const delivered = customerOrders.filter((o) => o.status === 'delivered').length
    const sorted = [...customerOrders].sort((a, b) => b.created_at.localeCompare(a.created_at))
    summaries.push({
      phoneHash:     phoneToHash(phone),
      maskedPhone:   maskPhone(phone),
      displayName:   name,
      wilaya:        sorted[0]?.wilaya ?? null,
      orderCount:    customerOrders.length,
      lifetimeValue: customerOrders.reduce((s, o) => s + (o.total ?? 0), 0),
      deliveryRate:  customerOrders.length > 0 ? Math.round((delivered / customerOrders.length) * 100) : 0,
      lastOrderAt:   sorted[0]?.created_at ?? '',
    })
  }

  return summaries.sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
}

export async function getCustomerDetail(vendorId: string, phoneHash: string): Promise<CustomerDetail | null> {
  type OrderRow = {
    id: string; full_name: string; phone: string
    wilaya: string | null; city: string | null; total: number; status: string; created_at: string
  }

  const orders = (await getVendorOrders(
    vendorId, 'id, full_name, phone, wilaya, city, total, status, created_at',
  )) as OrderRow[]

  const seenIds = new Set<string>()
  const matchedOrders: OrderRow[] = []
  let displayName = ''
  let maskedPhone = ''
  let wilaya: string | null = null

  for (const o of orders) {
    if (!o.phone || seenIds.has(o.id)) continue
    seenIds.add(o.id)
    if (phoneToHash(o.phone) === phoneHash) {
      matchedOrders.push(o)
      displayName = o.full_name
      maskedPhone = maskPhone(o.phone)
      wilaya = o.wilaya
    }
  }

  if (matchedOrders.length === 0) return null

  const delivered = matchedOrders.filter((o) => o.status === 'delivered').length
  const sorted = [...matchedOrders].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return {
    phoneHash,
    maskedPhone,
    displayName,
    wilaya,
    orderCount:    matchedOrders.length,
    lifetimeValue: matchedOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    deliveryRate:  matchedOrders.length > 0 ? Math.round((delivered / matchedOrders.length) * 100) : 0,
    lastOrderAt:   sorted[0]?.created_at ?? '',
    orders: sorted.map((o) => ({
      id:        o.id,
      total:     o.total,
      status:    o.status,
      createdAt: o.created_at,
      wilaya:    o.wilaya,
      city:      o.city,
    })),
  }
}

// Returns raw phone for vendorId+phoneHash — only called by the reveal endpoint
export async function resolvePhoneByHash(vendorId: string, phoneHash: string): Promise<string | null> {
  const orders = (await getVendorOrders(vendorId, 'phone')) as { phone: string }[]

  const seen = new Set<string>()
  for (const o of orders) {
    if (!o.phone) continue
    const phone = o.phone.trim()
    if (seen.has(phone)) continue
    seen.add(phone)
    if (phoneToHash(phone) === phoneHash) return phone
  }
  return null
}
