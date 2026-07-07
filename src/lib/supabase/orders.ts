import { createAdminClient } from './admin'
import { incrementPromoUses } from './promo'
import { redeemPoints, restorePoints } from '@/lib/loyalty'
import { logger } from '@/lib/logger'
import { WILAYA_DATA, ZONE_CONFIG } from '@/lib/data/wilayas'
import { getVendorDeliveryConfig } from './vendors'
import { normalizePhone, getPhoneVariants } from '@/lib/utils/phone'
import { dispatchGetRate } from '@/lib/delivery/dispatch'

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
  email?:              string | null
  wilaya:              string
  city:                string
  address:             string
  payment_method:      string
  status:              string
  subtotal:            number
  shipping_cost:       number
  total:               number
  discount_amount?:    number
  delivery_outcome?:    string | null
  delivery_provider?:   string | null
  yalidine_tracking?:   string | null
  yalidine_label_url?:  string | null
  procolis_tracking?:   string | null
  procolis_label_url?:  string | null
  zr_tracking?:         string | null
  zr_label_url?:        string | null
  colivraison_tracking?: string | null
  colivraison_label_url?: string | null
  maystro_tracking?:    string | null
  maystro_label_url?:   string | null
  rex_tracking?:        string | null
  rex_label_url?:       string | null
  is_stopdesk?:         boolean
  stop_desk_cause?:     string | null
  points_redeemed?:     number
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
  userId?:            string | null
  promoCodeId?:       string
  discountAmount?:    number
  giftCardCode?:      string
  pointsRedeemed?:    number
  notes?:             string | null
  status?:            string
  isB2B?:             boolean
  companyName?:       string | null
  nif?:               string | null
  nis?:               string | null
  rc?:                string | null
  isStopDesk?:        boolean
  deliveryType?:      'home' | 'office' | 'stop_desk'
  stopDeskCause?:     string | null
  email?:             string | null
  idempotencyKey?:    string | null
  items: {
    productId:     string
    productName:   string
    productImage:  string
    quantity:      number
    vendorId?:     string | null
    selectedColor?: string | null
  }[]
}

export interface CreateOrderResult {
  id:                string
  total:             number
  giftCardDeduction: number
  /** True when the order already existed and was looked up via idempotency_key. */
  isDuplicate?:      boolean
  /** Items that were committed to the order. Used for rollback if payment fails. */
  items:             {
    productId:     string
    productName:   string
    productImage:  string
    quantity:      number
    productPrice?: number
    vendorId?:     string | null
    selectedColor?: string | null
  }[]
  giftCardCode?:     string
  promoCodeId?:      string | null
  discountAmount?:   number
}

/**
 * Returns the authoritative shipping cost for an order.
 * Tries the vendor's live delivery provider rate first (same source as /api/delivery/rates),
 * then falls back to static zone pricing so the server always agrees with the checkout display.
 */
function staticZoneCost(wilaya: string, subtotal: number, isStopDesk?: boolean): number {
  const zone = WILAYA_DATA[wilaya]?.zone ?? 3
  const zoneCfg = ZONE_CONFIG[zone]
  const staticHomeCost = subtotal >= zoneCfg.freeFrom ? 0 : zoneCfg.cost
  const staticDeskCost = staticHomeCost === 0 ? 0 : Math.max(150, staticHomeCost - 200)
  return isStopDesk ? staticDeskCost : staticHomeCost
}

async function getVendorLiveShippingRate(
  vendorId: string,
  wilaya: string,
  isStopDesk?: boolean
): Promise<number | null> {
  try {
    const config = await getVendorDeliveryConfig(vendorId)
    if (!config) return null
    const provider = config.default_provider ?? 'yalidine'
    const rate = await dispatchGetRate(provider, wilaya, config, true)
    if (!rate) return null
    return (isStopDesk && rate.deskDelivery != null) ? rate.deskDelivery : rate.homeDelivery
  } catch {
    return null
  }
}

