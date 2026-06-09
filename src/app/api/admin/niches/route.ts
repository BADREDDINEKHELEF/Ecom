import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertNiche, deleteNiche } from '@/lib/supabase/niches'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

function isAdminAuthed(req: NextRequest): boolean {
  const token = req.cookies.get('admin_token')?.value
  return token === process.env.ADMIN_SECRET
}

const NicheSchema = z.object({
  id:          z.string().min(1).max(50),
  name:        z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  emoji:       z.string().max(10).default('🛒'),
  gradient:    z.string().max(200).default('from-slate-900 via-slate-800 to-zinc-800'),
  accentColor: z.string().max(100).default('bg-indigo-500'),
  textAccent:  z.string().max(100).default('text-indigo-400'),
  banner:      z.string().max(500).default(''),
  categories:  z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('niches').select('*').order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ niches: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/admin/niches]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = NicheSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  try {
    await upsertNiche(parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[POST /api/admin/niches]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await deleteNiche(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[DELETE /api/admin/niches]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
