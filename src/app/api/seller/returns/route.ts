import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSellerWithRateLimit, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSellerWithRateLimit(req, 'returns_read', 60, 60)
    if (auth instanceof NextResponse) return auth
    const { vendor } = auth

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('return_requests')
      .select('*, orders(full_name, phone, wilaya, total)')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({ returns: data ?? [] })
  } catch (err) {
    return logAndReturnError('[GET /api/seller/returns]', err)
  }
}
