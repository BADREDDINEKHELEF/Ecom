import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getReviews, addReview } from '@/lib/supabase/queries'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Params { params: Promise<{ productId: string }> }

const ReviewSchema = z.object({
  author_name: z.string().min(1).max(100),
  rating:      z.number().int().min(1).max(5),
  comment:     z.string().min(1).max(1000),
  phone:       z.string().max(20).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'reviews_get')
  if (!rl.allowed) return NextResponse.json([], { status: 429 })

  try {
    const { productId } = await params
    if (!UUID_RE.test(productId)) return NextResponse.json([], { status: 400 })
    const reviews = await getReviews(productId)
    return NextResponse.json(reviews)
  } catch (err) {
    logger.error('[GET /api/reviews/[productId]]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'reviews_post')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  try {
    const { productId } = await params
    if (!UUID_RE.test(productId)) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

    await addReview({
      product_id:  productId,
      author_name: parsed.data.author_name.trim(),
      rating:      parsed.data.rating,
      comment:     parsed.data.comment.trim(),
      phone:       parsed.data.phone?.trim() || null,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/reviews/[productId]]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
