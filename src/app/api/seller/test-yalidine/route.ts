import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId } from '@/lib/supabase/vendors'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const { apiId, apiToken } = await req.json()
    if (!apiId || !apiToken) {
      return NextResponse.json({ error: 'apiId and apiToken are required' }, { status: 400 })
    }

    // Call Yalidine API to verify credentials
    const response = await fetch('https://api.yalidine.app/v1/wilayas/', {
      headers: {
        'X-API-ID':    apiId,
        'X-API-TOKEN': apiToken,
      },
    })

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ success: false, message: 'Identifiants invalides. Vérifiez votre API ID et Token.' })
    }

    if (!response.ok) {
      return NextResponse.json({ success: false, message: `Erreur Yalidine (${response.status}). Réessayez plus tard.` })
    }

    return NextResponse.json({ success: true, message: 'Connexion réussie ! Vos identifiants Yalidine sont valides.' })
  } catch (err) {
    console.error('[POST /api/seller/test-yalidine]', err)
    return NextResponse.json({ success: false, message: 'Impossible de joindre Yalidine. Vérifiez votre connexion.' })
  }
}
