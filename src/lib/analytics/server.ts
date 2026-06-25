/**
 * Server-side Conversions APIs — fired after order creation.
 * Runs alongside client-side pixels for reliable tracking not blocked by ad blockers.
 * All calls are best-effort and never block the order flow.
 */

import crypto from 'crypto'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function normalizePhone(phone: string): string {
  // Strip non-digits, ensure it starts with 213 (Algerian country code)
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('213') ? digits : digits.startsWith('0') ? '213' + digits.slice(1) : digits
}

function anonymizeIp(ip: string): string {
  if (!ip) return ''
  // IPv4: mask last octet (e.g. 192.168.1.123 -> 192.168.1.0)
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      parts[3] = '0'
      return parts.join('.')
    }
  }
  // IPv6: mask last 80 bits (e.g. 2001:db8:85a3:8d3:1319:8a2e:370:7348 -> 2001:db8:85a3::)
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length > 3) {
      return parts.slice(0, 4).join(':') + '::'
    }
  }
  return ip
}

// ── Meta Conversions API ────────────────────────────────────────────────────
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

export async function fireMetaPurchase(opts: {
  pixelId:         string
  accessToken:     string
  orderId:         string
  total:           number
  email?:          string | null
  phone?:          string | null
  clientIp?:       string
  clientUserAgent?: string
}): Promise<void> {
  const { pixelId, accessToken, orderId, total, email, phone, clientIp, clientUserAgent } = opts
  try {
    // Meta CAPI requires scalar hashed strings, NOT arrays — arrays are silently ignored
    const userData: Record<string, unknown> = {}
    if (email)            userData.em  = sha256(email)
    if (phone)            userData.ph  = sha256(normalizePhone(phone))
    if (clientIp)         userData.client_ip_address  = anonymizeIp(clientIp)
    if (clientUserAgent)  userData.client_user_agent  = clientUserAgent

    await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            event_name:    'Purchase',
            event_time:    Math.floor(Date.now() / 1000),
            event_id:      orderId,
            action_source: 'website',
            user_data:     userData,
            custom_data:   { value: total, currency: 'DZD', order_id: orderId },
          }],
        }),
      }
    )
  } catch { /* best-effort */ }
}

// ── TikTok Events API ───────────────────────────────────────────────────────
// Docs: https://business-api.tiktok.com/portal/docs?id=1741601162187777

export async function fireTikTokPurchase(opts: {
  pixelId:      string
  accessToken:  string
  orderId:      string
  total:        number
  items:        Array<{ id: string; name: string; price: number; quantity: number }>
  email?:       string | null
  phone?:       string | null
}): Promise<void> {
  const { pixelId, accessToken, orderId, total, items, email, phone } = opts
  try {
    const user: Record<string, string> = {}
    if (email) user.email        = sha256(email)
    if (phone) user.phone_number = sha256(normalizePhone(phone))

    // TikTok Events API v1.3 requires events wrapped in an array
    await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken },
      body: JSON.stringify({
        pixel_code: pixelId,
        events: [{
          event:      'CompletePayment',
          event_id:   orderId,
          event_time: Math.floor(Date.now() / 1000),
          user,
          properties: {
            order_id: orderId,
            value:    total,
            currency: 'DZD',
            contents: items.map(i => ({
              content_id:   i.id,
              content_name: i.name,
              quantity:     i.quantity,
              price:        i.price,
            })),
          },
        }],
      }),
    })
  } catch { /* best-effort */ }
}

// ── Google GA4 Measurement Protocol ────────────────────────────────────────
// Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4

export async function fireGA4Purchase(opts: {
  measurementId: string
  apiSecret:     string
  orderId:       string
  total:         number
  items:         Array<{ id: string; name: string; price: number; quantity: number }>
  clientId?:     string
}): Promise<void> {
  // clientId is the browser's GA4 _ga cookie value (parsed to "XXXXXXXXXX.XXXXXXXXXX" format).
  // Fall back to a deterministic orderId-based value so the hit is accepted by the API.
  // Without the real clientId the purchase won't be attributed to the user's acquisition source.
  const { measurementId, apiSecret, orderId, total, items, clientId } = opts
  const effectiveClientId = clientId ?? `sv.${orderId.replace(/-/g, '').slice(0, 16)}`
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: effectiveClientId,
          events: [{
            name:   'purchase',
            params: {
              transaction_id: orderId,
              value:    total,
              currency: 'DZD',
              items:    items.map(i => ({
                item_id:   i.id,
                item_name: i.name,
                price:     i.price,
                quantity:  i.quantity,
              })),
            },
          }],
        }),
      }
    )
  } catch { /* best-effort */ }
}

// ── Batch helper — fires all three for a given set of credentials ───────────

export async function firePurchaseCAPI(opts: {
  metaPixelId?:     string | null
  metaCAPIToken?:   string | null
  tiktokPixelId?:   string | null
  tiktokCAPIToken?: string | null
  gtagId?:          string | null
  gtagApiSecret?:   string | null
  orderId:  string
  total:    number
  items:    Array<{ id: string; name: string; price: number; quantity: number }>
  email?:   string | null
  phone?:   string | null
  clientIp?:         string
  clientUserAgent?:  string
  gaClientId?:       string
}): Promise<void> {
  const calls: Promise<void>[] = []

  if (opts.metaPixelId && opts.metaCAPIToken) {
    calls.push(fireMetaPurchase({
      pixelId:         opts.metaPixelId,
      accessToken:     opts.metaCAPIToken,
      orderId:         opts.orderId,
      total:           opts.total,
      email:           opts.email,
      phone:           opts.phone,
      clientIp:        opts.clientIp,
      clientUserAgent: opts.clientUserAgent,
    }))
  }

  if (opts.tiktokPixelId && opts.tiktokCAPIToken) {
    calls.push(fireTikTokPurchase({
      pixelId:     opts.tiktokPixelId,
      accessToken: opts.tiktokCAPIToken,
      orderId:     opts.orderId,
      total:       opts.total,
      items:       opts.items,
      email:       opts.email,
      phone:       opts.phone,
    }))
  }

  if (opts.gtagId && opts.gtagApiSecret) {
    calls.push(fireGA4Purchase({
      measurementId: opts.gtagId,
      apiSecret:     opts.gtagApiSecret,
      orderId:       opts.orderId,
      total:         opts.total,
      items:         opts.items,
      clientId:      opts.gaClientId,
    }))
  }

  await Promise.allSettled(calls)
}
