import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { createHash } from 'crypto'

// Transparent 1×1 GIF
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// UUID v4 pattern — pixel IDs stored in DB are UUIDs generated at vendor creation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Allowlist of permitted event type names (prevents arbitrary string injection into DB)
const ALLOWED_EVENT_TYPES = new Set([
  'pageview', 'view_content', 'add_to_cart', 'initiate_checkout',
  'purchase', 'search', 'lead', 'subscribe', 'custom',
])

function sanitizeEventType(raw: string): string {
  const lower = raw.toLowerCase().slice(0, 50).replace(/[^a-z0-9_]/g, '_')
  return ALLOWED_EVENT_TYPES.has(lower) ? lower : 'pageview'
}

export async function GET(req: NextRequest) {
  const clientIp = getIp(req)
  // Rate limit the GIF endpoint — without this an attacker can insert millions of fake events
  const rl = await checkPublicRateLimit(clientIp, 'pixel_collect_get')
  const rateLimited = !rl.allowed

  const { searchParams } = new URL(req.url)
  const pixelId   = searchParams.get('pid')
  const eventType = sanitizeEventType(searchParams.get('e') ?? 'pageview')
  const pageUrl   = searchParams.get('u')?.slice(0, 2000) ?? null
  const referrer  = searchParams.get('r')?.slice(0, 500) ?? null

  // Always return the GIF — tracking is fire-and-forget; rate-limited hits still get the pixel
  const response = new NextResponse(GIF, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })

  if (!pixelId || rateLimited || !UUID_RE.test(pixelId)) return response

  // Resolve vendor from pixel_id async — don't block the response
  void (async () => {
    try {
      const supabase = createAdminClient()
      const { data: vendor } = await supabase
        .from('vendors')
        .select('id')
        .eq('pixel_id', pixelId)
        .single()
      if (!vendor) return

      await supabase.from('pixel_events').insert({
        vendor_id:  vendor.id,
        event_type: eventType,
        page_url:   pageUrl,
        referrer:   referrer,
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        ip_hash:    hashIp(clientIp),
      })
    } catch {}
  })()

  return response
}

export async function POST(req: NextRequest) {
  // Rate-limit pixel events: 60/min per IP (normal visitor activity)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const rl = await checkPublicRateLimit(clientIp, 'pixel_collect')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  try {
    const body = await req.json()
    const { pixelId, event, url, referrer, meta } = body as {
      pixelId: string
      event:   string
      url?:    string
      referrer?: string
      meta?:   Record<string, unknown>
    }

    if (!pixelId || !event || !UUID_RE.test(pixelId)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: vendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('pixel_id', pixelId)
      .single()

    if (!vendor) return NextResponse.json({ ok: false }, { status: 404 })

    await supabase.from('pixel_events').insert({
      vendor_id:  vendor.id,
      event_type: sanitizeEventType(event),
      page_url:   url ?? null,
      referrer:   referrer ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
      ip_hash:    hashIp(getIp(req)),
      meta:       meta ?? {},
    })

    return NextResponse.json({ ok: true }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const rl = await checkPublicRateLimit(clientIp, 'pixel_collect_options')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
