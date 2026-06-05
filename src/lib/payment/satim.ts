/**
 * Satim payment gateway integration — Algeria's national payment switch.
 * Handles CIB (interbank) and Edahabia cards.
 * Docs: https://satim.dz (requires merchant account from a member bank)
 *
 * Required env vars:
 *   SATIM_USERNAME   — merchant username (from Satim member bank)
 *   SATIM_PASSWORD   — merchant password
 *   SATIM_BASE_URL   — usually https://satim.dz (or test URL for sandbox)
 *   NEXT_PUBLIC_APP_URL — your app's base URL for callbacks
 */

export interface SatimRegisterResult {
  satimOrderId: string
  formUrl: string
}

export interface SatimOrderStatus {
  orderStatus: number
  orderNumber: string
  amount: number
  currency: string
  errorCode?: string
  errorMessage?: string
}

export function satimConfigured(): boolean {
  return !!(process.env.SATIM_USERNAME && process.env.SATIM_PASSWORD && process.env.SATIM_BASE_URL)
}

function satimParams(extra: Record<string, string>): string {
  const base = {
    userName: process.env.SATIM_USERNAME!,
    password: process.env.SATIM_PASSWORD!,
    ...extra,
  }
  return new URLSearchParams(base).toString()
}

/** Register an order with Satim and get the redirect URL. Amount must be in centimes (DZD × 100). */
export async function satimRegisterOrder(params: {
  orderNumber: string
  amountCentimes: number
  description: string
  returnUrl: string
  failUrl: string
  language?: string
}): Promise<SatimRegisterResult> {
  if (!satimConfigured()) throw new Error('Satim not configured')

  const qs = satimParams({
    orderNumber: params.orderNumber,
    amount:      String(params.amountCentimes),
    currency:    '012',
    returnUrl:   params.returnUrl,
    failUrl:     params.failUrl,
    language:    params.language ?? 'fr',
    description: params.description,
  })

  const res = await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/register.do?${qs}`)
  if (!res.ok) throw new Error(`Satim register failed: ${res.status}`)

  const data = await res.json()
  if (data.errorCode && data.errorCode !== '0') {
    throw new Error(`Satim error ${data.errorCode}: ${data.errorMessage ?? 'unknown'}`)
  }

  return { satimOrderId: data.orderId, formUrl: data.formUrl }
}

/** Get order payment status from Satim. orderStatus 2 = paid successfully. */
export async function satimGetOrderStatus(satimOrderId: string): Promise<SatimOrderStatus> {
  if (!satimConfigured()) throw new Error('Satim not configured')

  const qs = satimParams({ orderId: satimOrderId })
  const res = await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/getOrderStatus.do?${qs}`)
  if (!res.ok) throw new Error(`Satim status check failed: ${res.status}`)

  return res.json()
}

/** Confirm/capture a paid order (required by some Satim configurations). */
export async function satimConfirmOrder(satimOrderId: string): Promise<void> {
  if (!satimConfigured()) return

  const qs = satimParams({ mdOrder: satimOrderId })
  await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/confirmOrder.do?${qs}`)
}
