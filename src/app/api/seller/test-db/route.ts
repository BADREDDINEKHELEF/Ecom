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
    
    // Attempt a test query
    const { data, error } = await supabase
      .from('password_reset_otps')
      .select('*')
      .limit(1)

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
