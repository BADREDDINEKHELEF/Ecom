import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'all'
  const supabase = createAdminClient()
  let query = supabase
    .from('abandoned_checkouts')
    .select('*')
    .eq('status', 'abandoned')
    .order('cart_total', { ascending: false })
    .limit(100)
  if (period === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString())
  } else if (period === 'week') {
    const start = new Date(); start.setDate(start.getDate() - 7)
    query = query.gte('created_at', start.toISOString())
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
  const supabase = createAdminClient()
  const { error } = await supabase.from('abandoned_checkouts').update({
    status,
    ...(status === 'recovered' ? { recovered_at: new Date().toISOString() } : {}),
  }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
