import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const redirectTo = `${origin}/seller/reset-password`

    const supabase = createAdminClient()

    // Generate a Supabase recovery link without sending an email
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (error) {
      // Don't reveal whether the email exists — always return success
      logger.warn('[forgot-password] generateLink failed', { error: error.message })
      return NextResponse.json({ success: true })
    }

    const resetLink = data?.properties?.action_link
    if (resetLink) {
      await sendPasswordResetEmail({ to: email, resetLink })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[POST /api/seller/forgot-password]', { error: err instanceof Error ? err.message : String(err) })
    // Always return success to avoid leaking info about which emails exist
    return NextResponse.json({ success: true })
  }
}
