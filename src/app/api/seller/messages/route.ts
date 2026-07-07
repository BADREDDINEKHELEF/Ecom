import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const PostSchema = z.object({
  buyerPhone: z.string().min(5).max(30),
  content:    z.string().min(1).max(2000).trim(),
  orderId:    z.string().uuid().optional().nullable(),
  buyerName:  z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'messages_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

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

      return copyCookies(response, NextResponse.json({ messages: data ?? [] }))
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

    return copyCookies(response, NextResponse.json({ threads, unreadCounts }))
  } catch (err) {
    logger.error('[GET /api/seller/messages]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'messages_write', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const userRl = await checkUserDualRateLimit(user.id, 'messages_write', {
      burstMax: 5, burstWindowSecs: 60,
      sustainedMax: 30, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }
    const parsed = PostSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Validation failed' }, { status: 400 }))
    const { buyerPhone, buyerName, content, orderId } = parsed.data

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
    return copyCookies(response, NextResponse.json({ message: data }))
  } catch (err) {
    logger.error('[POST /api/seller/messages]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
