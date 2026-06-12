import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const Schema = z.object({
  answer: z.string().min(1).max(1000),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Réponse invalide' }, { status: 400 })

    const admin = createAdminClient()

    // Verify the question belongs to one of this vendor's products
    const { data: question } = await admin
      .from('product_questions')
      .select('id, product_id')
      .eq('id', questionId)
      .single()

    if (!question) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

    const { data: product } = await admin
      .from('products')
      .select('id, vendor_id')
      .eq('id', question.product_id)
      .single()

    if (!product || product.vendor_id !== vendor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('product_questions')
      .update({ answer: parsed.data.answer, answered_at: new Date().toISOString() })
      .eq('id', questionId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/questions/answer]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
