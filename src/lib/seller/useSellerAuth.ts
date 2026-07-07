'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries-server'
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

        const v = await getVendorByUserId(user.id)

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
