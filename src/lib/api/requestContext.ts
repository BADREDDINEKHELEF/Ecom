/**
 * Request context / correlation-id helpers.
 *
 * This module is server-only — it uses Node.js AsyncLocalStorage.
 * It is safe to import from API routes and middleware; do not import it into
 * client components or edge runtime files that cannot load `async_hooks`.
 *
 * Usage in a route handler:
 *   import { withRequestContext } from '@/lib/api/requestContext'
 *   export const POST = withRequestContext(async (req) => { ... })
 *
 * Usage in middleware:
 *   import { addRequestId } from '@/lib/api/requestContext'
 *   const res = addRequestId(req, NextResponse.next())
 */

import { randomUUID } from 'crypto'
import { AsyncLocalStorage } from 'async_hooks'
import { NextRequest, NextResponse } from 'next/server'
import { logger, registerContextGetter, type RequestContext } from '@/lib/logger'
import { getClientIp } from '@/lib/utils/ip'

const REQUEST_ID_HEADER = 'x-request-id'
const CORRELATION_ID_HEADER = 'x-correlation-id'

const requestStore = new AsyncLocalStorage<RequestContext>()

registerContextGetter(() => requestStore.getStore())

// Override the base logger's no-op setContext
logger.setContext = (ctx: Partial<RequestContext>) => {
  const store = requestStore.getStore()
  if (!store) return
  Object.assign(store, ctx)
}

export interface RequestContextOptions {
  action?: string
  userId?: string
  vendorId?: string
  orderId?: string
}

function generateId(): string {
  return randomUUID()
}

function getHeader(req: NextRequest, name: string): string | undefined {
  const value = req.headers.get(name)
  return value?.trim() || undefined
}

/**
 * Build a request-scoped context from an incoming NextRequest.
 * Honours incoming x-request-id / x-correlation-id headers so traces can
 * span multiple services; generates a fresh requestId if absent.
 */
export function buildRequestContext(req: NextRequest, opts: RequestContextOptions = {}): RequestContext {
  const requestId = getHeader(req, REQUEST_ID_HEADER) ?? generateId()
  const correlationId = getHeader(req, CORRELATION_ID_HEADER) ?? opts.orderId ?? requestId
  return {
    requestId,
    correlationId,
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
    ...opts,
  }
}

/**
 * Attach request-id / correlation-id headers to a response so the client can
 * reference them in support tickets and downstream logs.
 */
export function addRequestId(req: NextRequest, res: NextResponse): NextResponse {
  const requestId = getHeader(req, REQUEST_ID_HEADER) ?? generateId()
  const correlationId = getHeader(req, CORRELATION_ID_HEADER) ?? requestId
  res.headers.set(REQUEST_ID_HEADER, requestId)
  res.headers.set(CORRELATION_ID_HEADER, correlationId)
  return res
}

/**
 * Higher-order wrapper for route handlers.
 * Runs the handler inside a request-scoped logging context and attaches
 * request-id / correlation-id headers to every outgoing response.
 *
 * Unexpected errors are caught, logged, and converted to a safe 500 response
 * that never leaks stack traces or environment secrets.
 */
export function withRequestContext(
  handler: (req: NextRequest) => Promise<NextResponse>,
  opts?: RequestContextOptions
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const ctx = buildRequestContext(req, opts)
    return requestStore.run(ctx, async () => {
      try {
        const res = await handler(req)
        return addRequestId(req, res)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error('[route] unhandled error', {
          error: message,
          ...(process.env.NODE_ENV !== 'production' && err instanceof Error
            ? { stack: err.stack }
            : {}),
        })
        const safeMessage = process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : message
        return addRequestId(req, NextResponse.json(
          { error: safeMessage },
          { status: 500 }
        ))
      }
    })
  }
}
