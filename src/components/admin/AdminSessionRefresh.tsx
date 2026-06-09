'use client'

import { useEffect } from 'react'

// Silently refreshes the admin JWT every 7 hours so a full workday session
// never expires mid-task. The server validates the existing token before issuing
// a new one, so this cannot be used to escalate from an expired session.
const REFRESH_INTERVAL_MS = 7 * 60 * 60 * 1000  // 7h (token expires at 8h)

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
