import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/auth/jwt'
import {
  getAllVendorSubscriptions,
  updateVendorSubscription,
} from '@/lib/supabase/vendors'

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return false
  return (await verifyAdminToken(token)) !== null
}

// GET /api/admin/subscriptions?status=trial&page=0
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? undefined
    const page = Math.max(0, parseInt(searchParams.get('page') ?? '0'))
    const result = await getAllVendorSubscriptions({ status, page, pageSize: 50 })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/subscriptions — approve / reject / update a subscription
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({})) as {
      id?: string
      status?: string
      admin_note?: string
      expires_at?: string
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const validStatuses = ['trial', 'active', 'grace_period', 'expired', 'cancelled']
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    await updateVendorSubscription(body.id, {
      ...(body.status    && { status: body.status as 'trial' | 'active' | 'grace_period' | 'expired' | 'cancelled' }),
      ...(body.admin_note !== undefined && { admin_note: body.admin_note }),
      ...(body.expires_at && { expires_at: body.expires_at }),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
