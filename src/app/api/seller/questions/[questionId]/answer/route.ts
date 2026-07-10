import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const Schema = z.object({
  answer: z.string().min(1).max(1000),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const response = NextResponse.next()
  const { questionId } = await params
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'qa_answer', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'messages:send', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserRateLimit(user.id, 'qa_answer', 10, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Réponse invalide' }, { status: 400 }))

    const admin = createAdminClient()

    // Verify the question belongs to one of this vendor's products
    const { data: question } = await admin
      .from('product_questions')
      .select('id, product_id')
      .eq('id', questionId)
      .single()

    if (!question) return copyCookies(response, NextResponse.json({ error: 'Question introuvable' }, { status: 404 }))

    const { data: product } = await admin
      .from('products')
      .select('id, vendor_id')
      .eq('id', question.product_id)
      .single()

    if (!product || product.vendor_id !== vendor.id) {
      return copyCookies(response, NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const { error } = await admin
      .from('product_questions')
      .update({ answer: parsed.data.answer, answered_at: new Date().toISOString() })
      .eq('id', questionId)

    if (error) throw error
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/questions/answer]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
