import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'products_related')
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const { searchParams } = req.nextUrl
  const nicheId   = searchParams.get('nicheId')
  const excludeId = searchParams.get('excludeId')
  const limit     = Math.min(Number(searchParams.get('limit') ?? 8), 20)

  if (!nicheId) return NextResponse.json({ error: 'nicheId required' }, { status: 400 })

  const supabase = createAdminClient()
  let query = supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,created_at')
    .eq('niche_id', nicheId)
    .gt('stock', 0)
    .order('rating', { ascending: false })
    .limit(limit + 1)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json((data ?? []).slice(0, limit).map(dbToProduct))
}
