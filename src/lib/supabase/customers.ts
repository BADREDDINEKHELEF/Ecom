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
  // Aggregation pushed to Postgres via RPC to avoid N+1 / full-table scan.
  // The `get_vendor_customers` function groups order_items → orders by phone,
  // computes order_count / lifetime_value / delivery_rate / last_order_at in SQL,
  // and returns one row per distinct customer — never loads raw order history into JS.
  //
  // Required DB function signature:
  //   create or replace function get_vendor_customers(p_vendor_id uuid)
  //   returns table (
  //     phone_hash     text,
  //     masked_phone   text,
  //     display_name   text,
  //     wilaya         text,
  //     order_count    int,
  //     lifetime_value numeric,
  //     delivery_rate  int,
  //     last_order_at  timestamptz
  //   ) language sql stable as $$
  //     select
  //       encode(sha256(lower(trim(o.phone))::bytea), 'hex') as phone_hash,
  //       -- mask built in SQL or delegate to the app after RPC returns
  //       lower(trim(o.phone)) as masked_phone,
  //       (array_agg(o.full_name order by o.created_at desc))[1] as display_name,
  //       (array_agg(o.wilaya   order by o.created_at desc))[1] as wilaya,
  //       count(*)::int                                          as order_count,
  //       sum(o.total)                                          as lifetime_value,
  //       round(
  //         100.0 * count(*) filter (where o.status = 'delivered') / count(*)
  //       )::int                                                as delivery_rate,
  //       max(o.created_at)                                     as last_order_at
  //     from order_items oi
  //     join orders o on o.id = oi.order_id
  //     where oi.vendor_id = p_vendor_id
  //       and o.phone is not null
  //     group by lower(trim(o.phone))
  //     order by max(o.created_at) desc;
  //   $$;
  const admin = createAdminClient()

  const { data, error } = await admin
    .rpc('get_vendor_customers', { p_vendor_id: vendorId })

  if (error || !data?.length) return []

  type RpcRow = {
    phone_hash:     string
    masked_phone:   string
    display_name:   string
    wilaya:         string | null
    order_count:    number
    lifetime_value: number
    delivery_rate:  number
    last_order_at:  string
  }

  return (data as RpcRow[]).map((r) => ({
    phoneHash:     r.phone_hash,
    maskedPhone:   maskPhone(r.masked_phone),  // apply JS mask in case DB returns raw phone
    displayName:   r.display_name,
    wilaya:        r.wilaya,
    orderCount:    r.order_count,
    lifetimeValue: r.lifetime_value,
    deliveryRate:  r.delivery_rate,
    lastOrderAt:   r.last_order_at,
  }))
}

export async function getCustomerDetail(vendorId: string, phoneHash: string): Promise<CustomerDetail | null> {
  // Pushed to Postgres: `get_vendor_customer_detail` filters by vendor_id AND phone hash
  // entirely in SQL, so only the matching customer's orders cross the wire.
  //
  // Required DB function signature:
  //   create or replace function get_vendor_customer_detail(
  //     p_vendor_id  uuid,
  //     p_phone_hash text        -- first 16 hex chars of sha256(lower(trim(phone)))
  //   )
  //   returns table (
  //     order_id     uuid,
  //     full_name    text,
  //     masked_phone text,
  //     wilaya       text,
  //     city         text,
  //     total        numeric,
  //     status       text,
  //     created_at   timestamptz
  //   ) language sql stable as $$
  //     select
  //       o.id          as order_id,
  //       o.full_name,
  //       lower(trim(o.phone)) as masked_phone,
  //       o.wilaya,
  //       o.city,
  //       o.total,
  //       o.status,
  //       o.created_at
  //     from order_items oi
  //     join orders o on o.id = oi.order_id
  //     where oi.vendor_id = p_vendor_id
  //       and left(encode(sha256(lower(trim(o.phone))::bytea), 'hex'), 16) = p_phone_hash
  //     order by o.created_at desc;
  //   $$;
  const admin = createAdminClient()

  const { data, error } = await admin
    .rpc('get_vendor_customer_detail', { p_vendor_id: vendorId, p_phone_hash: phoneHash })

  if (error || !data?.length) return null

  type RpcRow = {
    order_id:     string
    full_name:    string
    masked_phone: string
    wilaya:       string | null
    city:         string | null
    total:        number
    status:       string
    created_at:   string
  }

  const rows = data as RpcRow[]
  const first = rows[0]
  const rawPhone = first.masked_phone          // DB returns lower(trim(phone)); mask in JS
  const maskedPhone = maskPhone(rawPhone)
  const delivered = rows.filter((r) => r.status === 'delivered').length

  return {
    phoneHash,
    maskedPhone,
    displayName:   first.full_name,
    wilaya:        first.wilaya,
    orderCount:    rows.length,
    lifetimeValue: rows.reduce((s, r) => s + (r.total ?? 0), 0),
    deliveryRate:  Math.round((delivered / rows.length) * 100),
    lastOrderAt:   first.created_at,           // already sorted desc by DB
    orders: rows.map((r) => ({
      id:        r.order_id,
      total:     r.total,
      status:    r.status,
      createdAt: r.created_at,
      wilaya:    r.wilaya,
      city:      r.city,
    })),
  }
}

// Returns raw phone for vendorId+phoneHash — only called by the reveal endpoint.
// Uses a targeted RPC so only one row is returned from Postgres instead of loading
// the entire order history into JS memory and scanning it for a hash match.
//
// Required DB function signature:
//   create or replace function resolve_vendor_phone_by_hash(
//     p_vendor_id  uuid,
//     p_phone_hash text        -- first 16 hex chars of sha256(lower(trim(phone)))
//   )
//   returns text              -- the raw phone, or null if not found
//   language sql stable as $$
//     select o.phone
//     from order_items oi
//     join orders o on o.id = oi.order_id
//     where oi.vendor_id = p_vendor_id
//       and left(encode(sha256(lower(trim(o.phone))::bytea), 'hex'), 16) = p_phone_hash
//       and o.phone is not null
//     limit 1;
//   $$;
export async function resolvePhoneByHash(vendorId: string, phoneHash: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .rpc('resolve_vendor_phone_by_hash', { p_vendor_id: vendorId, p_phone_hash: phoneHash })

  if (error || data == null) return null

  // The function returns a scalar text value
  return typeof data === 'string' ? data : null
}
