/**
 * Server-side Meta Conversions API
 *
 * Official Graph API v21.0.
 * Fires Purchase events server-side for reliable tracking not blocked by ad blockers.
 * Shares the same event_id as the browser pixel for deduplication.
 *
 * Features:
 *   - Retry with exponential backoff (3 attempts)
 *   - Timeout protection (10s per attempt)
 *   - Development-only logging
 *   - Production-safe error handling (never throws)
 */

import type {
  StoreMetaConfig,
  MetaUserData,
  MetaCAPIRequestBody,
  MetaCAPIResponse,
  CAPIResult,
  CAPIVendorResult,
} from './types'

import { buildUserData, type UserDataInput } from './user-data'
import { logger } from '@/lib/logger'

// ── Configuration ──────────────────────────────────────────────────────

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const TIMEOUT_MS = 10000
const IS_DEV = process.env.NODE_ENV === 'development'

// ── Logging (development only) ─────────────────────────────────────────

function log(label: string, data?: unknown) {
  if (!IS_DEV) return
  const prefix = '[Meta CAPI]'
  if (data === undefined) {
    console.log(prefix, label)
  } else {
    console.log(prefix, label, typeof data === 'object' ? JSON.stringify(data, null, 2) : data)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Token scope validation ─────────────────────────────────────────────
// CAPI events require an access token with the ads_management permission.
// We validate this once per token and cache the result to avoid repeated
// Graph API calls. Missing scope is logged as a production warning so it
// is visible in server logs without breaking the checkout flow.

interface MetaPermission {
  permission: string
  status: 'granted' | 'declined'
}

const tokenScopeCache = new Map<string, boolean>()
const pendingScopeChecks = new Map<string, Promise<boolean>>()

async function checkTokenScope(accessToken: string): Promise<boolean> {
  try {
    const url = `${GRAPH_API_BASE}/me/permissions?access_token=${encodeURIComponent(accessToken)}`
    const res = await fetchWithTimeout(url, { method: 'GET' }, TIMEOUT_MS)
    const body = await res.json().catch(() => ({})) as {
      data?: MetaPermission[]
      error?: { message: string }
    }

    if (!res.ok || body.error) {
      logger.warn('[Meta CAPI] Unable to validate token scope', {
        status: res.status,
        error: body.error?.message ?? 'unknown',
      })
      return false
    }

    const granted = body.data?.map((p) => p.permission) ?? []
    const hasAdsManagement = granted.includes('ads_management')

    if (!hasAdsManagement) {
      logger.warn(
        '[Meta CAPI] META_CAPI_TOKEN is missing the required ads_management scope. ' +
        `Granted permissions: ${granted.join(', ') || 'none'}. ` +
        'Generate a new System User token from Meta Events Manager → Settings → Conversions API → ' +
        '"Generate access token" and include ads_management.',
        { grantedPermissions: granted }
      )
    }

    return hasAdsManagement
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn('[Meta CAPI] Token scope validation failed', { error: msg })
    return false
  }
}

async function ensureTokenScope(accessToken: string): Promise<boolean> {
  const cached = tokenScopeCache.get(accessToken)
  if (cached !== undefined) return cached

  const pending = pendingScopeChecks.get(accessToken)
  if (pending) return pending

  const promise = checkTokenScope(accessToken).finally(() => {
    pendingScopeChecks.delete(accessToken)
  })
  pendingScopeChecks.set(accessToken, promise)
  const result = await promise
  tokenScopeCache.set(accessToken, result)
  return result
}

// ── Timeout wrapper ────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

// ── Core CAPI sender ───────────────────────────────────────────────────

async function sendCAPIPurchase(
  pixelId: string,
  accessToken: string,
  body: MetaCAPIRequestBody,
): Promise<CAPIResult> {
  const url = `${GRAPH_API_BASE}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      log(`Attempt ${attempt}/${MAX_RETRIES}`, { pixelId, eventId: body.data[0]?.event_id })

      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        TIMEOUT_MS,
      )

      const status = res.status
      const raw: MetaCAPIResponse = await res.json().catch(() => ({ events_received: 0 }))

      // Success
      if (res.ok) {
        log('Accepted', { status, fbtrace_id: raw.fbtrace_id, events_received: raw.events_received })
        return { ok: true, status, message: `Accepted (${raw.events_received} events)`, raw }
      }

      // 4xx — not retryable (bad request, auth failure, rate limit)
      if (status < 500) {
        log('Rejected', { status, error: raw.error })
        return {
          ok: false,
          status,
          message: raw.error?.message ?? `HTTP ${status}`,
          raw,
        }
      }

      // 5xx — retry with exponential backoff
      log(`Retryable error (${status}), attempt ${attempt}/${MAX_RETRIES}`, raw.error)
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1))
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      const msg = isTimeout
        ? `Timeout after ${TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err)

      log(isTimeout ? 'Timeout' : `Error (attempt ${attempt})`, msg)

      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt - 1))
      } else {
        return { ok: false, status: 0, message: msg }
      }
    }
  }

  return { ok: false, status: 0, message: 'Max retries exceeded' }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Fire a Purchase event via Meta Conversions API for a single store.
 *
 * @param config - The store's Meta config (resolved by store resolver)
 * @param orderId - Used as event_id for dedup with browser pixel
 * @param total - Order total in DZD
 * @param userDataInput - Customer data (PII is hashed automatically); pass eventSourceUrl for best match quality
 * @param purchaseMeta - Optional content_ids and num_items for richer event data
 */
