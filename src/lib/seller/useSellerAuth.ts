'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vendor } from '@/lib/supabase/vendors'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface UseSellerAuthState {
  vendor: Vendor | null
  loading: boolean
  error: string | null
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Resolve the vendor for the current authenticated user.
 * Priority: owner (vendors.user_id) -> team member (vendor_members.user_id).
 * Mirrors the logic in @/lib/auth/vendorAuth so the client-side guard stays
 * consistent with the API-side guard.
 */
async function resolveVendorForUser(userId: string): Promise<{ vendor: Vendor | null; error: Error | null }> {
  const supabase = createClient()

  // 1. Owner lookup
  const { data: ownedVendor, error: ownerErr } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (ownerErr) return { vendor: null, error: new Error(ownerErr.message) }
  if (ownedVendor) return { vendor: ownedVendor as unknown as Vendor, error: null }

  // 2. Team member lookup (two-step to avoid Supabase join type errors)
  const { data: membership, error: memberErr } = await supabase
    .from('vendor_members')
    .select('vendor_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (memberErr) return { vendor: null, error: new Error(memberErr.message) }
  if (!membership) return { vendor: null, error: null }

  const { data: memberVendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', membership.vendor_id)
    .maybeSingle()

  if (vendorErr) return { vendor: null, error: new Error(vendorErr.message) }
  return { vendor: memberVendor as unknown as Vendor | null, error: null }
}

export function useSellerAuth() {
  const [state, setState] = useState<UseSellerAuthState>({ vendor: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const router = useRouter()

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    setAttempt((a) => a + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      setState((s) => ({ ...s, loading: true, error: null }))

      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()

        if (cancelled) return

        if (authErr || !user) {
          router.push('/seller/login')
          if (!cancelled) setState({ vendor: null, loading: false, error: null })
          return
        }

        const { vendor: v, error: resolveErr } = await resolveVendorForUser(user.id)

        if (resolveErr) throw resolveErr

        if (cancelled) return

        if (!v) {
          router.push('/seller/login')
          setState({ vendor: null, loading: false, error: null })
          return
        }
        if (!v.is_active) {
          router.push('/seller/login')
          setState({ vendor: null, loading: false, error: null })
          return
        }
        if (!v.is_approved) {
          router.push('/seller/pending')
          setState({ vendor: null, loading: false, error: null })
          return
        }

        setState({ vendor: v, loading: false, error: null })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Authentication check failed'
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS)
          if (!cancelled) retry()
          return
        }
        setState({ vendor: null, loading: false, error: message })
      }
    }

    check()

    return () => { cancelled = true }
  }, [router, attempt, retry])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setState({ vendor: null, loading: false, error: null })
    router.push('/seller/login')
  }

  return { vendor: state.vendor, loading: state.loading, error: state.error, retry, signOut }
}
