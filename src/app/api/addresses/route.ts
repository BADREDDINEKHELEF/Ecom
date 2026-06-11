import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const AddressSchema = z.object({
  label:     z.string().min(1).max(50).default('Domicile'),
  full_name: z.string().min(2).max(200),
  phone:     z.string().min(8).max(20),
  address:   z.string().min(5).max(500),
  city:      z.string().min(1).max(200),
  wilaya:    z.string().min(1).max(100),
  is_default: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('saved_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    logger.error('[GET /api/addresses]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = AddressSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    const admin = createAdminClient()

    if (parsed.data.is_default) {
      await admin.from('saved_addresses').update({ is_default: false }).eq('user_id', user.id)
    }

    const { data, error } = await admin
      .from('saved_addresses')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/addresses]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