export async function fireStorePurchaseCAPI(
  config: StoreMetaConfig,
  orderId: string,
  total: number,
  userDataInput: UserDataInput,
  purchaseMeta?: { contentIds?: string[]; numItems?: number },
): Promise<CAPIResult> {
  if (!config.enabled || !config.pixelId || !config.accessToken) {
    log('Skipped — store not configured', { storeId: config.storeId, storeSlug: config.storeSlug })
    return { ok: false, status: 0, message: 'Store not configured for Meta CAPI' }
  }

  const userData: MetaUserData = buildUserData(userDataInput)

  const body: MetaCAPIRequestBody = {
    data: [{
      event_name:    'Purchase',
      event_time:    Math.floor(Date.now() / 1000),
      event_id:      orderId,
      action_source: 'website',
      user_data:     userData,
      custom_data:   {
        value:    total,
        currency: 'DZD',
        order_id: orderId,
        ...(purchaseMeta?.contentIds?.length && { content_ids: purchaseMeta.contentIds, content_type: 'product' }),
        ...(purchaseMeta?.numItems && { num_items: purchaseMeta.numItems }),
      },
      ...(userDataInput.eventSourceUrl && { event_source_url: userDataInput.eventSourceUrl }),
    }],
  }

  // Include test event code if configured (for Meta Events Manager testing)
  if (config.testEventCode) {
    body.test_event_code = config.testEventCode
  }

  log('Firing for store', { storeSlug: config.storeSlug, pixelId: config.pixelId, orderId, total })

  const result = await sendCAPIPurchase(config.pixelId, config.accessToken, body)
  log('Result', result)

  return result
}

/**
 * Fire Purchase CAPI for multiple stores in parallel.
 * Used after multi-vendor order creation.
 * Never throws — all errors are captured per-vendor.
 */
export async function fireMultiStorePurchaseCAPI(
  configs: StoreMetaConfig[],
  orderId: string,
  total: number,
  userDataInput: UserDataInput,
  purchaseMeta?: { contentIds?: string[]; numItems?: number },
): Promise<CAPIVendorResult[]> {
  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const result = await fireStorePurchaseCAPI(config, orderId, total, userDataInput, purchaseMeta)
      return { vendorId: config.storeId, storeSlug: config.storeSlug, result }
    }),
  )

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          vendorId: 'unknown',
          storeSlug: 'unknown',
          result: { ok: false, status: 0, message: r.reason instanceof Error ? r.reason.message : String(r.reason) },
        },
  )
}
