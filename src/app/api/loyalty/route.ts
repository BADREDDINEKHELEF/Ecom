import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getPointsBalance } from '@/lib/loyalty'

export async function GET(req: NextRequest) {
  const supabase = createRouteClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const balance = await getPointsBalance(user.id)
  return NextResponse.json({ balance })
}
