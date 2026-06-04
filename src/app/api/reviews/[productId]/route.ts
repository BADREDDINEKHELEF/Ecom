import { NextRequest, NextResponse } from 'next/server'
import { getReviews, addReview } from '@/lib/supabase/queries'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

interface Params { params: Promise<{ productId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { productId } = await params
    const reviews = await getReviews(productId)
    return NextResponse.json(reviews)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const ip = getClientIp(req)
  const rl = checkPublicRateLimit(ip, 'reviews_post')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans une minute.' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  try {
    const { productId } = await params
    const body = await req.json()
    const { author_name, rating, comment, phone } = body

    if (!author_name || typeof author_name !== 'string' || author_name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (author_name.length > 100) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 })
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 })
    }
    if (comment.length > 1000) {
      return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 })
    }
    if (phone && (typeof phone !== 'string' || phone.length > 20)) {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }

    await addReview({
      product_id: productId,
      author_name: author_name.trim(),
      rating,
      comment: comment.trim(),
      phone: phone?.trim() || null,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
