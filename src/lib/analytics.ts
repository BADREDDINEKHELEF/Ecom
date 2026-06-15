/**
 * Analytics helpers — safe wrappers around Meta Pixel (fbq), Google Tag (gtag),
 * and the ShopDZ first-party pixel (window.__pixel).
 * All calls are no-ops when scripts are blocked (ad blockers) or not configured.
 */

declare global {
  interface Window {
    fbq?:      (...args: unknown[]) => void
    gtag?:     (...args: unknown[]) => void
    dataLayer?: unknown[]
    __pixel?:  (event: string, meta?: Record<string, unknown>) => void
    ttq?:      { track: (event: string, params?: Record<string, unknown>) => void; page: () => void }
  }
}

function _fbq(...args: unknown[]) {
  try { if (typeof window !== 'undefined') window.fbq?.(...args) } catch {}
}
function _gtag(...args: unknown[]) {
  try { if (typeof window !== 'undefined') window.gtag?.(...args) } catch {}
}
function _pixel(event: string, meta?: Record<string, unknown>) {
  try { if (typeof window !== 'undefined') window.__pixel?.(event, meta) } catch {}
}
function _ttq(event: string, params?: Record<string, unknown>) {
  try { if (typeof window !== 'undefined') window.ttq?.track(event, params) } catch {}
}

// ── Events ─────────────────────────────────────────────────────────────────

export function trackPageView(url: string) {
  _fbq('track', 'PageView')
  _gtag('event', 'page_view', { page_path: url })
  _pixel('PageView', { url })
  try { if (typeof window !== 'undefined') window.ttq?.page() } catch {}
}

export function trackViewContent(product: {
  id:    string
  name:  string
  price: number
}) {
  _fbq('track', 'ViewContent', {
    content_ids:  [product.id],
    content_name: product.name,
    content_type: 'product',
    value:        product.price,
    currency:     'DZD',
  })
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
  _fbq('track', 'AddToCart', {
    content_ids:  [product.id],
    content_name: product.name,
    content_type: 'product',
    value:        product.price * product.quantity,
    currency:     'DZD',
  })
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

export function trackPurchase(order: {
  transactionId: string
  total:         number
  items: Array<{ id: string; name: string; price: number; quantity: number }>
}) {
  _fbq('track', 'Purchase', {
    value:        order.total,
    currency:     'DZD',
    content_ids:  order.items.map(i => i.id),
    content_type: 'product',
    num_items:    order.items.reduce((s, i) => s + i.quantity, 0),
  })
  _gtag('event', 'purchase', {
    transaction_id: order.transactionId,
    value:          order.total,
    currency:       'DZD',
    items: order.items.map(i => ({
      item_id:   i.id,
      item_name: i.name,
      price:     i.price,
      quantity:  i.quantity,
    })),
  })
  _pixel('Purchase', {
    transaction_id: order.transactionId,
    total:          order.total,
    currency:       'DZD',
    num_items:      order.items.reduce((s, i) => s + i.quantity, 0),
    product_ids:    order.items.map(i => i.id),
  })
  _ttq('PlaceAnOrder', {
    value:    order.total,
    currency: 'DZD',
    contents: order.items.map(i => ({ content_id: i.id, content_name: i.name, quantity: i.quantity, price: i.price })),
  })
}
