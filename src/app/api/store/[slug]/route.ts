import { NextRequest, NextResponse } from 'next/server'
import { getVendorBySlug } from '@/lib/supabase/vendors'
import { createClient } from '@/lib/supabase/client'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const vendor = await getVendorBySlug(slug)
  if (!vendor) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const supabase = createClient()

  // Products + aggregate stats
  const [{ data: products }, { count: totalOrders }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
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
