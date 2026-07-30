import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { translateText } from '@/lib/ai/gemini'
import { logger } from '@/lib/logger'

const RequestSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLang: z.enum(['fr', 'ar', 'en']),
})

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    // Rate limit translation requests
    const rl = await checkSellerRateLimit(ip, 'ai_translate', 20, 60)
    if (!rl.allowed) {
      return copyCookies(response, NextResponse.json(
        { error: 'Trop de requêtes. Veuillez patienter une minute.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      ))
    }

    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }))
    }

    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return copyCookies(response, NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 }))
    }

    const { text, targetLang } = parsed.data

    const resultText = await translateText(text, targetLang)

    return copyCookies(response, NextResponse.json({ translation: resultText }))
  } catch (err) {
    logger.error('[POST /api/seller/ai/translate]', { error: err instanceof Error ? err.message : String(err) })
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('GEMINI_API_KEY')) {
      return copyCookies(response, NextResponse.json(
        { error: "La clé API Gemini n'est pas configurée sur le serveur. Veuillez configurer la variable d'environnement GEMINI_API_KEY dans votre tableau de bord." },
        { status: 503 }
      ))
    }
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
