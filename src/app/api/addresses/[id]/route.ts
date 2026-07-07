import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const PatchSchema = z.object({
  label:      z.string().min(1).max(50).optional(),
  full_name:  z.string().min(2).max(200).optional(),
  phone:      z.string().min(8).max(20).optional(),
  address:    z.string().min(5).max(500).optional(),
  city:       z.string().min(1).max(200).optional(),
  wilaya:     z.string().min(1).max(100).optional(),
  is_default: z.boolean().optional(),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next()
  const { id } = await params
  if (!UUID_RE.test(id)) return copyCookies(response, NextResponse.json({ error: 'Invalid id' }, { status: 400 }))

  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'addresses_write')
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))

  try {
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Validation failed' }, { status: 400 }))

    const admin = createAdminClient()

    if (parsed.data.is_default) {
      await admin.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id)
    }

    const { data: updated, error } = await admin
      .from('saved_addresses')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error) throw error
    if (!updated) return copyCookies(response, NextResponse.json({ error: 'Adresse introuvable' }, { status: 404 }))
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/addresses/[id]]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next()
  const { id } = await params
  if (!UUID_RE.test(id)) return copyCookies(response, NextResponse.json({ error: 'Invalid id' }, { status: 400 }))

  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'addresses_write')
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))

  try {
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const admin = createAdminClient()
    const { error } = await admin
      .from('saved_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[DELETE /api/addresses/[id]]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
