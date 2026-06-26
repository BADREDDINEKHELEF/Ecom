import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { generateProductDescription } from '@/lib/ai/gemini'
import { logger } from '@/lib/logger'

const RequestSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  nicheId: z.string().min(1).max(50),
  features: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // Rate limit AI calls specifically to avoid API key abuse
    const rl = await checkSellerRateLimit(ip, 'ai_generate_desc', 10, 60)
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

    // Parse request body
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 })
    }

    const { name, category, nicheId, features } = parsed.data

    const result = await generateProductDescription({
      name,
      category,
      nicheId,
      features,
    })

    return NextResponse.json(result)
  } catch (err) {
    logger.error('[POST /api/seller/ai/generate-description]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