async function resolveShippingCost(
  wilaya: string,
  subtotal: number,
  items: (CreateOrderInput['items'][number] & { productPrice?: number })[],
  isStopDesk?: boolean,
): Promise<number> {
  const vendorIds = Array.from(new Set(items.map((i) => i.vendorId).filter((v): v is string => typeof v === 'string' && v.length > 0)))

  // No vendor info — fall back to a single static rate for the whole cart.
  if (vendorIds.length === 0) {
    return staticZoneCost(wilaya, subtotal, isStopDesk)
  }

  // Single vendor — existing behaviour: use the vendor's live rate if available.
  if (vendorIds.length === 1) {
    const vendorId = vendorIds[0]
    const liveRate = await getVendorLiveShippingRate(vendorId, wilaya, isStopDesk)
    return liveRate ?? staticZoneCost(wilaya, subtotal, isStopDesk)
  }

  // Multi-vendor cart: sum per-vendor shipping. Each vendor's share is based on
  // the subtotal of their items so free-shipping thresholds apply per vendor.
  // This is a best-effort calculation; true marketplace shipping usually splits
  // the order into one shipment (and one order) per vendor.
  let totalShipping = 0
  for (const vendorId of vendorIds) {
    const vendorItems = items.filter((i) => i.vendorId === vendorId)
    const vendorSubtotal = vendorItems.reduce(
      (s, i) => s + (i.productPrice ?? 0) * i.quantity,
      0
    )
    const liveRate = await getVendorLiveShippingRate(vendorId, wilaya, isStopDesk)
    totalShipping += liveRate ?? staticZoneCost(wilaya, vendorSubtotal, isStopDesk)
  }
  return totalShipping
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
      vendorId: product.vendorId,
      subtotal,
    }
  })

  // Derive the order's owning vendor from cart items. Single-vendor checkout is
  // the current model; log if the cart unexpectedly spans multiple vendors so
  // storefront stats (which count orders by vendor_id) stay accurate.
  const vendorIds = Array.from(new Set(validatedItems.map(i => i.vendorId).filter(Boolean)))
  const primaryVendorId = vendorIds[0] || null
  if (vendorIds.length > 1) {
    console.warn('[createOrder] multi-vendor cart detected; using first vendor_id', { vendorIds })
  }

  // ── 3. Compute final total (server-side) ──────────────────────────
  // Re-validate promo code against server-computed subtotal to prevent discount manipulation
  let discountAmount = 0
  if (input.promoCodeId) {
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('discount_type, discount_value, min_order, max_uses, uses_count, expires_at, is_active, one_per_buyer')
      .eq('id', input.promoCodeId)
      .single()
    if (
      promo &&
      promo.is_active &&
      !(promo.expires_at && new Date(promo.expires_at) < new Date()) &&
      !(promo.max_uses !== null && promo.uses_count >= promo.max_uses) &&
      computedSubtotal >= (promo.min_order ?? 0)
    ) {
      // Enforce one-per-buyer: authenticated user_id when available, otherwise phone/email.
      if (promo.one_per_buyer) {
        const normalizedPhone = normalizePhone(input.phone)
        let usedOrder: { id: string } | null = null
        if (input.userId) {
          const { data } = await supabase
            .from('orders')
            .select('id')
            .eq('promo_code_id', input.promoCodeId)
            .eq('user_id', input.userId)
            .limit(1)
            .maybeSingle()
          usedOrder = data
        } else {
          const orFilters = [`phone.eq.${normalizedPhone}`]
          if (input.email) orFilters.push(`email.eq.${input.email.toLowerCase()}`)
          const { data } = await supabase
            .from('orders')
            .select('id')
            .eq('promo_code_id', input.promoCodeId)
            .or(orFilters.join(','))
            .limit(1)
            .maybeSingle()
          usedOrder = data
        }
        if (usedOrder) {
          throw new Error(`Promo code already used`)
        }
      }

      discountAmount = promo.discount_type === 'percentage'
        ? Math.round((computedSubtotal * promo.discount_value) / 100)
        : Math.min(promo.discount_value, computedSubtotal)
    }
  }

  // ── 3b. Claim promo code slot BEFORE touching stock ─────────────────
  // Incrementing here (instead of after order insert) eliminates the TOCTOU
  // window where two concurrent orders could both pass the uses_count check
  // above and both apply the same single-use discount. If the RPC returns false
  // the promo was consumed by a concurrent request — drop the discount cleanly
  // before any stock is decremented or an order row is created.
  if (input.promoCodeId && discountAmount > 0) {
    const promoAccepted = await incrementPromoUses(input.promoCodeId)
    if (!promoAccepted) {
      discountAmount = 0   // code was maxed out between validation and increment
    }
  }

  // BUGFIX (C-01): Compute shipping server-side to prevent client-side manipulation.
  const shippingCost = await resolveShippingCost(input.wilaya, computedSubtotal, validatedItems, input.isStopDesk)

  // Guests are not allowed to earn or redeem loyalty points. If a guest payload
  // includes pointsRedeemed we ignore it instead of giving a discount they did not earn.
  const pointsRequested = Math.max(0, input.pointsRedeemed ?? 0)
  const pointsDeduction = input.userId ? pointsRequested : 0
  if (pointsRequested > 0 && !input.userId) {
    console.warn('[createOrder] guest checkout attempted points redemption — ignored')
  }
  const subtotalAfterDiscounts = computedSubtotal + shippingCost - discountAmount - pointsDeduction

  // Server-side gift card validation and atomic deduction (Bug-2 fix).
  // We call claim_gift_card RPC which executes:
  //   UPDATE gift_cards SET balance = balance - $amount
  //   WHERE code = $code AND balance >= $amount AND is_active AND (expires_at IS NULL OR expires_at > now())
  // and returns the actual amount deducted (0 if the card could not cover it or is invalid).
  // This eliminates the TOCTOU race where two concurrent checkouts could both read the same
  // positive balance and each apply the full deduction.
  let giftCardDeduction = 0
  if (input.giftCardCode && subtotalAfterDiscounts > 0) {
    // First read to determine deduction amount (still needed to compute total before claiming)
    const { data: gc } = await supabase
      .from('gift_cards')
      .select('balance, is_active, expires_at')
      .eq('code', input.giftCardCode)
      .single()

    if (gc && gc.is_active && (!gc.expires_at || new Date(gc.expires_at) > new Date()) && gc.balance > 0) {
      const tentativeDeduction = Math.min(gc.balance, subtotalAfterDiscounts)
      // Atomically claim the gift card balance — only succeeds if balance is still sufficient
      const { data: claimed, error: gcErr } = await supabase.rpc('claim_gift_card', {
        p_code: input.giftCardCode,
        p_amount: tentativeDeduction,
      })
      if (!gcErr && claimed) {
        giftCardDeduction = tentativeDeduction
      }
      // If claim failed (concurrent redemption beat us), giftCardDeduction stays 0
    }
  }

  const total = Math.max(0, subtotalAfterDiscounts - giftCardDeduction)

  // ── 4. Decrement stock atomically via DB RPC ─────────────────────
  // decrement_product_stocks reserves stock for all items in a single DB round-trip.
  // It returns per-item success/failure so we can roll back any successful
  // decrements if one item fails (e.g. last-unit race).
  const stockItems = validatedItems.map((item) => ({ productId: item.productId, quantity: item.quantity }))
  const decrementedItems: Array<{ productId: string; quantity: number }> = []

  const { data: stockResult, error: stockErr } = await supabase.rpc('decrement_product_stocks', {
    items: stockItems,
  })
  if (stockErr) {
    throw new Error(`Stock reservation failed: ${stockErr.message}`)
  }

  type StockResultItem = { productId: string; ok: boolean; reason?: string; available?: number }
  const results = (stockResult as StockResultItem[] | null) ?? []
  const failedItems = results.filter((r) => !r.ok)

  if (failedItems.length > 0) {
    // Roll back successful decrements so we don't leave stock reserved for a failed order.
    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.productId))
    const itemsToRestore = stockItems.filter((item) => succeededIds.has(item.productId))
    if (itemsToRestore.length > 0) {
      await supabase.rpc('restore_product_stocks', { items: itemsToRestore }).then(({ error }) => {
        if (error) console.error('[createOrder] batch stock rollback failed:', error)
      })
    }

    const firstFail = failedItems[0]
    const failedProduct = validatedItems.find((i) => i.productId === firstFail.productId)
    const productName = failedProduct?.productName ?? firstFail.productId
    throw new Error(
      firstFail.reason === 'not_found'
        ? `Product not found: ${productName}`
        : `Insufficient stock for "${productName}"`
    )
  }

  // All items reserved successfully.
  decrementedItems.push(...stockItems)

  // Atomically restore all decremented stock using an RPC. This is critical
  // to prevent race conditions if order creation fails after stock is reserved.
  // Bug-1 fix: check restoreStock() result and log failures to a dead-letter table.
  // Bug-9 fix: also roll back promo use count so a failed order does not consume a promo slot.
  async function restoreStock(opts?: { skipStock?: boolean }) {
    if (decrementedItems.length === 0 && !(input.giftCardCode && giftCardDeduction > 0)) return
    if (decrementedItems.length > 0 && !opts?.skipStock) {
      const { error: restoreErr } = await supabase.rpc('restore_product_stocks', { items: decrementedItems })
      if (restoreErr) {
        // Log to dead-letter table so ops can manually correct permanently over-decremented stock.
        await supabase.from('failed_stock_restores').insert({
          items: decrementedItems,
          error: restoreErr.message,
          created_at: new Date().toISOString(),
        }).then(() => {/* best-effort dead-letter write */})
        console.error('[createOrder] restoreStock failed — stock may be permanently over-decremented:', restoreErr)
      }
    }
    // Roll back promo use increment so tight-use-limit promos are not permanently consumed
    // when no order was created. This is best-effort — log if it fails.
    if (input.promoCodeId && discountAmount > 0) {
      const { error: promoRollbackErr } = await supabase.rpc('decrement_promo_uses', {
        p_promo_id: input.promoCodeId,
      })
      if (promoRollbackErr) {
        console.error('[createOrder] promo use rollback failed — promo slot may be permanently consumed:', promoRollbackErr)
      }
    }
    // Roll back gift-card claim so a failed order does not permanently consume balance.
    // This is best-effort — log if it fails.
    if (input.giftCardCode && giftCardDeduction > 0) {
      const { error: gcRollbackErr } = await supabase.rpc('restore_gift_card', {
        p_code: input.giftCardCode,
        p_amount: giftCardDeduction,
      })
      if (gcRollbackErr) {
        console.error('[createOrder] gift-card rollback failed — balance may be permanently consumed:', gcRollbackErr)
      }
    }
  }

  // ── 5. Insert order ───────────────────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      full_name:        input.fullName,
      phone:            normalizePhone(input.phone),
      wilaya:           input.wilaya,
      city:             input.city,
      address:          input.address,
      payment_method:   input.paymentMethod,
      status:           input.status ?? 'pending',
      subtotal:         computedSubtotal,
      shipping_cost:    shippingCost, // Use server-calculated value
      total,
      promo_code_id:    input.promoCodeId ?? null,
      discount_amount:  discountAmount,
      notes:            input.notes ?? null,
      vendor_id:        primaryVendorId,
      is_b2b:           input.isB2B ?? false,
      company_name:     input.companyName ?? null,
      nif:              input.nif ?? null,
      nis:              input.nis ?? null,
      rc:               input.rc ?? null,
      is_stopdesk:      input.isStopDesk ?? (input.deliveryType === 'stop_desk'),
      delivery_type:    input.deliveryType ?? 'home',
      stop_desk_cause:  input.stopDeskCause ?? null,
      points_redeemed:  pointsDeduction,
      ...(input.email ? { email: input.email } : {}),
      ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
    })
    .select('id')
    .single()

  if (orderErr) {
    // Idempotency: Postgres unique violation on idempotency_key (code 23505).
    // Look up the existing order and return it without touching stock or promos.
    if (orderErr.code === '23505' && input.idempotencyKey) {
      await restoreStock()
      const { data: existing } = await supabase
        .from('orders')
        .select('id, total')
        .eq('idempotency_key', input.idempotencyKey)
        .single()
      if (existing) {
        return { id: existing.id, total: existing.total, giftCardDeduction: 0, isDuplicate: true, items: [] }
      }
    }
    await restoreStock()
    throw orderErr
  }

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
  if (itemsErr) {
    await restoreStock()
    throw itemsErr
  }

  // ── 7. Redeem loyalty points (bound to this order) ─────────────────
  // Deduct points only after the order row and items are committed. If the
  // deduction fails (stale balance, concurrency), cancel the order and roll
  // back everything else so the customer is not charged twice.
  if (pointsDeduction > 0 && input.userId) {
    const redeemed = await redeemPoints(input.userId, pointsDeduction, order.id)
    if (!redeemed) {
      // Roll back promo/gift-card but leave stock for the cancellation trigger.
      await restoreStock({ skipStock: true })
      await supabase
        .from('orders')
        .update({ status: 'cancelled', payment_status: 'failed' })
        .eq('id', order.id)
      throw new Error('Loyalty points redemption failed')
    }
  }

  return {
    id: order.id,
    total,
    giftCardDeduction,
    items: validatedItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      productPrice: item.productPrice,
      vendorId: item.vendorId,
      selectedColor: item.selectedColor,
    })),
    giftCardCode: input.giftCardCode,
    promoCodeId: input.promoCodeId ?? null,
    discountAmount,
  }
}

