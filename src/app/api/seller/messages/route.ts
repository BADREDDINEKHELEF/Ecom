import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserId } from '@/lib/supabase/vendors'

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const url   = new URL(req.url)
    const phone = url.searchParams.get('phone')
    const admin = createAdminClient()

    if (phone) {
      // Thread view: all messages with one buyer
      const { data } = await admin
        .from('messages')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('buyer_phone', phone)
        .order('created_at', { ascending: true })

      // Mark buyer messages as read
      await admin
        .from('messages')
        .update({ is_read: true })
        .eq('vendor_id', vendor.id)
        .eq('buyer_phone', phone)
        .eq('sender', 'buyer')

      return NextResponse.json({ messages: data ?? [] })
    }

    // Inbox: last message per buyer, sorted by recency
    const { data } = await admin
      .from('messages')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    // Group by buyer_phone — keep only latest message per thread
    const seen = new Set<string>()
    const threads = (data ?? []).filter((m) => {
      if (seen.has(m.buyer_phone)) return false
      seen.add(m.buyer_phone)
      return true
    })

    // Count unread per thread
    const unreadCounts: Record<string, number> = {}
    for (const m of (data ?? [])) {
      if (!m.is_read && m.sender === 'buyer') {
        unreadCounts[m.buyer_phone] = (unreadCounts[m.buyer_phone] ?? 0) + 1
      }
    }

    return NextResponse.json({ threads, unreadCounts })
  } catch (err) {
    console.error('[GET /api/seller/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const { buyerPhone, buyerName, content, orderId } = await req.json()
    if (!buyerPhone || !content) return NextResponse.json({ error: 'buyerPhone and content required' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('messages')
      .insert({
        vendor_id:   vendor.id,
        order_id:    orderId ?? null,
        buyer_phone: buyerPhone,
        buyer_name:  buyerName ?? 'Client',
        sender:      'seller',
        content,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ message: data })
  } catch (err) {
    console.error('[POST /api/seller/messages]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
