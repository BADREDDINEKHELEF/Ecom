import { createAdminClient } from './admin'
import { incrementPromoUses } from './promo'

export interface OrderItemRow {
  id:             string
  product_id:     string
  product_name:   string
  product_image:  string | null
  product_price:  number
  quantity:       number
  subtotal:       number
  vendor_id?:     string | null
  selected_color?: string | null
}

export interface OrderRow {
  id:                  string
  full_name:           string
  phone:               string
  wilaya:              string
  city:                string
  address:             string
  payment_method:      string
  status:              string
  subtotal:            number
  shipping_cost:       number
  total:               number
  discount_amount?:    number
  delivery_outcome?:   string | null
  delivery_provider?:  string | null
  yalidine_tracking?:  string | null
  yalidine_label_url?: string | null
  created_at:          string
  order_items?:        OrderItemRow[]
}

export interface CreateOrderInput {
  fullName:           string
  phone:              string
  wilaya:             string
  city:               string
  address:            string
  paymentMethod:      string
  shippingCost:       number
  promoCodeId?:       string
  discountAmount?:    number
  giftCardDeduction?: number
  pointsRedeemed?:    number
  notes?:             string | null
  status?:            string
  isB2B?:             boolean
  companyName?:       string | null
  nif?:               string | null
  nis?:               string | null
  rc?:                string | null
  items: {
    productId:     string
    productName:   string
    productImage:  string
    quantity:      number
    vendorId?:     string | null
    selectedColor?: string | null
  }[]
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
}

/** Returns both 0XXX and 213XXX variants so a lookup never misses due to prefix format */
function phoneVariants(phone: string): string[] {
  const clean = normalizePhone(phone)
  const variants = new Set([clean])
  if (clean.startsWith('0') && clean.length === 10) {
    variants.add('213' + clean.slice(1))
  } else if (clean.startsWith('213') && clean.length === 12) {
    variants.add('0' + clean.slice(3))
  }
  return Array.from(variants)
}

export interface CreateOrderResult {
  id:    string
  total: number
}

