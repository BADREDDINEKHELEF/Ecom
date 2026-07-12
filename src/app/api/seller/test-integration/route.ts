import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { saveIntegrationHealth } from '@/lib/supabase/health'
import { dispatchGetRate } from '@/lib/delivery/dispatch'

// Import specific carrier clients/calls
import { yassirListParcels } from '@/lib/delivery/yassir'
import { ecomTestConnection, ecomGetRateWithToken } from '@/lib/delivery/ecom'
import { procolisListParcels } from '@/lib/delivery/procolis'
import { zrListParcels } from '@/lib/delivery/zrexpress'
import { maystroListParcels } from '@/lib/delivery/maystro'
import { rexListParcels } from '@/lib/delivery/rex'

// Import CAPI calls
import { fireTikTokPurchase, fireGA4Purchase } from '@/lib/analytics/server'
import { fireStorePurchaseCAPI } from '@/lib/meta/capi'
import { getMetaConfigById } from '@/lib/meta/store'
import { TestIntegrationSchema } from '@/lib/validation/apiSchemas'

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'test_integration', 15, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Too many requests' }, { status: 429 }))

  const result = await requireVendorPermission(req, 'delivery:config', response)
  if (result instanceof NextResponse) return result
  const { ctx: { user, vendor } } = result

  const userRl = await checkUserRateLimit(user.id, 'test_integration', 15, 60)
  if (!userRl.allowed) return copyCookies(response, NextResponse.json({ error: 'Limit reached' }, { status: 429 }))

  let rawBody: unknown
  try { rawBody = await req.json() } catch { return copyCookies(response, NextResponse.json({ error: 'Invalid body' }, { status: 400 })) }
  const parsed = TestIntegrationSchema.safeParse(rawBody)
  if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 }))
  const { integrationName, action, params } = parsed.data

  const config = await getVendorDeliveryConfig(vendor.id)
  
  const recordResult = async (ok: boolean, details: { error?: string | null; status?: number | null; accountName?: string | null; quoteFee?: number | null; quoteDuration?: string | null; quoteResponse?: unknown }) => {
    const health_status = ok ? 'connected' : 'failed'
    const update: Record<string, unknown> = {
      health_status,
      last_error_message: ok ? null : (details.error || 'Connection failed'),
      last_http_status: details.status || null,
      last_account_name: details.accountName || null,
    }
    if (ok) {
      update.last_success_at = new Date().toISOString()
    } else {
      update.last_failure_at = new Date().toISOString()
    }
    if (details.quoteFee !== undefined) update.last_quote_fee = details.quoteFee
    if (details.quoteDuration !== undefined) update.last_quote_duration = details.quoteDuration
    if (details.quoteResponse !== undefined) update.last_quote_response = details.quoteResponse

    await saveIntegrationHealth(vendor.id, integrationName, update)
  }

  try {
    switch (integrationName) {
      case 'yalidine': {
        const token = config?.yalidine_api_token
        const apiId = config?.yalidine_api_id
        if (!token || !apiId) {
          await saveIntegrationHealth(vendor.id, 'yalidine', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await fetch('https://api.yalidine.app/v1/agencies/', {
            headers: { 'X-API-ID': apiId, 'X-API-TOKEN': token },
            signal: AbortSignal.timeout(10_000)
          })
          const ok = res.ok
          const status = res.status
          const resBody = await res.json().catch(() => ({}))
          await recordResult(ok, { status, error: ok ? null : `Yalidine API returned HTTP ${status}` })
          return copyCookies(response, NextResponse.json({ ok, status, raw: resBody }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('yalidine', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }
      
      case 'zr': {
        const token = config?.zr_token
        if (!token) {
          await saveIntegrationHealth(vendor.id, 'zr', { health_status: 'needs_configuration' })
          const error = config?._decryptionFailed
            ? 'Stored credentials cannot be decrypted. Check FIELD_ENCRYPTION_KEY.'
            : 'Credentials not configured'
          return copyCookies(response, NextResponse.json({ ok: false, error }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await zrListParcels(token, config?.zr_key ?? undefined, 1)
          const ok = res !== null
          await recordResult(ok, { error: ok ? null : 'ZR connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw: res }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('zr', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'maystro': {
        const token = config?.maystro_token
        if (!token) {
          await saveIntegrationHealth(vendor.id, 'maystro', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await maystroListParcels(token, 1)
          const ok = res !== null
          await recordResult(ok, { error: ok ? null : 'Maystro connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw: res }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('maystro', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'procolis': {
        const token = config?.procolis_token
        const key = config?.procolis_key
        if (!token || !key) {
          await saveIntegrationHealth(vendor.id, 'procolis', { health_status: 'needs_configuration' })
          const error = config?._decryptionFailed
            ? 'Stored credentials cannot be decrypted. Check FIELD_ENCRYPTION_KEY.'
            : 'Credentials not configured'
          return copyCookies(response, NextResponse.json({ ok: false, error }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await procolisListParcels(token, key, 1)
          const ok = res !== null
          await recordResult(ok, { error: ok ? null : 'Procolis connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw: res }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('procolis', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'colivraison': {
        const token = config?.colivraison_token
        if (!token) {
          await saveIntegrationHealth(vendor.id, 'colivraison', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await fetch('https://api.colivraison.com/api/pricing?wilaya=Alger', {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: AbortSignal.timeout(10_000)
          })
          const ok = res.ok
          const status = res.status
          const resBody = await res.json().catch(() => ({}))
          await recordResult(ok, { status, error: ok ? null : `Colivraison API returned HTTP ${status}` })
          return copyCookies(response, NextResponse.json({ ok, status, raw: resBody }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('colivraison', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'rex': {
        const token = config?.rex_token
        if (!token) {
          await saveIntegrationHealth(vendor.id, 'rex', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await rexListParcels(token, 1)
          const ok = res !== null
          await recordResult(ok, { error: ok ? null : 'Rex connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw: res }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('rex', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'yassir': {
        const token = config?.yassir_api_key
        if (!token) {
          await saveIntegrationHealth(vendor.id, 'yassir', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await yassirListParcels(token, 1)
          const ok = res !== null
          await recordResult(ok, { error: ok ? null : 'Yassir connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw: res }))
        }
        if (action === 'test_quote') {
          return copyCookies(response, NextResponse.json({ error: 'Yassir does not support live quoting' }, { status: 400 }))
        }
        break
      }

      case 'ecom': {
        const key = config?.ecom_api_key
        const tk = config?.ecom_api_token
        if (!key || !tk) {
          await saveIntegrationHealth(vendor.id, 'ecom', { health_status: 'needs_configuration' })
          const error = config?._decryptionFailed
            ? 'Stored credentials cannot be decrypted. Check FIELD_ENCRYPTION_KEY.'
            : 'Credentials not configured'
          return copyCookies(response, NextResponse.json({ ok: false, error }, { status: 400 }))
        }
        if (action === 'test_connection') {
          // Docs provide a dedicated /Api_v1/Test endpoint for connection checks.
          const raw = await ecomTestConnection(key, tk)
          const ok = raw !== null
          await recordResult(ok, { error: ok ? null : 'Ecom API connection failed' })
          return copyCookies(response, NextResponse.json({ ok, raw }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('ecom', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'apec': {
        const token = config?.apec_api_token
        const apiId = config?.apec_api_id
        if (!token || !apiId) {
          await saveIntegrationHealth(vendor.id, 'apec', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'test_connection') {
          const res = await fetch('https://api.apec.dz/v1/delivery-fees/?to_wilaya_name=Alger', {
            headers: { 'X-API-ID': apiId, 'X-API-TOKEN': token },
            signal: AbortSignal.timeout(10_000)
          })
          const ok = res.ok
          const status = res.status
          const resBody = await res.json().catch(() => ({}))
          await recordResult(ok, { status, error: ok ? null : `APEC API returned HTTP ${status}` })
          return copyCookies(response, NextResponse.json({ ok, status, raw: resBody }))
        }
        if (action === 'test_quote') {
          const wilaya = params?.wilaya || 'Alger'
          const rate = await dispatchGetRate('apec', wilaya, config ?? undefined, false)
          const ok = !!rate
          await recordResult(ok, { error: ok ? null : 'Failed to fetch quote', quoteFee: rate?.homeDelivery, quoteResponse: rate })
          return copyCookies(response, NextResponse.json({ ok, rate }))
        }
        break
      }

      case 'meta_capi': {
        const { decryptField, isEncrypted } = await import('@/lib/utils/crypto')
        const config = await getMetaConfigById(vendor.id)
        if (!config) {
          await saveIntegrationHealth(vendor.id, 'meta_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Meta configuration row not found in database' }, { status: 400 }))
        }
        if (!config.pixelId) {
          await saveIntegrationHealth(vendor.id, 'meta_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Meta Pixel ID is empty or not configured' }, { status: 400 }))
        }
        if (!config.accessToken) {
          await saveIntegrationHealth(vendor.id, 'meta_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Meta Conversions API Token is empty or not configured' }, { status: 400 }))
        }
        if (!config.enabled) {
          await saveIntegrationHealth(vendor.id, 'meta_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Meta integration is disabled (meta_enabled is false in database)' }, { status: 400 }))
        }
        if (action === 'send_test_event') {
          const effectiveConfig = {
            ...config,
            accessToken: isEncrypted(config.accessToken) ? decryptField(config.accessToken) : config.accessToken,
          }
          const res = await fireStorePurchaseCAPI(effectiveConfig, `TEST-${Math.floor(Math.random() * 1000000)}`, 1500, {
            email: 'test@example.com',
            phone: '0555123456',
            clientIp: '127.0.0.1',
            clientUserAgent: 'Mozilla/5.0 (Test Sandbox)',
          })
          await recordResult(res.ok, { status: res.status, error: res.ok ? null : res.message })
          return copyCookies(response, NextResponse.json({ ok: res.ok, status: res.status, message: res.message, raw: typeof res.raw === 'object' && res.raw !== null ? { id: (res.raw as Record<string, unknown>).id, ok: true } : null }))
        }
        break
      }

      case 'tiktok_capi': {
        const pixelId = vendor.tiktok_pixel_id
        const token = vendor.tiktok_capi_token
        const { decryptField, isEncrypted } = await import('@/lib/utils/crypto')
        const rawToken = token ? (isEncrypted(token) ? decryptField(token) : token) : null

        if (!pixelId || !rawToken) {
          await saveIntegrationHealth(vendor.id, 'tiktok_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'send_test_event') {
          const res = await fireTikTokPurchase({
            pixelId,
            accessToken: rawToken,
            orderId: `TEST-${Math.floor(Math.random() * 1000000)}`,
            total: 1500,
            items: [{ id: 'test-prod', name: 'Test Product', price: 1500, quantity: 1 }],
            email: 'test@example.com',
            phone: '0555123456',
            clientIp: '127.0.0.1',
            clientUserAgent: 'Mozilla/5.0 (Test Sandbox)'
          })
          await recordResult(res.ok, { status: res.status, error: res.ok ? null : res.message })
          return copyCookies(response, NextResponse.json({ ok: res.ok, status: res.status, message: res.message, raw: typeof res.raw === 'object' && res.raw !== null ? { id: (res.raw as Record<string, unknown>).id, ok: true } : null }))
        }
        break
      }

      case 'google_capi': {
        const gtagId = vendor.gtag_id
        const secret = vendor.gtag_api_secret
        const { decryptField, isEncrypted } = await import('@/lib/utils/crypto')
        const rawSecret = secret ? (isEncrypted(secret) ? decryptField(secret) : secret) : null

        if (!gtagId || !rawSecret) {
          await saveIntegrationHealth(vendor.id, 'google_capi', { health_status: 'needs_configuration' })
          return copyCookies(response, NextResponse.json({ ok: false, error: 'Credentials not configured' }, { status: 400 }))
        }
        if (action === 'send_test_event') {
          const res = await fireGA4Purchase({
            measurementId: gtagId,
            apiSecret: rawSecret,
            orderId: `TEST-${Math.floor(Math.random() * 1000000)}`,
            total: 1500,
            items: [{ id: 'test-prod', name: 'Test Product', price: 1500, quantity: 1 }]
          })
          await recordResult(res.ok, { status: res.status, error: res.ok ? null : res.message })
          return copyCookies(response, NextResponse.json({ ok: res.ok, status: res.status, message: res.message, raw: typeof res.raw === 'object' && res.raw !== null ? { id: (res.raw as Record<string, unknown>).id, ok: true } : null }))
        }
        break
      }

      default:
        return copyCookies(response, NextResponse.json({ error: 'Unsupported integration' }, { status: 400 }))
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await recordResult(false, { error: errorMsg })
    return copyCookies(response, NextResponse.json({ ok: false, error: errorMsg }))
  }

  return copyCookies(response, NextResponse.json({ error: 'Action not handled' }, { status: 400 }))
}
