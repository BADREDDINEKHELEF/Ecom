/**
 * Client-side Meta Pixel Manager
 *
 * Manages pixel initialization and event tracking for multiple stores.
 * Each store's pixel is initialized once (singleton pattern).
 * Events fire to ALL initialized pixels simultaneously.
 *
 * Safe wrapper — all calls are no-ops when scripts are blocked or not configured.
 */

import type {
  MetaEventName,
  PageViewParams,
  ViewContentParams,
  SearchParams,
  AddToWishlistParams,
  AddToCartParams,
  InitiateCheckoutParams,
  AddPaymentInfoParams,
  PurchaseParams,
} from './types'

// ── Global type declaration ────────────────────────────────────────────
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

// ── Safe wrapper (never throws) ────────────────────────────────────────
function _fbq(...args: unknown[]) {
  try {
    if (typeof window !== 'undefined') window.fbq?.(...args)
  } catch { /* ad-blocker or test environment */ }
}

// ── Pixel singleton tracker ────────────────────────────────────────────
const initializedPixels = new Set<string>()

/**
 * Initialize a Meta Pixel for a store.
 * Safe to call multiple times — only initializes once per pixel ID.
 */
export function initMetaPixel(pixelId: string, _testEventCode?: string | null): void {
  if (typeof window === 'undefined') return
  if (initializedPixels.has(pixelId)) return

  // testEventCode is NOT a valid fbq('init') parameter — it must be passed
  // on individual fbq('track') calls. Passing it here is silently ignored by
  // the Meta Pixel SDK. The parameter is kept in the signature for backwards
  // compatibility but is intentionally unused here.
  _fbq('init', pixelId)
  initializedPixels.add(pixelId)
}

/**
 * Reset tracked pixels (useful for testing).
 */
export function resetPixels(): void {
  initializedPixels.clear()
}

// ── Event tracking ─────────────────────────────────────────────────────

export function trackMetaEvent(event: MetaEventName, params?: Record<string, unknown>): void {
  _fbq('track', event, params)
}

export function trackMetaEventWithID(
  event: MetaEventName,
  params: Record<string, unknown>,
  eventID: string,
): void {
  _fbq('track', event, params, { eventID })
}

// ── 8 standard ecommerce events ────────────────────────────────────────

export function trackPageView(p: PageViewParams = {}): void {
  trackMetaEvent('PageView', { event_source_url: p.event_source_url })
}

export function trackViewContent(p: ViewContentParams): void {
  trackMetaEvent('ViewContent', {
    content_ids:  p.content_ids,
    content_name: p.content_name,
    content_type: p.content_type,
    value:        p.value,
    currency:     p.currency,
    contents:     p.contents,
    ...(p.content_category && { content_category: p.content_category }),
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackSearch(p: SearchParams): void {
  trackMetaEvent('Search', {
    search_string: p.search_string,
    ...(p.content_ids && { content_ids: p.content_ids }),
    ...(p.content_type && { content_type: p.content_type }),
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackAddToWishlist(p: AddToWishlistParams): void {
  trackMetaEvent('AddToWishlist', {
    content_ids:  p.content_ids,
    content_name: p.content_name,
    content_type: p.content_type,
    value:        p.value,
    currency:     p.currency,
    contents:     p.contents,
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackAddToCart(p: AddToCartParams): void {
  trackMetaEvent('AddToCart', {
    content_ids:  p.content_ids,
    content_name: p.content_name,
    content_type: p.content_type,
    value:        p.value,
    currency:     p.currency,
    contents:     p.contents,
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackInitiateCheckout(p: InitiateCheckoutParams): void {
  trackMetaEvent('InitiateCheckout', {
    value:     p.value,
    currency:  p.currency,
    num_items: p.num_items,
    ...(p.content_ids && { content_ids: p.content_ids }),
    ...(p.content_type && { content_type: p.content_type }),
    ...(p.contents && { contents: p.contents }),
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackAddPaymentInfo(p: AddPaymentInfoParams): void {
  trackMetaEvent('AddPaymentInfo', {
    value:    p.value,
    currency: p.currency,
    ...(p.num_items && { num_items: p.num_items }),
    ...(p.content_ids && { content_ids: p.content_ids }),
    ...(p.content_type && { content_type: p.content_type }),
    ...(p.payment_method && { payment_method: p.payment_method }),
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  })
}

export function trackPurchase(p: PurchaseParams): void {
  trackMetaEventWithID('Purchase', {
    value:        p.value,
    currency:     p.currency,
    content_ids:  p.content_ids,
    content_type: p.content_type,
    num_items:    p.num_items,
    contents:     p.contents,
    ...(p.event_source_url && { event_source_url: p.event_source_url }),
  }, p.transactionId)
}
