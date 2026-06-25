import { logger } from '@/lib/logger'

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

interface SatimOrderStatusRaw {
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

  let res: Response
  try {
    res = await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/register.do?${qs}`)
  } catch (err) {
    logger.error('[satim] registerOrder network error', { error: err instanceof Error ? err.message : String(err) })
    throw new Error('Satim register failed: network error')
  }

  if (!res.ok) {
    logger.error('[satim] registerOrder non-ok status', { status: res.status })
    throw new Error(`Satim register failed: ${res.status}`)
  }

  let data: Record<string, unknown>
  try {
    data = await res.json()
  } catch {
    logger.error('[satim] registerOrder invalid JSON response')
    throw new Error('Satim register failed: invalid response')
  }

  if (data.errorCode && data.errorCode !== '0') {
    logger.error('[satim] registerOrder error', { errorCode: data.errorCode, errorMessage: data.errorMessage })
    throw new Error(`Satim error ${data.errorCode}: ${data.errorMessage ?? 'unknown'}`)
  }

  return { satimOrderId: String(data.orderId ?? ''), formUrl: String(data.formUrl ?? '') }
}

export async function satimGetOrderStatus(satimOrderId: string): Promise<SatimOrderStatus> {
  if (!satimConfigured()) throw new Error('Satim not configured')

  const qs = satimParams({ orderId: satimOrderId })

  let res: Response
  try {
    res = await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/getOrderStatus.do?${qs}`)
  } catch (err) {
    logger.error('[satim] getOrderStatus network error', { error: err instanceof Error ? err.message : String(err) })
    throw new Error('Satim status check failed: network error')
  }

  if (!res.ok) {
    logger.error('[satim] getOrderStatus non-ok status', { status: res.status, satimOrderId })
    throw new Error(`Satim status check failed: ${res.status}`)
  }

  let data: SatimOrderStatusRaw
  try {
    data = await res.json()
  } catch {
    logger.error('[satim] getOrderStatus invalid JSON response', { satimOrderId })
    throw new Error('Satim status check failed: invalid response')
  }

  return {
    orderStatus: data.orderStatus,
    orderNumber: data.orderNumber,
    amount:      data.amount,
    currency:    data.currency,
    errorCode:   data.errorCode,
    errorMessage: data.errorMessage,
  }
}

export async function satimConfirmOrder(satimOrderId: string): Promise<void> {
  if (!satimConfigured()) return

  const qs = satimParams({ mdOrder: satimOrderId })

  try {
    const res = await fetch(`${process.env.SATIM_BASE_URL}/payment/rest/confirmOrder.do?${qs}`)
    if (!res.ok) {
      logger.error('[satim] confirmOrder failed', { status: res.status, satimOrderId })
    }
  } catch (err) {
    logger.error('[satim] confirmOrder network error', { error: err instanceof Error ? err.message : String(err), satimOrderId })
  }
}
