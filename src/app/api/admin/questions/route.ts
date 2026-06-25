import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ApproveQuestionSchema = z.object({
  id: z.string().regex(UUID_RE, 'Invalid question id'),
  action: z.enum(['approve', 'reject']),
})

// GET /api/admin/questions — list pending (is_public=false) questions
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'questions_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const page  = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
    const limit = 50

    const { data, error, count } = await supabase
      .from('product_questions')
      .select('id,product_id,author_name,question,answer,is_public,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) throw error
    return NextResponse.json({ questions: data ?? [], total: count ?? 0 })
  } catch (err) {
    logger.error('[GET /api/admin/questions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/questions — approve or reject a question
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'questions_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ApproveQuestionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'id and action (approve|reject) required' }, { status: 400 })
    }

    const { id, action } = parsed.data
    const supabase = createAdminClient()

    if (action === 'reject') {
      const { error } = await supabase.from('product_questions').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    const { data, error } = await supabase
      .from('product_questions')
      .update({ is_public: true })
      .eq('id', id)
      .select('id')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/questions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
