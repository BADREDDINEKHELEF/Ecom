/**
 * Analytics helpers — safe wrappers around Google Tag (gtag), TikTok (ttq),
 * and the StoreDz first-party pixel (window.__pixel).
 * All calls are no-ops when scripts are blocked (ad blockers) or not configured.
 *
 * Meta Pixel tracking has moved to @/lib/meta/events.
 */

declare global {
  interface Window {
    gtag?:     (...args: unknown[]) => void
    dataLayer?: unknown[]
    __pixel?:  (event: string, meta?: Record<string, unknown>) => void
    ttq?: {
      track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void
      page: () => void
      identify: (params: Record<string, unknown>) => void
    }
  }
}

function _gtag(...args: unknown[]) {
  try { if (typeof window !== 'undefined') window.gtag?.(...args) } catch {}
}
function _pixel(event: string, meta?: Record<string, unknown>) {
  try { if (typeof window !== 'undefined') window.__pixel?.(event, meta) } catch {}
}
function _ttq(event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) {
  try { if (typeof window !== 'undefined') window.ttq?.track(event, params, options) } catch {}
}

// ── Events ─────────────────────────────────────────────────────────────────

export function trackPageView(url: string) {
  _gtag('event', 'page_view', { page_path: url })
  _pixel('PageView', { url })
  try { if (typeof window !== 'undefined') window.ttq?.page() } catch {}
}

export function trackViewContent(product: {
  id:    string
  name:  string
  price: number
}) {
  _gtag('event', 'view_item', {
    currency: 'DZD',
    value:    product.price,
    items: [{ item_id: product.id, item_name: product.name, price: product.price }],
  })
  _pixel('ViewContent', { product_id: product.id, name: product.name, price: product.price, currency: 'DZD' })
  _ttq('ViewContent', { content_id: product.id, content_name: product.name, value: product.price, currency: 'DZD' })
}

export function trackAddToCart(product: {
  id:       string
  name:     string
  price:    number
  quantity: number
}) {
  _gtag('event', 'add_to_cart', {
    currency: 'DZD',
    value:    product.price * product.quantity,
    items: [{
      item_id:   product.id,
      item_name: product.name,
      price:     product.price,
      quantity:  product.quantity,
    }],
  })
  _pixel('AddToCart', {
    product_id: product.id,
    name:       product.name,
    price:      product.price,
    quantity:   product.quantity,
    value:      product.price * product.quantity,
    currency:   'DZD',
  })
  _ttq('AddToCart', { content_id: product.id, content_name: product.name, quantity: product.quantity, value: product.price * product.quantity, currency: 'DZD' })
}

function clientNormalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('213')) return '+' + digits
  if (digits.startsWith('0')) return '+213' + digits.slice(1)
  return '+' + digits
}

export function trackInitiateCheckout(cart: {
  total: number
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  email?: string | null
  phone?: string | null
}) {
  const { total, items, email, phone } = cart
  const normPhone = phone ? clientNormalizePhone(phone) : undefined
  const normEmail = email?.trim().toLowerCase() || undefined

  if (normEmail || normPhone) {
    // GA4 Enhanced Conversions
    _gtag('set', 'user_data', {
      ...(normEmail && { email: normEmail }),
      ...(normPhone && { phone_number: normPhone }),
    })
    // TikTok identify
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.identify({
          ...(normEmail && { email: normEmail }),
          ...(normPhone && { phone_number: normPhone }),
        })
      }
    } catch {}
  }

  _gtag('event', 'begin_checkout', {
    currency: 'DZD',
    value:    total,
    items:    items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity })),
  })
  _ttq('InitiateCheckout', {
    value: total,
    currency: 'DZD',
    contents: items.map(i => ({ content_id: i.id, content_name: i.name, quantity: i.quantity, price: i.price })),
  })
  _pixel('InitiateCheckout', {
    total: total,
    num_items: items.reduce((s, i) => s + i.quantity, 0),
    currency: 'DZD',
    content_ids: items.map(i => i.id),
  })
}

export function trackPurchase(order: {
  transactionId: string
  total:         number
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  email?: string | null
  phone?: string | null
}) {
  const { transactionId, total, items, email, phone } = order
  const normPhone = phone ? clientNormalizePhone(phone) : undefined
  const normEmail = email?.trim().toLowerCase() || undefined

  if (normEmail || normPhone) {
    // GA4 Enhanced Conversions
    _gtag('set', 'user_data', {
      ...(normEmail && { email: normEmail }),
      ...(normPhone && { phone_number: normPhone }),
    })
    // TikTok identify
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        window.ttq.identify({
          ...(normEmail && { email: normEmail }),
          ...(normPhone && { phone_number: normPhone }),
        })
      }
    } catch {}
  }

  _gtag('event', 'purchase', {
    transaction_id: transactionId,
    value:          total,
    currency:       'DZD',
    items: items.map(i => ({
      item_id:   i.id,
      item_name: i.name,
      price:     i.price,
      quantity:  i.quantity,
    })),
  })
  _pixel('Purchase', {
    transaction_id: transactionId,
    total:          total,
    currency:       'DZD',
    num_items:      items.reduce((s, i) => s + i.quantity, 0),
    product_ids:    items.map(i => i.id),
  })
  _ttq(
    'CompletePayment',
    {
      value:    total,
      currency: 'DZD',
      contents: items.map(i => ({ content_id: i.id, content_name: i.name, quantity: i.quantity, price: i.price })),
    },
    { event_id: transactionId },
  )
}
