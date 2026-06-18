import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'

export async function POST(req: NextRequest) {
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  let body: { apiId?: string; apiToken?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { apiId, apiToken } = body
  if (!apiId || !apiToken) return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 })

  try {
    // Hit the agencies list endpoint — lightweight GET that validates credentials without side effects
    const res = await fetch('https://api.yalidine.app/v1/agencies/', {
      method: 'GET',
      headers: {
        'X-API-ID': apiId,
        'X-API-TOKEN': apiToken,
      },
    })
    if (!res.ok) return NextResponse.json({ ok: false })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
