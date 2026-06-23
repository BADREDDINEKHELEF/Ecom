import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { timingSafeEqual } from 'crypto'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Daily cleanup function initialized')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin')
    const allowedOrigins = (Deno.env.get('ALLOWED_CRON_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }
    if (origin && allowedOrigins.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin
    }
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Ensure the request is from the Supabase cron scheduler
    const authHeader = req.headers.get('Authorization')!
    const provided = authHeader.slice(7)
    const expected = Deno.env.get('SUPABASE_CRON_SECRET') ?? ''
    const valid = expected.length > 0
      && provided.length === expected.length
      && timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
    if (!valid) {
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

    const origin = req.headers.get('origin')
    const allowedOrigins = (Deno.env.get('ALLOWED_CRON_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const successCorsHeaders: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (origin && allowedOrigins.includes(origin)) {
      successCorsHeaders['Access-Control-Allow-Origin'] = origin
    }
    return new Response(JSON.stringify({ message: 'Cleanup complete' }), { headers: successCorsHeaders })
  } catch (err) {
    const errorOrigin = req.headers.get('origin')
    const errorAllowedOrigins = (Deno.env.get('ALLOWED_CRON_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const errorCorsHeaders = { ...corsHeaders }
    if (errorOrigin && errorAllowedOrigins.includes(errorOrigin)) {
      errorCorsHeaders['Access-Control-Allow-Origin'] = errorOrigin
    }
    return new Response(String(err?.message ?? err), { status: 500, headers: errorCorsHeaders })
  }
})