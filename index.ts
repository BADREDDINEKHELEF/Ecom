import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Daily cleanup function initialized')

Deno.serve(async (req) => {
  // This is an example of a POST request with JSON payload.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ensure the request is from the Supabase cron scheduler
    const authHeader = req.headers.get('Authorization')!
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_CRON_SECRET')}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('Running daily database cleanup...')

    const { error: tokensErr } = await supabaseAdmin.rpc('cleanup_expired_revoked_tokens')
    if (tokensErr) console.error('Error cleaning expired tokens:', tokensErr.message)
    else console.log('Expired tokens cleaned successfully.')

    const { error: sessionsErr } = await supabaseAdmin.rpc('cleanup_old_admin_sessions')
    if (sessionsErr) console.error('Error cleaning old sessions:', sessionsErr.message)
    else console.log('Old sessions cleaned successfully.')

    return new Response(JSON.stringify({ message: 'Cleanup complete' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500, headers: corsHeaders })
  }
})