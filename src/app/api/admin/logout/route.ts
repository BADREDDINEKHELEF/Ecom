import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { revokeAdminToken } from '@/lib/auth/adminAuth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  const ua = req.headers.get('user-agent') ?? 'unknown'

  // Revoke the JWT so it cannot be reused even before its 8h natural expiry
  const token = req.cookies.get('casbah_admin_token')?.value
  if (token) await revokeAdminToken(token)

  await writeAuditLog({ action: 'admin_logout', ip, userAgent: ua, result: 'success' })
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('casbah_admin_token')
  return res
}
