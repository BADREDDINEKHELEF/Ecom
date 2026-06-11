import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/utils/ip'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

const QuestionSchema = z.object({
  author_name: z.string().min(2).max(100),
  question:    z.string().min(5).max(500),
  phone:       z.string().max(20).optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('product_questions')
      .select('id, author_name, question, answer, answered_at, created_at')
      .eq('product_id', productId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('[GET /api/questions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'product_questions')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de demandes. Réessayez plus tard.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = QuestionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('product_questions')
      .insert({
        product_id:  productId,
        author_name: parsed.data.author_name,
        question:    parsed.data.question,
        phone:       parsed.data.phone ?? null,
        is_public:   true,
      })
      .select('id, author_name, question, answer, answered_at, created_at')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/questions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
