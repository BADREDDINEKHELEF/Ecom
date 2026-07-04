import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Creates an SSR-capable Supabase client for use in Route Handlers.
 * Reads the Supabase auth session from the incoming request's cookies,
 * enabling supabase.auth.getUser() to work correctly on the server.
 */
function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

function getSupabaseUrl(): string {
  return stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
}

function getSupabaseAnonKey(): string {
  return stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
}

export function createRouteClient(req: NextRequest) {
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }
  )
}

/**
 * Creates an SSR-capable Supabase client for use in Server Actions.
 * Reads the Supabase auth session from the request cookies.
 */
export async function createServerActionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}
