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
}

export function baridimobConfigured(): boolean {
  return !!(process.env.BARIDIMOB_MERCHANT_ID && process.env.BARIDIMOB_API_KEY && process.env.BARIDIMOB_BASE_URL)
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

export async function baridimobVerifyPayment(paymentId: string): Promise<{ paid: boolean; status: string }> {
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

  let data: BaridiMobStatusResponse
  try {
    data = await res.json()
  } catch {
    logger.error('[baridimob] verifyPayment invalid JSON response', { paymentId })
    throw new Error('BaridiMob status check failed: invalid response')
  }

  return { paid: data.status === 'paid' || data.paid === true, status: data.status }
}
