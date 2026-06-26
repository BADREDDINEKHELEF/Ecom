import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { generateMarketingCopy } from '@/lib/ai/gemini'
import { logger } from '@/lib/logger'

const RequestSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // Rate limit marketing generator calls
    const rl = await checkSellerRateLimit(ip, 'ai_marketing', 10, 60)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter une minute.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 })
    }

    const { name, category, description } = parsed.data

    const result = await generateMarketingCopy({
      name,
      category,
      description,
    })

    return NextResponse.json(result)
  } catch (err) {
    logger.error('[POST /api/seller/ai/marketing-copy]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
