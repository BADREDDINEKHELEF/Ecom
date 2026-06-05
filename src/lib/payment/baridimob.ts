/**
 * BaridiMob / CCP payment integration — Algeria Post mobile payment.
 * Uses Algeria Post's merchant API (requires partnership with La Poste Algérienne).
 *
 * Required env vars:
 *   BARIDIMOB_MERCHANT_ID  — your merchant ID from Algeria Post
 *   BARIDIMOB_API_KEY      — your API key
 *   BARIDIMOB_BASE_URL     — API base URL (provided on merchant onboarding)
 *   NEXT_PUBLIC_APP_URL    — your app's base URL
 */

export interface BaridiMobPaymentResult {
  paymentId: string
  qrCodeData: string
  deepLink: string
  expiresAt: string
}

export function baridimobConfigured(): boolean {
  return !!(process.env.BARIDIMOB_MERCHANT_ID && process.env.BARIDIMOB_API_KEY && process.env.BARIDIMOB_BASE_URL)
}

/** Initiate a BaridiMob payment. Returns QR code data and deep link for the BaridiMob app. */
export async function baridimobInitiatePayment(params: {
  orderNumber: string
  amountDZD: number
  description: string
  callbackUrl: string
}): Promise<BaridiMobPaymentResult> {
  if (!baridimobConfigured()) throw new Error('BaridiMob not configured')

  const res = await fetch(`${process.env.BARIDIMOB_BASE_URL}/payment/initiate`, {
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

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`BaridiMob initiate failed ${res.status}: ${text}`)
  }

  const data = await res.json()
  return {
    paymentId:  data.payment_id ?? data.id,
    qrCodeData: data.qr_code ?? data.qrcode,
    deepLink:   data.deep_link ?? data.deeplink,
    expiresAt:  data.expires_at ?? data.expiry,
  }
}

/** Verify a BaridiMob payment status by payment ID. */
export async function baridimobVerifyPayment(paymentId: string): Promise<{ paid: boolean; status: string }> {
  if (!baridimobConfigured()) throw new Error('BaridiMob not configured')

  const res = await fetch(`${process.env.BARIDIMOB_BASE_URL}/payment/${paymentId}/status`, {
    headers: {
      'X-Merchant-ID': process.env.BARIDIMOB_MERCHANT_ID!,
      'X-API-Key':     process.env.BARIDIMOB_API_KEY!,
    },
  })

  if (!res.ok) throw new Error(`BaridiMob status check failed: ${res.status}`)
  const data = await res.json()
  return { paid: data.status === 'paid' || data.paid === true, status: data.status }
}
