/**
 * Server-side Conversions APIs — fired after order creation.
 * Runs alongside client-side pixels for reliable tracking not blocked by ad blockers.
 * All calls are best-effort and never block the order flow.
 *
 * Meta Conversions API has moved to @/lib/meta/capi.
 * Legacy Meta code (fireMetaPurchase, firePurchaseCAPI) has been removed.
 */

import { sha256, normalizePhone, anonymizeIp } from '@/lib/meta/user-data'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { fireStorePurchaseCAPI, fireMultiStorePurchaseCAPI } from '@/lib/meta/capi'
import { getMetaConfigsByIds, getPlatformMetaConfig } from '@/lib/meta/store'
import { decryptField, isEncrypted } from '@/lib/utils/crypto'

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

function decryptCred(v: string | null | undefined): string | null {
  if (!v) return null
  return isEncrypted(v) ? decryptField(v) : v
}

/**
 * Loads order details and involved vendor configs, then fires purchase conversion events
 * to Meta CAPI, TikTok CAPI, and Google GA4 MP for both the platform and individual vendors.
 */
export async function triggerConversionsApiOnSuccess(orderId: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, total, email, phone, client_ip, client_user_agent')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      logger.error('[analytics/server/capi] order not found for CAPI', { orderId, error: orderErr?.message })
      return
    }

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_id, product_name, product_price, quantity, vendor_id')
      .eq('order_id', orderId)

    if (itemsErr || !items?.length) {
      logger.error('[analytics/server/capi] order items not found for CAPI', { orderId, error: itemsErr?.message })
      return
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const buyerEmail = order.email ?? null
    const clientIp = order.client_ip ?? undefined
    const clientUserAgent = order.client_user_agent ?? undefined
    const total = order.total

    // 1. Platform-level Meta CAPI
    const platformConfig = getPlatformMetaConfig()
    if (platformConfig) {
      fireStorePurchaseCAPI(
        platformConfig, orderId, total,
        {
          email: buyerEmail, phone: order.phone,
          clientIp, clientUserAgent,
          eventSourceUrl: appUrl ? `${appUrl}/checkout` : undefined,
        },
        {
          contentIds: items.map(i => i.product_id),
          numItems:   items.reduce((s, i) => s + i.quantity, 0),
        },
      ).catch((err) => logger.error('[analytics/server/capi] platform Meta CAPI failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    // 2. Platform-level TikTok CAPI
    if (process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID && process.env.TIKTOK_CAPI_TOKEN) {
      const capiItems = items.map(i => ({ id: i.product_id, name: i.product_name, price: i.product_price, quantity: i.quantity }))
      fireTikTokPurchase({
        pixelId:     process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
        accessToken: process.env.TIKTOK_CAPI_TOKEN,
        orderId, total, items: capiItems,
        email: buyerEmail, phone: order.phone,
        clientIp, clientUserAgent,
      }).catch((err) => logger.error('[analytics/server/capi] platform TikTok CAPI failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    // 3. Vendor-level Meta, TikTok, GA4 CAPI
    const vendorIds = Array.from(new Set(items.map((i) => i.vendor_id).filter((v): v is string => typeof v === 'string' && v.length > 0)))
    if (vendorIds.length > 0) {
      const metaConfigs = (await getMetaConfigsByIds(vendorIds)).map(c => ({
        ...c,
        accessToken: decryptCred(c.accessToken),
      }))

      if (metaConfigs.some(c => c.pixelId && c.accessToken)) {
        const purchaseMeta = {
          contentIds: items.map(i => i.product_id),
          numItems:   items.reduce((s, i) => s + i.quantity, 0),
        }
        fireMultiStorePurchaseCAPI(
          metaConfigs, orderId, total,
          {
            email: buyerEmail, phone: order.phone,
            clientIp, clientUserAgent,
            eventSourceUrl: appUrl ? `${appUrl}/checkout` : undefined,
          },
          purchaseMeta,
        ).catch((err) => logger.error('[analytics/server/capi] multi-store Meta CAPI failed', { error: err instanceof Error ? err.message : String(err) }))
      }

      // TikTok + GA4 per-vendor CAPI
      const { data: vendors } = await supabase
        .from('vendors')
        .select('tiktok_pixel_id, tiktok_capi_token, gtag_id, gtag_api_secret')
        .in('id', vendorIds)

      if (vendors?.length) {
        const capiItems = items.map(i => ({ id: i.product_id, name: i.product_name, price: i.product_price, quantity: i.quantity }))
        const otherVendorCalls = vendors.map((v: Record<string, string | null>) => {
          const calls: Promise<unknown>[] = []
          if (v.tiktok_pixel_id && v.tiktok_capi_token) {
            calls.push(fireTikTokPurchase({
              pixelId:     v.tiktok_pixel_id,
              accessToken: decryptCred(v.tiktok_capi_token)!,
              orderId, total, items: capiItems,
              email: buyerEmail, phone: order.phone,
              clientIp, clientUserAgent,
            }))
          }
          if (v.gtag_id && v.gtag_api_secret) {
            calls.push(fireGA4Purchase({
              measurementId: v.gtag_id!,
              apiSecret:     decryptCred(v.gtag_api_secret)!,
              orderId, total, items: capiItems,
            }))
          }
          return Promise.allSettled(calls)
        })
        await Promise.allSettled(otherVendorCalls)
      }
    }
  } catch (err) {
    logger.error('[analytics/server/capi] triggerConversionsApiOnSuccess failed', { orderId, error: err instanceof Error ? err.message : String(err) })
  }
}


