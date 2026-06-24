import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const Schema = z.object({
  email: z.email(),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'newsletter')
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    const supabase = createAdminClient()
    await supabase
      .from('newsletter_subscribers')
      .upsert({ email: parsed.data.email, subscribed_at: new Date().toISOString() }, { onConflict: 'email' })
    return NextResponse.json({ ok: true })
  } catch {
    // Table may not exist yet — don't surface error to user
    return NextResponse.json({ ok: true })
  }
}
