/**
 * Server-side Conversions APIs — fired after order creation.
 * Runs alongside client-side pixels for reliable tracking not blocked by ad blockers.
 * All calls are best-effort and never block the order flow.
 *
 * Meta Conversions API has moved to @/lib/meta/capi.
 * Legacy Meta code (fireMetaPurchase, firePurchaseCAPI) has been removed.
 */

import { sha256, normalizePhone, anonymizeIp } from '@/lib/meta/user-data'

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
  clientIp?:    string
  clientUserAgent?: string
}): Promise<{ ok: boolean; status: number; message: string; raw?: unknown }> {
  const { pixelId, accessToken, orderId, total, items, email, phone, clientIp, clientUserAgent } = opts
  try {
    const user: Record<string, string> = {}
    if (clientIp) user.ip        = anonymizeIp(clientIp)
    if (clientUserAgent) user.user_agent = clientUserAgent
    if (email) user.email        = sha256(email)
    if (phone) {
      const digits = normalizePhone(phone)
      user.phone_number = sha256('+' + digits)
    }

    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
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
    const status = res.status
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, status, message: body?.message ?? `HTTP Error ${status}`, raw: body }
    }
    return { ok: true, status, message: 'Event accepted by TikTok', raw: body }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, message: msg }
  }
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
}): Promise<{ ok: boolean; status: number; message: string; raw?: unknown }> {
  const { measurementId, apiSecret, orderId, total, items, clientId } = opts
  if (!clientId) {
    return { ok: false, status: 0, message: 'GA4 MP call skipped: no real gaClientId available' }
  }
  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
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
    const status = res.status
    const body = await res.text().catch(() => '')
    if (!res.ok) {
      return { ok: false, status, message: body || `HTTP Error ${status}`, raw: body }
    }
    return { ok: true, status, message: 'Event sent to GA4', raw: body || null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, status: 0, message: msg }
  }
}


