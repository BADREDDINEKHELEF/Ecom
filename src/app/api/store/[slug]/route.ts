import { NextRequest, NextResponse } from 'next/server'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'store_details')
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { slug } = await params

  const vendor = await getVendorBySlug(slug)
  if (!vendor) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const supabase = createAdminClient()

  // Products + aggregate stats
  const [{ data: products }, { count: totalOrders }] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,description,price,compare_price,images,stock,rating,review_count,tags,category,niche_id,is_new,is_featured,vendor_id,created_at')
      .eq('vendor_id', vendor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)
      .eq('status', 'delivered'),
  ])

  return NextResponse.json({
    vendor: {
      id:             vendor.id,
      store_name:     vendor.store_name,
      store_slug:     vendor.store_slug,
      logo_url:       vendor.logo_url,
      banner_url:     vendor.banner_url,
      accent_color:   vendor.accent_color,
      description:    vendor.description,
      wilaya:         vendor.wilaya,
      is_approved:    vendor.is_approved,
      seo_title:      vendor.seo_title,
      seo_description: vendor.seo_description,
      member_since:   vendor.created_at,
    },
    products:    products ?? [],
    totalOrders: totalOrders ?? 0,
  })
}
