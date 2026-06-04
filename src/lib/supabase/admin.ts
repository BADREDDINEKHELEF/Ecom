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
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url)        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  return createClient(url, serviceKey, {
    auth: {
      persistSession:   false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
