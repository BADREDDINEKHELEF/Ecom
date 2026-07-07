/**
 * Structured JSON logger.
 * All output is machine-parseable JSON — works with Vercel log drains, Logtail, etc.
 * Replace console.log/error throughout the codebase with logger.info/error.
 *
 * Observability additions:
 *   - Pluggable request context so every log line inside a request can
 *     automatically include the current requestId / correlationId.
 *   - PII masking helpers so emails, phones and addresses are never emitted
 *     at info level in plaintext.
 *
 * The request-context store lives in a server-only module (requestContext.ts)
 * so this file stays safe to import in browser / edge runtimes.
 */

import { maskEmail, maskPhone } from '@/lib/utils/mask'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export type LogContext = Record<string, unknown>

export interface RequestContext {
  requestId: string
  correlationId?: string
  ip?: string
  userAgent?: string
  userId?: string
  vendorId?: string
  orderId?: string
  action?: string
}

let contextGetter: (() => RequestContext | undefined) | undefined

export function registerContextGetter(getter: () => RequestContext | undefined): void {
  contextGetter = getter
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function getRequestContext(): RequestContext | undefined {
  return contextGetter?.()
}

function log(level: LogLevel, message: string, ctx?: LogContext) {
  const reqCtx = getRequestContext()
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...(reqCtx?.requestId ? { requestId: reqCtx.requestId } : {}),
    ...(reqCtx?.correlationId ? { correlationId: reqCtx.correlationId } : {}),
    ...(reqCtx?.userId ? { userId: reqCtx.userId } : {}),
    ...(reqCtx?.vendorId ? { vendorId: reqCtx.vendorId } : {}),
    ...(reqCtx?.orderId ? { orderId: reqCtx.orderId } : {}),
    ...(reqCtx?.action ? { action: reqCtx.action } : {}),
    ...(reqCtx?.ip ? { ip: reqCtx.ip } : {}),
    ...ctx,
  }

  const line = JSON.stringify(entry)

  switch (level) {
    case 'error': console.error(line); break
    case 'warn':  console.warn(line);  break
    case 'debug': if (!isProduction()) console.debug(line); break
    default:      console.log(line)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info:  (msg: string, ctx?: LogContext) => log('info',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log('warn',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),

  /**
   * Run a function inside a request-scoped logging context.
   * The actual storage is implemented server-side in requestContext.ts.
   */
  withContext<T>(ctx: Partial<RequestContext>, fn: () => Promise<T>): Promise<T> {
    // Server-only modules call registerContextGetter to supply this.
    // If no getter is registered we still run fn so client/edge code doesn't break.
    if (contextGetter) {
      // The context getter is stateless; callers must use a store to implement this.
      // requestContext.ts provides the real implementation.
    }
    return fn()
  },

  /** Update the current request context in-place. Implemented by requestContext.ts. */
  setContext(ctx: Partial<RequestContext>): void {
    // no-op in the base logger; server-side store overrides this
    void ctx
  },

  getRequestContext,
}

/**
 * Mask personally identifiable information.
 * Use these helpers before passing user data to logger.info/warn/error.
 * Emails and phones are masked; addresses are reduced to a short prefix.
 */
export const pii = {
  maskEmail,
  maskPhone,

  maskAddress(address: string | null | undefined): string {
    if (!address) return ''
    if (address.length <= 8) return '***'
    return address.slice(0, 4) + '...' + address.slice(-4)
  },

  /**
   * Recursively mask common PII keys in an object.
   * Safe to pass unknown / Error-like objects. Returns a new object.
   */
  maskObject<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const masked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase()
      if (lower.includes('email') || lower.endsWith('mail')) {
        masked[key] = maskEmail(String(value ?? ''))
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) {
        masked[key] = maskPhone(String(value ?? ''))
      } else if (lower.includes('address') || lower.includes('street') || lower.includes('addr')) {
        masked[key] = pii.maskAddress(String(value ?? ''))
      } else if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('key')) {
        masked[key] = '[REDACTED]'
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        masked[key] = pii.maskObject(value as Record<string, unknown>)
      } else {
        masked[key] = value
      }
    }
    return masked
  },
}