/**
 * Cancels an order and best-effort restores gift-card balance and promo uses.
 * Stock is restored automatically by the `trg_restore_stock_on_cancel` trigger,
 * so we must NOT call restore_product_stocks here to avoid double-restoring.
 * Used when payment gateway registration fails after an order was created.
 */
export async function cancelOrderAndRollback(
  orderId: string,
  options: {
    giftCardCode?: string
    giftCardDeduction?: number
    promoCodeId?: string | null
  }
) {
  const supabase = createAdminClient()

  // 0. Capture buyer context before the order is mutated.
  const { data: orderCtx, error: ctxErr } = await supabase
    .from('orders')
    .select('user_id, points_redeemed')
    .eq('id', orderId)
    .single()
  if (ctxErr) {
    console.error('[cancelOrderAndRollback] failed to read order context', { orderId, error: ctxErr })
  }

  // 1. Mark order cancelled only if it is still pending_payment (idempotent).
  // The trg_restore_stock_on_cancel trigger will restore product stock.
  const { error: cancelErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
  if (cancelErr) {
    console.error('[cancelOrderAndRollback] failed to cancel order', { orderId, error: cancelErr })
    throw cancelErr
  }

  // 2. Restore gift-card balance.
  if (options.giftCardCode && (options.giftCardDeduction ?? 0) > 0) {
    const { error: gcErr } = await supabase.rpc('restore_gift_card', {
      p_code: options.giftCardCode,
      p_amount: options.giftCardDeduction,
    })
    if (gcErr) {
      console.error('[cancelOrderAndRollback] gift-card restore failed', { orderId, error: gcErr })
    }
  }

  // 3. Roll back promo uses.
  if (options.promoCodeId) {
    const { error: promoErr } = await supabase.rpc('decrement_promo_uses', {
      p_promo_id: options.promoCodeId,
    })
    if (promoErr) {
      console.error('[cancelOrderAndRollback] promo rollback failed', { orderId, error: promoErr })
    }
  }

  // 4. Restore loyalty points if the order had redeemed any.
  const pointsRedeemed = orderCtx?.points_redeemed ?? 0
  if (pointsRedeemed > 0 && orderCtx?.user_id) {
    await restorePoints(orderCtx.user_id as string, Number(pointsRedeemed), orderId)
  }
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  const supabase = createAdminClient()
  // Bug-4 fix: explicit column lists instead of double wildcard to avoid over-fetching
  // sensitive/large columns and to make schema changes explicit.
  const { data } = await supabase
    .from('orders')
    .select(
      'id,full_name,phone,email,wilaya,city,address,payment_method,status,' +
      'subtotal,shipping_cost,total,discount_amount,delivery_outcome,delivery_provider,' +
      'yalidine_tracking,yalidine_label_url,procolis_tracking,procolis_label_url,' +
      'zr_tracking,zr_label_url,colivraison_tracking,colivraison_label_url,' +
      'maystro_tracking,maystro_label_url,rex_tracking,rex_label_url,' +
      'is_stopdesk,stop_desk_cause,points_redeemed,created_at,' +
      'order_items(id,product_id,product_name,product_image,product_price,quantity,subtotal,vendor_id,selected_color)'
    )
    .eq('id', id)
    .single()
  return (data as unknown as OrderRow) ?? null
}

export async function getOrdersByPhone(phone: string): Promise<OrderRow[]> {
  const supabase = createAdminClient()
  const variants = getPhoneVariants(normalizePhone(phone))
  const { data, error } = await supabase
    .from('orders')
    .select('id,full_name,phone,wilaya,city,address,status,total,delivery_outcome,yalidine_tracking,procolis_tracking,zr_tracking,colivraison_tracking,maystro_tracking,rex_tracking,delivery_provider,is_stopdesk,payment_method,created_at,order_items(id,product_name,quantity,subtotal,product_image,product_price)')
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

  const EXPLICIT_ORDER_COLS = 'id,full_name,phone,email,wilaya,city,address,payment_method,status,' +
    'subtotal,shipping_cost,total,discount_amount,delivery_outcome,delivery_provider,' +
    'yalidine_tracking,yalidine_label_url,procolis_tracking,procolis_label_url,' +
    'zr_tracking,zr_label_url,colivraison_tracking,colivraison_label_url,' +
    'maystro_tracking,maystro_label_url,rex_tracking,rex_label_url,' +
    'is_stopdesk,stop_desk_cause,points_redeemed,created_at'
  const EXPLICIT_ITEM_COLS = 'id,product_id,product_name,product_image,product_price,quantity,subtotal,vendor_id,selected_color'

  const from = page * pageSize

  // Bug-3 fix: push source-filter into Postgres using !inner join instead of a two-step
  // JS-side IN-list (which breaks on large stores and discards pagination accuracy).
  // Bug-5 fix: use explicit column lists instead of double wildcards.
  // Bug-3 & Bug-5: build query branch then await once.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any

  if (source === 'admin') {
    // Orders that have at least one item with vendor_id IS NULL
    q = supabase
      .from('orders')
      .select(`${EXPLICIT_ORDER_COLS},order_items!inner(${EXPLICIT_ITEM_COLS})`)
      .is('order_items.vendor_id', null)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize)
  } else if (source === 'vendor') {
    // Orders that have at least one item with vendor_id IS NOT NULL
    q = supabase
      .from('orders')
      .select(`${EXPLICIT_ORDER_COLS},order_items!inner(${EXPLICIT_ITEM_COLS})`)
      .not('order_items.vendor_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize)
  } else {
    q = supabase
      .from('orders')
      .select(`${EXPLICIT_ORDER_COLS},order_items(${EXPLICIT_ITEM_COLS})`)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize)
  }

  const { data, error } = await q
  if (error) throw error
  const all = (data ?? []) as OrderRow[]
  return {
    orders:  all.slice(0, pageSize),
    hasMore: all.length > pageSize,
  }
}

