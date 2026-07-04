import { createClient } from '@supabase/supabase-js'

/**
 * Returns a Supabase client that uses the service_role key.
 * This bypasses Row Level Security entirely — use ONLY in server-side
 * API routes and server actions, never in the browser or client components.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (never expose to the client)
 */
function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!rawKey) {
    console.error('[createAdminClient] SUPABASE_SERVICE_ROLE_KEY missing. All env keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('SERVICE')).join(', '))
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  const serviceKey = stripQuotes(rawKey)
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY was empty after stripping quotes (raw: ' + JSON.stringify(rawKey) + ')')

  return createClient(stripQuotes(url), serviceKey, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
