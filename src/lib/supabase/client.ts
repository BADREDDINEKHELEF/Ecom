import { createBrowserClient } from '@supabase/ssr'

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

export function createClient() {
  return createBrowserClient(
    stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '')
  )
}
