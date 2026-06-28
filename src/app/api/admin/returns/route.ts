import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminWithRateLimit, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  const denied = await requireAdminWithRateLimit(req, 'returns_read', 120, 60)
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('return_requests')
      .select('*, orders(full_name, phone, wilaya, total)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return NextResponse.json({ returns: data ?? [] })
  } catch (err) {
    return logAndReturnError('[GET /api/admin/returns]', err)
  }
}