// Bug-7 fix: narrow status to a union type so invalid status strings are caught at compile time.
export async function updateOrderStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * Vendor-scoped order status update.
 * Unlike the bare updateOrderStatus, this helper re-verifies ownership at the
 * DB write level: it first resolves the order through order_items filtered by
 * both order_id AND vendor_id, then performs the status update only for that
 * confirmed order id.  If the vendor does not own the order the function throws
 * before any write is attempted, making the DB mutation itself scoped rather
 * than relying solely on a pre-flight read in the caller.
 */
export async function updateVendorOrderStatus(
  orderId: string,
  vendorId: string,
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
): Promise<void> {
  const supabase = createAdminClient()

  // Re-confirm ownership inside the write path: resolve orderId only when the
  // vendor actually owns an item in that order.
  const { data: item, error: ownerErr } = await supabase
    .from('order_items')
    .select('order_id')
    .eq('order_id', orderId)
    .eq('vendor_id', vendorId)
    .limit(1)
    .single()

  if (ownerErr || !item) {
    throw new Error(`Vendor ${vendorId} does not own order ${orderId}`)
  }

  // Read current status to enforce a safe state machine.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('status, payment_status')
    .eq('id', item.order_id)
    .single()
  if (orderErr || !order) {
    throw new Error(`Commande introuvable: ${orderId}`)
  }
  const currentStatus = order.status

  // State-machine guards. Sellers may not cancel orders that are already paid
  // or have progressed past pending, to avoid un-refunded cancellations.
  if (status === 'cancelled') {
    if (['cancelled', 'delivered', 'returned'].includes(currentStatus)) {
      throw new Error('Cette commande ne peut plus être annulée.')
    }
    if (order.payment_status === 'paid') {
      throw new Error('Les commandes payées ne peuvent être annulées que par un administrateur.')
    }
  }
  // Prevent nonsensical backward transitions.
  if (currentStatus === 'delivered' && status !== 'returned') {
    throw new Error('Une commande livrée ne peut être modifiée que vers retournée.')
  }
  if (currentStatus === 'returned') {
    throw new Error('Une commande retournée ne peut plus changer de statut.')
  }

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', item.order_id)
  if (error) throw error
}

