import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function isSecureEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || !!process.env.VERCEL
}

const supabaseCookieOptions: CookieOptions = {
  secure: isSecureEnvironment(),
  sameSite: 'lax',
  path: '/',
}

/**
 * Creates an SSR-capable Supabase client for use in Route Handlers.
 * Reads the Supabase auth session from the incoming request's cookies,
 * enabling supabase.auth.getUser() to work correctly on the server.
 *
 * IMPORTANT: Auth operations may refresh the session and produce new cookies.
 * To avoid losing those cookies, pass the outgoing `NextResponse` you intend
 * to return as the second argument:
 *
 *   const response = NextResponse.json({ ok: true })
 *   const supabase = createRouteClient(req, response)
 *   const { data: { user } } = await supabase.auth.getUser()
 *   return response
 *
 * The second argument is optional for backward compatibility, but callers that
 * omit it must handle cookie propagation themselves.
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

export function createRouteClient(req: NextRequest, response?: NextResponse) {
  const responseToUse = response ?? NextResponse.next()

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseToUse.cookies.set(name, value, options as CookieOptions)
          })
        },
      },
    }
  )
}

/**
 * Copies all cookies from a source response to a target response.
 * Use this when you build a fresh NextResponse.json after auth so that
 * any session cookies refreshed by createRouteClient(req, sourceResponse)
 * are preserved on the response actually returned to the client.
 */
export function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie)
  })
  return target
}

/**
 * Creates an SSR-capable Supabase client for use in Server Actions.
 * Reads the Supabase auth session from the request cookies and writes
 * updated cookies back via the Next.js `cookies()` API.
 */
export async function createServerActionClient() {
  const cookieStore = await cookies()
  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookieOptions: supabaseCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as CookieOptions)
          })
        },
      },
    }
  )
}
