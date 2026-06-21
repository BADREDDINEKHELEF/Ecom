import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const ALLOWED_STORAGE_HOSTS = ['supabase.co', 'supabase.in']

function safeStorageUrl() {
  return z.string().url().refine((url) => {
    try {
      const { protocol, hostname } = new URL(url)
      return protocol === 'https:' && ALLOWED_STORAGE_HOSTS.some((h) => hostname.endsWith(h))
    } catch { return false }
  }, { message: 'URL must be an https Supabase storage URL' }).nullable().optional()
}

const Schema = z.object({
  store_name:  z.string().min(1).max(100),
  store_slug:  z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  phone:       z.string().max(20).nullable().optional(),
  wilaya:      z.string().max(60).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  logo_url:    safeStorageUrl(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'register', 5, 3600)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    // Authenticate — derive user_id from session, never trust client
    const routeClient = createRouteClient(req)
    const { data: { user }, error: authErr } = await routeClient.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { store_name, store_slug, phone, wilaya, description, logo_url } = parsed.data
    const user_id = user.id

    const supabase = createAdminClient()

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .eq('store_slug', store_slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        user_id,
        store_name,
        store_slug,
        phone:       phone ?? null,
        wilaya:      wilaya ?? null,
        description: description ?? null,
        logo_url:    logo_url ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ vendor: data }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/seller/register]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur. Réessayez.' }, { status: 500 })
  }
}