export async function recordFinancialTransaction(params: {
  orderId: string
  amount: number
  currency?: string
  statusBefore?: string | null
  statusAfter?: string
  paymentStatusBefore?: string | null
  paymentStatusAfter?: string
  paymentMethod?: string | null
  gatewayRef?: string | null
  reason?: string
}): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('record_financial_transaction', {
    p_order_id: params.orderId,
    p_amount: params.amount,
    p_currency: params.currency ?? 'DZD',
    p_status_before: params.statusBefore ?? null,
    p_status_after: params.statusAfter,
    p_payment_status_before: params.paymentStatusBefore ?? null,
    p_payment_status_after: params.paymentStatusAfter,
    p_payment_method: params.paymentMethod ?? null,
    p_gateway_ref: params.gatewayRef ?? null,
    p_reason: params.reason ?? '',
  })
  if (error) {
    logger.error('[recordFinancialTransaction] failed', { orderId: params.orderId, error: error.message })
  }
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

// Bug-6 & Bug-8 fix: allowlist valid delivery providers to prevent dynamic column-name injection.
// Without this guard a caller passing provider='status' would overwrite the orders.status column.
const VALID_PROVIDERS = new Set(['yalidine', 'procolis', 'zr', 'colivraison', 'maystro', 'rex'] as const)
type DeliveryProvider = 'yalidine' | 'procolis' | 'zr' | 'colivraison' | 'maystro' | 'rex'

export async function updateShippingInfo(
  id: string,
  tracking: string,
  provider: DeliveryProvider | string,
  labelUrl?: string
): Promise<void> {
  if (!VALID_PROVIDERS.has(provider as DeliveryProvider)) {
    throw new Error(`Invalid delivery provider: "${provider}". Must be one of: ${[...VALID_PROVIDERS].join(', ')}`)
  }
  const supabase = createAdminClient()
  const trackingColumn = `${provider}_tracking`
  const labelColumn = `${provider}_label_url`
  const update: Record<string, unknown> = {
    [trackingColumn]: tracking,
    delivery_provider: provider,
  }
  if (labelUrl) {
    update[labelColumn] = labelUrl
  }
  const { error } = await supabase
    .from('orders')
    .update(update)
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
      'orders(id,full_name,phone,wilaya,city,address,delivery_type,is_stopdesk,status,total,payment_method,created_at)'
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
