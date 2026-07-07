'use client'

import { useEffect } from 'react'

// Silently refreshes the admin JWT at 80% of its 2-hour lifetime. The server
// validates the existing token before issuing a new one, so this cannot be used
// to escalate from an expired session.
const ADMIN_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000
const REFRESH_INTERVAL_MS = Math.floor(ADMIN_TOKEN_MAX_AGE_MS * 0.8)

export default function AdminSessionRefresh() {
  useEffect(() => {
    const refresh = () => {
      fetch('/api/admin/refresh', { method: 'POST', credentials: 'same-origin' })
        .catch(() => { /* silent — user will be redirected on next request if expired */ })
    }

    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return null
}
