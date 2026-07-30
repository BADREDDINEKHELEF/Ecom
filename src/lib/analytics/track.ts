'use client'

// Lightweight fire-and-forget event tracker.
// Stores events in the analytics_events table via /api/pixel/collect.
// Never blocks UI — all calls are async and errors are silently ignored.

export type TrackEvent =
  | 'product_view'
  | 'add_to_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'search'
  | 'seller_profile_view'
  | 'stock_update'

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem('_sid')
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, '')
      sessionStorage.setItem('_sid', id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

export function track(
  event: TrackEvent,
  metadata: Record<string, unknown> & { product_id?: string; vendor_id?: string } = {}
): void {
  if (typeof window === 'undefined') return
  const { product_id, vendor_id, ...rest } = metadata
  const payload = {
    event,
    session_id:  getSessionId(),
    device_type: getDeviceType(),
    product_id,
    vendor_id,
    metadata:    rest,
  }
  fetch('/api/analytics/collect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {/* fire-and-forget */})
}
