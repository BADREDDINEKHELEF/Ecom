import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getReviews, addReview } from '@/lib/supabase/queries'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { parseAndValidate, logAndReturnError, rateLimitResponse } from '@/lib/api/routeHelpers'
import { logger } from '@/lib/logger'

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
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const { productId } = await params

    const validated = await parseAndValidate(req, ReviewSchema)
    if (validated instanceof NextResponse) return validated
    const parsed = validated

    await addReview({
      product_id:  productId,
      author_name: parsed.data.author_name.trim(),
      rating:      parsed.data.rating,
      comment:     parsed.data.comment.trim(),
      phone:       parsed.data.phone?.trim() || null,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    return logAndReturnError('[POST /api/reviews/[productId]]', err, 'Erreur serveur')
  }
}
