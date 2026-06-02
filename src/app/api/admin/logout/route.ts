import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/auth/auditLog'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  await writeAuditLog({ action: 'admin_logout', ip, userAgent: ua, result: 'success' })
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('casbah_admin_token')
  return res
}
