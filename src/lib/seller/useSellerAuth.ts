'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getVendorByUserId } from '@/lib/supabase/queries'
import type { Vendor } from '@/lib/supabase/queries'

export function useSellerAuth() {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/seller/login'); return }
      const v = await getVendorByUserId(user.id)
      if (!v) { router.push('/seller/login'); return }
      if (!v.is_approved) { router.push('/seller/pending'); return }
      setVendor(v)
      setLoading(false)
    })
  }, [router])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/seller/login')
  }

  return { vendor, loading, signOut }
}
