import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllVendors } from '@/lib/supabase/vendors'

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return false
  return (await verifyAdminToken(token)) !== null
}

// GET /api/admin/vendors?filter=pending|approved|all&page=0
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const page   = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const result = await getAllVendors(page, 100)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/vendors — approve or decline a vendor store
// Body: { id: string, action: 'approve' | 'decline', admin_note?: string }
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({})) as {
      id?:         string
      action?:     'approve' | 'decline'
      admin_note?: string
    }

    if (!body.id)     return NextResponse.json({ error: 'id is required' },     { status: 400 })
    if (!body.action) return NextResponse.json({ error: 'action is required' }, { status: 400 })
    if (!['approve', 'decline'].includes(body.action)) {
      return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 })
    }

    const admin = createAdminClient()

    const updates: Record<string, unknown> =
      body.action === 'approve'
        ? { is_approved: true,  is_active: true,  admin_note: null }
        : { is_approved: false, is_active: false, admin_note: body.admin_note ?? null }

    const { error } = await admin.from('vendors').update(updates).eq('id', body.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
