import { createAdminClient } from './admin'
import type { OrderRow } from './orders'

export interface ShipmentRow {
  id:               string
  order_id:         string
  vendor_id:        string | null
  provider:         string
  tracking_number:  string | null
  label_url:        string | null
  status:           string
  status_detail:    string | null
  wilaya:           string | null
  city:             string | null
  recipient_name:   string | null
  recipient_phone:  string | null
  declared_value:   number
  delivery_cost:    number
  notes:            string | null
  created_at:       string
  updated_at:       string
  delivered_at:     string | null
}

export interface ShipmentEvent {
  id:          number
  shipment_id: string
  status:      string
  detail:      string | null
  location:    string | null
  created_at:  string
}

export async function createShipment(
  shipment: Omit<ShipmentRow, 'id' | 'created_at' | 'updated_at' | 'delivered_at'>
): Promise<ShipmentRow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shipments')
    .insert(shipment)
    .select()
    .single()
  if (error) throw error
  return data as ShipmentRow
}

export async function getShipmentByOrderId(orderId: string): Promise<ShipmentRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('shipments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  return (data as ShipmentRow) ?? null
}

export async function getVendorShipments(
  vendorId: string,
  page = 0,
  pageSize = 50,
  filters?: { status?: string; provider?: string }
): Promise<{ shipments: (ShipmentRow & { orders: OrderRow })[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const from = page * pageSize
  // Fetch one extra row to determine if there's a next page (fixes off-by-one)
  const to = from + pageSize

  let query = supabase
    .from('shipments')
    .select('*, orders(id, full_name, phone, wilaya, city, address, total, status, created_at)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(from, to)  // inclusive, fetches pageSize+1 rows

  if (filters?.status)   query = query.eq('status', filters.status)
  if (filters?.provider) query = query.eq('provider', filters.provider)

  const { data, error } = await query
  if (error) throw error

  const all = (data ?? []) as (ShipmentRow & { orders: OrderRow })[]
  return {
    shipments: all.slice(0, pageSize),
    hasMore:   all.length > pageSize,
  }
}

export async function updateShipmentStatus(
  id: string,
  status: string,
  detail?: string
): Promise<void> {
  const supabase = createAdminClient()
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (detail)            updates.status_detail = detail
  if (status === 'delivered') updates.delivered_at = new Date().toISOString()

  await supabase.from('shipments').update(updates).eq('id', id)
  await supabase.from('shipment_events').insert({
    shipment_id: id,
    status,
    detail: detail ?? null,
  })
}

export async function getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('shipment_events')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ShipmentEvent[]
}
