import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { revalidateTag } from 'next/cache'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const PatchAnnouncementSchema = z.object({
  text:   z.string().max(500).optional(),
  active: z.boolean().optional(),
  color:  z.enum(['amber', 'green', 'red', 'blue', 'indigo']).optional(),
})

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'settings_write', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchAnnouncementSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (parsed.data.text   !== undefined) update.announcement_text   = parsed.data.text
    if (parsed.data.active !== undefined) update.announcement_active = parsed.data.active
    if (parsed.data.color  !== undefined) update.announcement_color  = parsed.data.color

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('store_settings').update(update).eq('id', 1)
    if (error) throw error

    revalidateTag('store-settings')
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/settings/announcement]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