/**
 * Creates an order with server-side price and stock validation.
 *
 * Prices are NEVER taken from the client — they are fetched from the
 * database and recalculated here. A malicious client that sends
 * manipulated prices will have them silently overwritten.
 *
 * Stock is checked and decremented atomically: each product update
 * uses WHERE stock >= quantity so concurrent requests cannot over-sell.
 * The DB trigger in migration_005 provides an additional row-level guard.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const supabase = createAdminClient()

  // ── 1. Fetch canonical prices + stock from DB ─────────────────────
  const productIds = input.items.map((i) => i.productId)
  const { data: products, error: priceErr } = await supabase
    .from('products')
    .select('id, price, stock, name, is_active, vendor_id')
    .in('id', productIds)

  if (priceErr) throw new Error('Could not validate products')

  const priceMap = new Map(
    (products ?? []).map((p) => [p.id, { price: p.price, stock: p.stock, name: p.name, isActive: p.is_active, vendorId: p.vendor_id as string | null }])
  )

  // ── 2. Validate and compute server-side subtotals ─────────────────
  let computedSubtotal = 0
  const validatedItems = input.items.map((item) => {
    const product = priceMap.get(item.productId)
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`)
    }
    if (product.isActive === false) {
      throw new Error(`Product "${product.name}" is no longer available`)
    }
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for "${product.name}" (available: ${product.stock})`)
    }
    const subtotal = product.price * item.quantity
    computedSubtotal += subtotal
    return {
      ...item,
      productPrice: product.price,
      subtotal,
    }
  })

  // ── 3. Compute final total (server-side) ──────────────────────────
  // Re-validate promo code against server-computed subtotal to prevent discount manipulation
  let discountAmount = 0
  if (input.promoCodeId) {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('discount_type, discount_value, min_order, max_uses, uses_count, expires_at, is_active')
      .eq('id', input.promoCodeId)
      .single()
    if (
      promo &&
      promo.is_active &&
      !(promo.expires_at && new Date(promo.expires_at) < new Date()) &&
      !(promo.max_uses !== null && promo.uses_count >= promo.max_uses) &&
      computedSubtotal >= (promo.min_order ?? 0)
    ) {
      discountAmount = promo.discount_type === 'percentage'
        ? Math.round((computedSubtotal * promo.discount_value) / 100)
        : Math.min(promo.discount_value, computedSubtotal)
    }
  }

  // Subtract gift card and loyalty points deductions (capped to prevent negative total)
  const giftCardDeduction = Math.max(0, input.giftCardDeduction ?? 0)
  const pointsDeduction   = Math.max(0, input.pointsRedeemed   ?? 0)
  const total = Math.max(0, computedSubtotal + input.shippingCost - discountAmount - giftCardDeduction - pointsDeduction)

  // ── 4. Decrement stock atomically via DB RPC ─────────────────────
  // decrement_product_stock uses SELECT … FOR UPDATE (row-level lock)
  // so concurrent orders for the same product cannot both succeed when
  // only one unit remains. Defined in migration_005_stock_decrement.sql.
  for (const item of validatedItems) {
    const { data: decremented, error: stockErr } = await supabase
      .rpc('decrement_product_stock', {
        p_product_id: item.productId,
        p_quantity:   item.quantity,
      })
    if (stockErr) throw new Error(`Stock reservation failed: ${stockErr.message}`)
    if (!decremented) {
      throw new Error(`Insufficient stock for "${item.productName}"`)
    }
  }

  // ── 5. Insert order ───────────────────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      full_name:       input.fullName,
      phone:           normalizePhone(input.phone),
      wilaya:          input.wilaya,
      city:            input.city,
      address:         input.address,
      payment_method:  input.paymentMethod,
      status:          input.status ?? 'pending',
      subtotal:        computedSubtotal,
      shipping_cost:   input.shippingCost,
      total,
      promo_code_id:   input.promoCodeId ?? null,
      discount_amount: discountAmount,
      notes:           input.notes ?? null,
      is_b2b:          input.isB2B ?? false,
      company_name:    input.companyName ?? null,
      nif:             input.nif ?? null,
      nis:             input.nis ?? null,
      rc:              input.rc ?? null,
    })
    .select('id')
    .single()

  if (orderErr) throw orderErr

  // ── 6. Insert order items ─────────────────────────────────────────
  const { error: itemsErr } = await supabase.from('order_items').insert(
    validatedItems.map((item) => ({
      order_id:      order.id,
      product_id:     item.productId,
      product_name:  item.productName,
      product_image: item.productImage || null,
      product_price: item.productPrice,
      quantity:      item.quantity,
      subtotal:      item.subtotal,
      vendor_id:     item.vendorId ?? priceMap.get(item.productId)?.vendorId ?? null,
      // Only set selected_color when a color was chosen — avoids failing if migration_036 not yet run
      ...(item.selectedColor ? { selected_color: item.selectedColor } : {}),
    }))
  )
  if (itemsErr) throw itemsErr

  // ── 7. Atomically increment promo usage (with row-level lock) ─────
  // The RPC returns false if the promo was maxed out by a concurrent order between
  // our validation (step 3) and this increment. In that race case, correct the
  // already-inserted order by removing the discount.
  if (input.promoCodeId) {
    const promoAccepted = await incrementPromoUses(input.promoCodeId)
    if (!promoAccepted) {
      const correctedTotal = Math.max(0, computedSubtotal + input.shippingCost - giftCardDeduction - pointsDeduction)
      await supabase
        .from('orders')
        .update({ discount_amount: 0, promo_code_id: null, total: correctedTotal })
        .eq('id', order.id)
      return { id: order.id, total: correctedTotal }
    }
  }

  return { id: order.id, total }
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()
  return (data as OrderRow) ?? null
}

export async function getOrdersByPhone(phone: string): Promise<OrderRow[]> {
  const supabase = createAdminClient()
  const variants = phoneVariants(phone)
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .in('phone', variants)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as OrderRow[]
}

/**
 * Paginated order list for admin dashboard.
 * source='admin'  → orders containing at least one item with vendor_id IS NULL (platform products)
 * source='vendor' → orders containing at least one item with vendor_id IS NOT NULL (marketplace)
 * undefined       → all orders
 */
export async function getAllOrders(
  page = 0,
  pageSize = 50,
  source?: 'admin' | 'vendor'
): Promise<{ orders: OrderRow[]; hasMore: boolean }> {
  const supabase = createAdminClient()

  // When filtering by source we first collect matching order IDs from order_items
  let orderIds: string[] | undefined
  if (source === 'admin') {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id')
      .is('vendor_id', null)
    orderIds = [...new Set((items ?? []).map((i: { order_id: string }) => i.order_id))]
  } else if (source === 'vendor') {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id')
      .not('vendor_id', 'is', null)
    orderIds = [...new Set((items ?? []).map((i: { order_id: string }) => i.order_id))]
  }

  const from = page * pageSize
  let q = supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize)  // fetches pageSize+1 rows to detect next page

  if (orderIds !== undefined) {
    if (orderIds.length === 0) return { orders: [], hasMore: false }
    q = q.in('id', orderIds)
  }

  const { data, error } = await q
  if (error) throw error
  const all = (data ?? []) as OrderRow[]
  return {
    orders:  all.slice(0, pageSize),
    hasMore: all.length > pageSize,
  }
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function updateDeliveryOutcome(
  id: string,
  outcome: 'delivered' | 'failed' | 'returned'
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ delivery_outcome: outcome })
    .eq('id', id)
  if (error) throw error
}

