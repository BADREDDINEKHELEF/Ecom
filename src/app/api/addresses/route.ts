import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const AddressSchema = z.object({
  label:     z.string().min(1).max(50).default('Domicile'),
  full_name: z.string().min(2).max(200),
  phone:     z.string().min(8).max(20),
  address:   z.string().min(5).max(500),
  city:      z.string().min(1).max(200),
  wilaya:    z.string().min(1).max(100),
  is_default: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'addresses_read')
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('saved_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return copyCookies(response, NextResponse.json(data ?? []))
  } catch (err) {
    logger.error('[GET /api/addresses]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'addresses_write')
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = AddressSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Validation failed' }, { status: 400 }))

    const admin = createAdminClient()

    // Enforce per-user limit (prevents unbounded growth)
    const { count } = await admin
      .from('saved_addresses')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) >= 10) {
      return copyCookies(response, NextResponse.json({ error: 'Maximum 10 adresses enregistrées' }, { status: 400 }))
    }

    // Clear existing default before setting a new one.
    // A concurrent request could also set is_default=true between these two statements —
    // fully preventing that requires a DB-level unique partial index on (user_id) WHERE is_default=true.
    if (parsed.data.is_default) {
      await admin.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id)
    }

    const { data, error } = await admin
      .from('saved_addresses')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return copyCookies(response, NextResponse.json(data, { status: 201 }))
  } catch (err) {
    logger.error('[POST /api/addresses]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
