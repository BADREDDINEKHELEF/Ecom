import { NextResponse } from 'next/server'
import { logger, pii } from '@/lib/logger'

/**
 * Centralised API error handler.
 *
 * - Returns safe, user-facing French messages (never internal DB errors or stack traces)
 * - Logs internal details server-side via logger
 * - Provides machine-readable error codes for client-side handling
 */

const ERROR_MAP = {
  INSUFFICIENT_STOCK:  { message: 'Stock insuffisant pour cet article.',          status: 409 },
  INVALID_PAYMENT:     { message: 'Erreur de paiement. Réessayez.',               status: 402 },
  ORDER_NOT_FOUND:     { message: 'Commande introuvable.',                        status: 404 },
  PRODUCT_NOT_FOUND:   { message: 'Produit introuvable.',                         status: 404 },
  UNAUTHORIZED:        { message: 'Authentification requise.',                    status: 401 },
  FORBIDDEN:           { message: 'Accès non autorisé.',                          status: 403 },
  VALIDATION_ERROR:    { message: 'Données invalides.',                           status: 400 },
  RATE_LIMITED:        { message: 'Trop de requêtes. Réessayez plus tard.',       status: 429 },
  BOOKING_CONFLICT:    { message: 'Cette date n\'est plus disponible.',           status: 409 },
  PAYMENT_VERIFY_FAIL: { message: 'Impossible de vérifier le paiement.',          status: 502 },
  INTERNAL:            { message: 'Erreur interne. Nous travaillons dessus.',     status: 500 },
} as const

export type ErrorCode = keyof typeof ERROR_MAP

/**
 * Returns a safe JSON error response.
 * Internal details are logged but NEVER sent to the client.
 */
export function apiError(code: ErrorCode, internalDetails?: unknown): NextResponse {
  const err = ERROR_MAP[code]

  if (internalDetails !== undefined) {
    logger.error(`[apiError] ${code}`, {
      code,
      internal: internalDetails instanceof Error
        ? { message: internalDetails.message, stack: internalDetails.stack }
        : internalDetails,
    })
  }

  return NextResponse.json(
    { error: err.message, code },
    { status: err.status }
  )
}

/**
 * Handles unknown errors thrown from route handlers.
 * Maps known error message strings to typed codes, falls back to INTERNAL.
 */
export function handleUnknownError(err: unknown): NextResponse {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('stock') || msg.includes('INSUFFICIENT_STOCK'))  return apiError('INSUFFICIENT_STOCK', err)
    if (msg.includes('not found') || msg.includes('NOT_FOUND'))       return apiError('PRODUCT_NOT_FOUND', err)
    if (msg.includes('BOOKING_CONFLICT'))                             return apiError('BOOKING_CONFLICT', err)
  }
  return apiError('INTERNAL', err)
}

/**
 * Safe 500 response for unexpected errors.
 * In production only a generic message is returned; stack traces and raw
 * error messages are logged server-side and never leaked to the client.
 */
export function safeInternalServerError(err: unknown, requestLabel?: string): NextResponse {
  const isProd = process.env.NODE_ENV === 'production'
  const errorObj = err instanceof Error ? err : new Error(String(err))

  logger.error(`[${requestLabel ?? 'route'}] unhandled error`, {
    error: errorObj.message,
    ...(!isProd ? { stack: errorObj.stack } : {}),
  })

  return NextResponse.json(
    {
      error: isProd
        ? 'Erreur interne. Nous travaillons dessus.'
        : errorObj.message,
      code: 'INTERNAL',
    },
    { status: 500 }
  )
}

/**
 * Mask sensitive fields before logging request bodies that may contain PII.
 */
export function safeLogPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return pii.maskObject(payload)
}
