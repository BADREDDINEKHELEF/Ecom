import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT SET'
    const keyMasked = serviceKey !== 'NOT SET' 
      ? `${serviceKey.slice(0, 10)}...${serviceKey.slice(-10)}` 
      : 'NOT SET'

    const supabase = createAdminClient()
    
    // Attempt a test insert
    const testEmail = 'test-vercel-write@example.com'
    // Delete any old record first
    await supabase.from('password_reset_otps').delete().eq('phone', testEmail)
    
    const { data, error } = await supabase
      .from('password_reset_otps')
      .insert({
        phone: testEmail,
        otp: '999999',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .select()

    // Clean up
    await supabase.from('password_reset_otps').delete().eq('phone', testEmail)

    if (error) {
      return NextResponse.json({
        success: false,
        url,
        keyMasked,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    return NextResponse.json({
      success: true,
      url,
      keyMasked,
      message: 'Database query succeeded!',
      data
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