export async function updateShippingInfo(
  id: string,
  tracking: string,
  provider: string,
  labelUrl?: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      yalidine_tracking:  tracking,
      delivery_provider:  provider,
      ...(labelUrl ? { yalidine_label_url: labelUrl } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateYalidineTracking(
  id: string,
  tracking: string,
  labelUrl?: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      yalidine_tracking: tracking,
      ...(labelUrl ? { yalidine_label_url: labelUrl } : {}),
    })
    .eq('id', id)
  if (error) throw error
}

// ── Vendor orders ──────────────────────────────────────────────

export interface VendorOrderSummary {
  order:       OrderRow
  items:       OrderItemRow[]
  vendorTotal: number
}

export async function getVendorOrders(
  vendorId: string,
  page = 0,
  pageSize = 50
): Promise<{ summaries: VendorOrderSummary[]; hasMore: boolean }> {
  const supabase = createAdminClient()
  const from = page * pageSize

  // Fetch paginated order_items with only the order columns we actually render
  const { data: items } = await supabase
    .from('order_items')
    .select(
      'id,order_id,product_id,product_name,product_image,product_price,quantity,subtotal,' +
      'orders(id,full_name,phone,wilaya,city,status,total,payment_method,created_at)'
    )
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize)   // fetch pageSize+1 to detect next page

  if (!items) return { summaries: [], hasMore: false }

  const hasMore = items.length > pageSize
  const page_items = items.slice(0, pageSize)

  const grouped = new Map<string, { order: OrderRow; items: OrderItemRow[] }>()
  for (const item of page_items) {
    const order = (item as unknown as Record<string, unknown>).orders as OrderRow
    if (!order) continue
    if (!grouped.has(order.id)) grouped.set(order.id, { order, items: [] })
    grouped.get(order.id)!.items.push(item as unknown as OrderItemRow)
  }

  return {
    summaries: Array.from(grouped.values()).map(({ order, items }) => ({
      order,
      items,
      vendorTotal: items.reduce((s, i) => s + i.subtotal, 0),
    })),
    hasMore,
  }
}

export async function getVendorPendingOrders(vendorId: string): Promise<VendorOrderSummary[]> {
  const supabase = createAdminClient()

  // DB-side filter via RPC (migration_005) — avoids fetching all vendor orders into JS.
  const { data: rows, error } = await supabase
    .rpc('get_vendor_pending_orders', { p_vendor_id: vendorId })

  if (error) throw error
  if (!rows || rows.length === 0) return []

  // Re-group flat RPC rows into VendorOrderSummary shape
  const grouped = new Map<string, { order: OrderRow; items: OrderItemRow[] }>()
  for (const row of rows as Record<string, unknown>[]) {
    const orderId = row.order_id as string
    if (!grouped.has(orderId)) {
      grouped.set(orderId, {
        order: {
          id:             orderId,
          full_name:      row.full_name as string,
          phone:          row.phone as string,
          wilaya:         row.wilaya as string,
          city:           row.city as string,
          address:        '',
          payment_method: '',
          status:         row.order_status as string,
          subtotal:       0,
          shipping_cost:  0,
          total:          row.order_total as number,
          created_at:     row.order_created as string,
        },
        items: [],
      })
    }
    grouped.get(orderId)!.items.push({
      id:            row.item_id as string,
      product_id:    row.product_id as string,
      product_name:  row.product_name as string,
      product_image: row.product_image as string | null,
      product_price: row.product_price as number,
      quantity:      row.quantity as number,
      subtotal:      row.subtotal as number,
    })
  }

  return Array.from(grouped.values()).map(({ order, items }) => ({
    order,
    items,
    vendorTotal: items.reduce((s, i) => s + i.subtotal, 0),
  }))
}

// ── Public tracking (no login — phone-based lookup via secure RPC) ──

export interface TrackingOrder {
  id:               string
  full_name:        string
  wilaya:           string
  city:             string
  status:           string
  total:            number
  delivery_outcome: string | null
  yalidine_tracking: string | null
  delivery_provider: string | null
  created_at:       string
}

export async function getOrdersForTracking(phone: string): Promise<TrackingOrder[]> {
  const supabase = createAdminClient()
  // Use the secure DB function which returns only non-PII tracking fields
  const { data, error } = await supabase.rpc('get_orders_by_phone', {
    customer_phone: normalizePhone(phone),
  })
  if (error) throw error
  return (data ?? []) as TrackingOrder[]
}
