import { type NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from './jwt'

/** Reads and verifies the admin JWT cookie. Returns null if valid, or a 401 response if not. */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyAdminToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
