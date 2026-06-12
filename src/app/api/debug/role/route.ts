import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Temporary diagnostic — remove after confirming service_role key is correct
export async function GET() {
  try {
    const admin = createAdminClient()
    // auth.jwt() returns the JWT claims of the current client
    const { data, error } = await admin.rpc('get_current_role')
    if (error) {
      // Fallback: try a write that only service_role can do
      const { error: writeErr } = await admin
        .from('vendors')
        .select('id')
        .limit(1)
      return NextResponse.json({
        selectError: writeErr?.message ?? null,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) + '...',
        anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...',
        keysMatch: process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      })
    }
    return NextResponse.json({ role: data })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
