import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dbToProduct } from '@/lib/supabase/products'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { CompareQuerySchema } from '@/lib/validation/apiSchemas'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'compare')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } })

  const rawIds = req.nextUrl.searchParams.get('ids')
  if (!rawIds) return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const idList = rawIds.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)
  const parsed = CompareQuerySchema.safeParse({ ids: idList })
  if (!parsed.success) return NextResponse.json({ error: 'ids invalid' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id,niche_id,category,name,description,price,compare_price,images,stock,rating,review_count,tags,is_new,is_featured,vendor_id,condition,meta_title,meta_description,is_pre_order,pre_order_date,min_order_quantity,is_bundle,created_at')
    .in('id', parsed.data.ids)

  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })

  return NextResponse.json((data ?? []).map(dbToProduct))
}
