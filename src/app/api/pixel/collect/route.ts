import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pixelId   = searchParams.get('pid')
  const eventType = searchParams.get('e') ?? 'pageview'
  const pageUrl   = searchParams.get('u')
  const referrer  = searchParams.get('r')

  // Always return the GIF immediately — tracking is fire-and-forget
  const response = new NextResponse(GIF, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    },
  })

  if (!pixelId) return response

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
        page_url:   pageUrl ?? null,
        referrer:   referrer ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
        ip_hash:    hashIp(getIp(req)),
      })
    } catch {}
  })()

  return response
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pixelId, event, url, referrer, meta } = body as {
      pixelId: string
      event:   string
      url?:    string
      referrer?: string
      meta?:   Record<string, unknown>
    }

    if (!pixelId || !event) {
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
      event_type: event,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
