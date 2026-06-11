import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { revalidateTag } from 'next/cache'
import { logger } from '@/lib/logger'

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { text, active, color } = await req.json().catch(() => ({}))

    const update: Record<string, unknown> = {}
    if (typeof text   === 'string')  update.announcement_text   = text.slice(0, 500)
    if (typeof active === 'boolean') update.announcement_active = active
    if (typeof color  === 'string' && ['amber', 'green', 'red', 'blue', 'indigo'].includes(color)) {
      update.announcement_color = color
    }

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
