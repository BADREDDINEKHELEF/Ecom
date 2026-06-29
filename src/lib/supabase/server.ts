import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

/**
 * Creates an SSR-capable Supabase client for use in Route Handlers.
 * Reads the Supabase auth session from the incoming request's cookies,
 * enabling supabase.auth.getUser() to work correctly on the server.
 */
function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

export function createRouteClient(req: NextRequest) {
  return createServerClient(
    stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''),
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
}
