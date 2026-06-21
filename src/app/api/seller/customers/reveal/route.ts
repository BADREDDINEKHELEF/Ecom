import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { resolvePhoneByHash } from '@/lib/supabase/customers'
import { logSellerDataAccess } from '@/lib/auth/sellerAudit'
import { logSecurityEvent, SEC_EVENT } from '@/lib/auth/securityEvents'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const RevealSchema = z.object({
  phoneHash: z.string().regex(/^[0-9a-f]{16}$/, 'Invalid phone hash'),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  // Gate 1: IP-level — strict because phone reveal is sensitive PII access
  const ipRl = await checkSellerRateLimit(ip, 'reveal_phone', 10, 60)
  if (!ipRl.allowed) {
    void logSecurityEvent({
      actorType: 'seller',
      action:    SEC_EVENT.RATE_LIMIT_EXCEEDED,
      resource:  'customers:reveal_phone',
      ipAddress: ip,
      result:    'blocked',
    })
    return NextResponse.json(
      { error: 'Trop de requêtes.' },
      { status: 429, headers: { 'Retry-After': String(ipRl.retryAfterSeconds) } }
    )
  }

  // Gate 2: Permission — only 'owner' role can reveal phones
  // This also handles auth (returns 401 if not authenticated)
  const result = await requireVendorPermission(req, 'customers:reveal_phone')
  if (result instanceof NextResponse) {
    if (result.status === 403) {
      void logSecurityEvent({
        actorType: 'seller',
        action:    SEC_EVENT.PERMISSION_DENIED,
        resource:  'customers:reveal_phone',
        ipAddress: ip,
        result:    'blocked',
      })
    }
    return result
  }
  const { ctx } = result

  // Gate 3: Per-user hourly cap — max 20 reveals per hour per seller account
  const userRl = await checkUserRateLimit(ctx.user.id, 'reveal_phone', 20, 3600)
  if (!userRl.allowed) {
    return NextResponse.json(
      { error: 'Limite de révélations atteinte. Maximum 20 par heure.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RevealSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

  const phone = await resolvePhoneByHash(ctx.vendor.id, parsed.data.phoneHash)
  if (!phone) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Fire-and-forget audit entries (both seller-level and security-level)
  void logSellerDataAccess({
    vendorId:     ctx.vendor.id,
    action:       'reveal_phone',
    resourceType: 'customer_list',
    resourceId:   parsed.data.phoneHash,
    ipAddress:    ip,
    userAgent:    req.headers.get('user-agent') ?? undefined,
  })

  void logSecurityEvent({
    actorType: 'seller',
    actorId:   ctx.vendor.id,
    action:    SEC_EVENT.CUSTOMER_PHONE_REVEALED,
    resource:  `customer:${parsed.data.phoneHash}`,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') ?? undefined,
    result:    'success',
    meta:      { role: ctx.role },
  })

  return NextResponse.json({ phone })
}
