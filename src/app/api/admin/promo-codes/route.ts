import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const CreateSchema = z.object({
  code:           z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, 'Code must be alphanumeric').transform((v) => v.toUpperCase().trim()),
  discount_type:  z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive().max(100_000),
  min_order:      z.number().min(0).max(1_000_000).default(0),
  max_uses:       z.number().int().positive().nullable().optional().default(null),
  expires_at:     z.string().datetime().nullable().optional().default(null),
  is_active:      z.boolean().default(true),
})

const UpdateSchema = z.object({
  id:             z.string().uuid(),
  code:           z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/).transform((v) => v.toUpperCase().trim()).optional(),
  discount_type:  z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().positive().max(100_000).optional(),
  min_order:      z.number().min(0).max(1_000_000).optional(),
  max_uses:       z.number().int().positive().nullable().optional(),
  expires_at:     z.string().datetime().nullable().optional(),
  is_active:      z.boolean().optional(),
})

const DeleteSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promo_codes_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id,code,discount_type,discount_value,min_order,max_uses,uses_count,expires_at,is_active,created_at')
    .order('created_at', { ascending: false })
  if (error) {
    logger.error('[GET /api/admin/promo-codes]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promo_codes_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
    return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('promo_codes').insert(parsed.data)
  if (error) {
    logger.error('[POST /api/admin/promo-codes]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promo_codes_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
    return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
  }

  const { id, ...updates } = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('promo_codes').update(updates).eq('id', id)
  if (error) {
    logger.error('[PATCH /api/admin/promo-codes]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'promo_codes_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid UUID id required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('promo_codes').delete().eq('id', parsed.data.id)
  if (error) {
    logger.error('[DELETE /api/admin/promo-codes]', { error: error.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
