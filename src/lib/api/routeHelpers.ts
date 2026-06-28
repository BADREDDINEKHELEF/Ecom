import { NextRequest, NextResponse } from 'next/server'
import type { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, type Vendor } from '@/lib/supabase/vendors'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { checkSellerRateLimit, checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function rateLimitResponse(rl: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
  )
}

export async function parseBody(req: NextRequest): Promise<{ data: unknown } | NextResponse> {
  try {
    return { data: await req.json() }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
}

export function validateSchema<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { data: T } | NextResponse {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
    return NextResponse.json(
      { error: 'Validation failed', ...(details && { details }) },
      { status: 400 },
    )
  }
  return { data: parsed.data }
}

export async function parseAndValidate<T>(
  req: NextRequest,
  schema: z.ZodType<T>,
): Promise<{ data: T } | NextResponse> {
  const bodyResult = await parseBody(req)
  if (bodyResult instanceof NextResponse) return bodyResult
  return validateSchema(schema, bodyResult.data)
}

export interface SellerIdentity {
  user: { id: string; email?: string }
  vendor: Vendor
}

export async function requireSeller(req: NextRequest): Promise<SellerIdentity | NextResponse> {
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })
  }

  return { user: { id: user.id, email: user.email }, vendor }
}

export async function requireSellerWithRateLimit(
  req: NextRequest,
  namespace: string,
  maxRequests = 60,
  windowSeconds = 60,
): Promise<SellerIdentity | NextResponse> {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, namespace, maxRequests, windowSeconds)
  if (!rl.allowed) return rateLimitResponse(rl)
  return requireSeller(req)
}

export async function requireAdminWithRateLimit(
  req: NextRequest,
  namespace: string,
  maxRequests = 120,
  windowSeconds = 60,
): Promise<NextResponse | null> {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, namespace, maxRequests, windowSeconds)
  if (!rl.allowed) return rateLimitResponse(rl)
  return null
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function logAndReturnError(tag: string, err: unknown, message = 'Internal server error'): NextResponse {
  logger.error(tag, { error: errorMessage(err) })
  return NextResponse.json({ error: message }, { status: 500 })
}
