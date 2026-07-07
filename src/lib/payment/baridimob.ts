import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

export interface BaridiMobPaymentResult {
  paymentId: string
  qrCodeData: string
  deepLink: string
  expiresAt: string
}

interface BaridiMobInitiateResponse {
  payment_id?: string
  id?: string
  qr_code?: string
  qrcode?: string
  deep_link?: string
  deeplink?: string
  expires_at?: string
  expiry?: string
}

interface BaridiMobStatusResponse {
  status: string
  paid?: boolean
  amount?: number
}

// ── Strict type guard for the status response ────────────────────────────────
function assertBaridiMobStatusResponse(data: unknown): asserts data is BaridiMobStatusResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('BaridiMob status response is not an object')
  }
  const d = data as Record<string, unknown>
  if (typeof d.status !== 'string') {
    throw new Error(`BaridiMob status response missing required string field 'status'; got ${JSON.stringify(d)}`)
  }
  if ('paid' in d && typeof d.paid !== 'boolean' && typeof d.paid !== 'undefined') {
    throw new Error(`BaridiMob status response field 'paid' has unexpected type ${typeof d.paid}`)
  }
}

export function baridimobConfigured(): boolean {
  return !!(
    process.env.BARIDIMOB_MERCHANT_ID &&
    process.env.BARIDIMOB_API_KEY &&
    process.env.BARIDIMOB_BASE_URL &&
    process.env.BARIDIMOB_WEBHOOK_SECRET
  )
}

// ── HMAC-SHA256 webhook signature verification ───────────────────────────────
// Expected header: X-BaridiMob-Signature: sha256=<hex-digest>
// Signature is computed over the raw request body bytes.
export function verifyBaridiMobWebhook(rawBody: Buffer, signatureHeader: string | null): boolean {
  const secret = process.env.BARIDIMOB_WEBHOOK_SECRET
  if (!secret) {
    logger.warn('[baridimob] BARIDIMOB_WEBHOOK_SECRET not set — rejecting webhook')
    return false
  }
  if (!signatureHeader) {
    logger.warn('[baridimob] webhook missing X-BaridiMob-Signature header')
    return false
  }
  // Support "sha256=<hex>" prefix used by many gateway SDKs.
  const hexReceived = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hexReceived, 'hex'))
  } catch {
    // timingSafeEqual throws when the two buffers differ in length.
    return false
  }
}

export async function baridimobInitiatePayment(params: {
  orderNumber: string
  amountDZD: number
  description: string
  callbackUrl: string
}): Promise<BaridiMobPaymentResult> {
  if (!baridimobConfigured()) throw new Error('BaridiMob not configured')

  let res: Response
  try {
    res = await fetch(`${process.env.BARIDIMOB_BASE_URL}/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-ID': process.env.BARIDIMOB_MERCHANT_ID!,
        'X-API-Key':     process.env.BARIDIMOB_API_KEY!,
      },
      body: JSON.stringify({
        order_number: params.orderNumber,
        amount:       params.amountDZD,
        currency:     'DZD',
        description:  params.description,
        callback_url: params.callbackUrl,
      }),
    })
  } catch (err) {
    logger.error('[baridimob] initiatePayment network error', { error: err instanceof Error ? err.message : String(err) })
    throw new Error('BaridiMob initiate failed: network error')
  }

  if (!res.ok) {
    let text = ''
    try { text = await res.text() } catch { /* ignore */ }
    logger.error('[baridimob] initiatePayment non-ok status', { status: res.status, body: text })
    throw new Error(`BaridiMob initiate failed ${res.status}: ${text}`)
  }

  let data: BaridiMobInitiateResponse
  try {
    data = await res.json()
  } catch {
    logger.error('[baridimob] initiatePayment invalid JSON response')
    throw new Error('BaridiMob initiate failed: invalid response')
  }

  const paymentId  = data.payment_id ?? data.id
  const qrCodeData = data.qr_code ?? data.qrcode
  const deepLink   = data.deep_link ?? data.deeplink
  const expiresAt  = data.expires_at ?? data.expiry

  if (!paymentId || !qrCodeData) {
    logger.error('[baridimob] initiatePayment missing fields in response', { data })
    throw new Error('BaridiMob initiate failed: incomplete response')
  }

  return { paymentId, qrCodeData, deepLink: deepLink ?? '', expiresAt: expiresAt ?? '' }
}

export async function baridimobVerifyPayment(
  paymentId: string
): Promise<{ paid: boolean; status: string; amount?: number }> {
  if (!baridimobConfigured()) throw new Error('BaridiMob not configured')

  let res: Response
  try {
    res = await fetch(`${process.env.BARIDIMOB_BASE_URL}/payment/${paymentId}/status`, {
      headers: {
        'X-Merchant-ID': process.env.BARIDIMOB_MERCHANT_ID!,
        'X-API-Key':     process.env.BARIDIMOB_API_KEY!,
      },
    })
  } catch (err) {
    logger.error('[baridimob] verifyPayment network error', { error: err instanceof Error ? err.message : String(err), paymentId })
    throw new Error('BaridiMob status check failed: network error')
  }

  if (!res.ok) {
    logger.error('[baridimob] verifyPayment non-ok status', { status: res.status, paymentId })
    throw new Error(`BaridiMob status check failed: ${res.status}`)
  }

  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    logger.error('[baridimob] verifyPayment invalid JSON response', { paymentId })
    throw new Error('BaridiMob status check failed: invalid response')
  }

  // Fix: strict type guard — throws on unexpected shapes rather than silently
  // returning paid: false, which would hide integration/API shape mismatches.
  try {
    assertBaridiMobStatusResponse(raw)
  } catch (err) {
    logger.error('[baridimob] verifyPayment unexpected response shape', {
      paymentId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw new Error('BaridiMob status check failed: unexpected response shape')
  }
  const data: BaridiMobStatusResponse = raw

  // Fix: case-insensitive comparison so 'PAID', 'Paid', 'paid' all match.
  const isPaid = data.status?.toLowerCase() === 'paid' || data.paid === true
  return { paid: isPaid, status: data.status, amount: data.amount }
}
