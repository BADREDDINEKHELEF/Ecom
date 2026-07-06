import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { validateStoreSlug } from '@/lib/validation/slug'

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
  email:       z.string().email().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'register', 5, 3600)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    // Authenticate — try session cookie first, then fall back to Authorization header
    let user_id: string | null = null

    const routeClient = createRouteClient(req)
    const { data: { user: sessionUser }, error: authErr } = await routeClient.auth.getUser()
    if (sessionUser && !authErr) {
      user_id = sessionUser.id
    } else {
      // Fallback: accept Bearer token from Authorization header
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const supabaseAnon = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        )
        const { data: { user: tokenUser } } = await supabaseAnon.auth.getUser(token)
        if (tokenUser) user_id = tokenUser.id
      }
    }

    // Fallback for email-confirmation flows: signUp() may not return a session,
    // but if the client passes the email we can look up the freshly-created auth
    // user via the GoTrue admin API and create the vendor on their behalf.
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsedBody = Schema.safeParse(body)
    if (!parsedBody.success) {
      const details = process.env.NODE_ENV === 'development' ? parsedBody.error.flatten() : undefined
      return NextResponse.json(
        { error: 'Validation failed', ...(details && { details }) },
        { status: 400 }
      )
    }

    if (!user_id) {
      // Email-based lookup was removed: knowing a user's email address must not
      // be enough to create a vendor record in their name. The client must
      // authenticate via session cookie or a valid Bearer token first.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = parsedBody
    const { store_name, store_slug, phone, wilaya, description, logo_url, email } = parsed.data

    // Validate slug format and reserved names server-side
    const slugValidation = validateStoreSlug(store_slug)
    if (!slugValidation.ok) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check slug uniqueness case-insensitively so "My-Shop" and "my-shop" collide.
    const { data: existing } = await supabase
      .from('vendors')
      .select('id')
      .ilike('store_slug', store_slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 })
    }

    // Prevent one user from registering multiple stores.
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .or(`user_id.eq.${user_id},owner_id.eq.${user_id}`)
      .maybeSingle()
    if (existingVendor) {
      return NextResponse.json({ error: 'Vous avez déjà une boutique.' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        user_id,
        owner_id:    user_id,
        store_name,
        store_slug:  store_slug.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''),
        phone:       phone ?? null,
        wilaya:      wilaya ?? null,
        description: description ?? null,
        logo_url:    logo_url ?? null,
        email:       email ?? null,
        commission_rate: 10,
        is_approved: false,
        is_active:   true,
        subscription_status: 'trial',
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
